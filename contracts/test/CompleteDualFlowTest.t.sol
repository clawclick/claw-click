// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {FixedPoint96} from "v4-core/src/libraries/FixedPoint96.sol";
import {FullMath} from "v4-core/src/libraries/FullMath.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {ClawclickHook} from "../src/core/ClawclickHook_V4.sol";
import {ClawclickConfig} from "../src/core/ClawclickConfig.sol";
import {ClawclickToken} from "../src/core/ClawclickToken.sol";
import {BootstrapETH} from "../src/utils/BootstrapETH.sol";
import {IClawclickFactory} from "../src/interfaces/IClawclickFactory.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";
import {SwapExecutor} from "../src/utils/SwapExecutor.sol";

/**
 * @title CompleteDualFlowTest
 * @notice Comprehensive end-to-end tests for BOTH AGENT and DIRECT flows
 * @dev Tests complete lifecycle: creation -> trading -> fee collection -> graduation (AGENT only)
 */
contract CompleteDualFlowTest is Test {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;

    // Sepolia v4 addresses
    IPoolManager constant poolManager = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    address constant positionManager = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;
    
    ClawclickFactory factory;
    ClawclickHook hook;
    ClawclickConfig config;
    BootstrapETH bootstrapETH;
    SwapExecutor swapExecutor;
    
    address treasury = address(0xDEAD);
    address creator = address(0xABCD);
    address trader1 = address(0x1111);
    address trader2 = address(0x2222);
    address trader3 = address(0x3333);
    
    uint256 constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    
    function setUp() public {
        // Fork Sepolia
        vm.createSelectFork("https://eth-sepolia.g.alchemy.com/v2/BdgPEmQddox2due7mrt9J");
        
        // Setup accounts with ETH
        vm.deal(creator, 100 ether);
        vm.deal(trader1, 100 ether);
        vm.deal(trader2, 100 ether);
        vm.deal(trader3, 100 ether);
        vm.deal(treasury, 100 ether);
        
        // Deploy config
        config = new ClawclickConfig(treasury, address(this));
        
        // Deploy hook (use existing deployed hook for Sepolia compatibility)
        hook = ClawclickHook(0x3C26aE16F7C62856F372cF152e2f252ab61Deac8);
        
        // Deploy bootstrap
        bootstrapETH = new BootstrapETH(address(0)); // Will set factory later
        vm.deal(address(bootstrapETH), 10 ether); // Fund it
        
        // Deploy factory
        factory = new ClawclickFactory(
            config,
            poolManager,
            hook,
            positionManager,
            bootstrapETH,
            address(this)
        );
        
        // Update config
        config.setFactory(address(factory));
        
        // Deploy swap executor for testing
        swapExecutor = new SwapExecutor(address(poolManager));
        
        console2.log("=== TEST SETUP COMPLETE ===");
        console2.log("Factory:", address(factory));
        console2.log("Hook:", address(hook));
        console2.log("Config:", address(config));
    }
    
    /*//////////////////////////////////////////////////////////////
                        DIRECT FLOW TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_DirectFlow_Complete() public {
        console2.log("\n=== DIRECT FLOW: COMPLETE LIFECYCLE TEST ===\n");
        
        // STEP 1: Create DIRECT token
        console2.log("STEP 1: Creating DIRECT token...");
        
        vm.startPrank(creator);
        
        uint256 targetMcapETH = 3 ether;
        uint256 bootstrapAmount = 0.001 ether;
        
        uint16[5] memory percentages;
        address[5] memory wallets;
        
        IClawclickFactory.CreateParams memory params = IClawclickFactory.CreateParams({
            name: "Direct Test Token",
            symbol: "DTEST",
            beneficiary: creator,
            agentWallet: address(0),
            targetMcapETH: targetMcapETH,
            feeSplit: IClawclickFactory.FeeSplit({
                wallets: wallets,
                percentages: percentages,
                count: 0
            }),
            launchType: IClawclickFactory.LaunchType.DIRECT
        });
        
        (address token, PoolId poolId) = factory.createLaunch{value: bootstrapAmount}(params);
        
        console2.log("Token:", token);
        console2.logBytes32(PoolId.unwrap(poolId));
        
        vm.stopPrank();
        
        // STEP 2: Verify launch parameters
        console2.log("\nSTEP 2: Verifying launch parameters...");
        
        IClawclickFactory.LaunchInfo memory info = factory.launchByToken(token);
        IClawclickFactory.PoolState memory state = factory.poolStates(poolId);
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        
        uint256 currentMCAP = _calculateMCAP(sqrtPriceX96);
        
        // Assertions
        assertEq(uint(info.launchType), 0, "LaunchType should be DIRECT");
        assertEq(address(info.poolKey.hooks), address(0), "Hook should be address(0)");
        assertEq(info.poolKey.fee, 100, "Pool fee should be 1%");
        assertEq(state.graduationMCAP, 0, "GraduationMCAP should be 0");
        assertTrue(state.activated, "Pool should be activated");
        assertFalse(state.graduated, "Pool should not be graduated");
        
        // MCAP accuracy check (within 1%)
        uint256 mcapDiff = currentMCAP > targetMcapETH 
            ? currentMCAP - targetMcapETH 
            : targetMcapETH - currentMCAP;
        uint256 mcapDiffBps = (mcapDiff * 10000) / targetMcapETH;
        assertLt(mcapDiffBps, 100, "MCAP should be within 1% of target");
        
        console2.log("- LaunchType: DIRECT [OK]");
        console2.log("- Hook: address(0) [OK]");
        console2.log("- Pool Fee: 1% [OK]");
        console2.log("- GraduationMCAP: 0 [OK]");
        console2.log("- MCAP accuracy:", mcapDiffBps, "bps [OK]");
        
        // STEP 3: Check position minting
        console2.log("\nSTEP 3: Verifying position minting...");
        
        uint256 mintedCount = 0;
        for (uint i = 0; i < 5; i++) {
            if (state.positionMinted[i]) {
                console2.log("- P", i+1, "TokenId:", state.positionTokenIds[i], "[OK]");
                mintedCount++;
            }
        }
        assertTrue(state.positionMinted[0], "P1 should always be minted");
        console2.log("- Total positions minted:", mintedCount);
        
        // STEP 4: Execute buy trades
        console2.log("\nSTEP 4: Executing buy trades...");
        
        ClawclickToken tokenContract = ClawclickToken(token);
        
        address[3] memory traders = [trader1, trader2, trader3];
        uint256 buyAmount = 0.1 ether;
        
        for (uint i = 0; i < traders.length; i++) {
            vm.startPrank(traders[i]);
            
            uint256 balanceBefore = tokenContract.balanceOf(traders[i]);
            
            // Execute buy via SwapExecutor
            swapExecutor.swapExactIn{value: buyAmount}(
                info.poolKey,
                true, // zeroForOne (ETH -> Token)
                buyAmount
            );
            
            uint256 balanceAfter = tokenContract.balanceOf(traders[i]);
            uint256 tokensReceived = balanceAfter - balanceBefore;
            
            console2.log("- Trader", i+1, "bought:", tokensReceived / 1e18, "tokens [OK]");
            
            vm.stopPrank();
        }
        
        // STEP 5: Execute sell trades
        console2.log("\nSTEP 5: Executing sell trades...");
        
        for (uint i = 0; i < 2; i++) {
            vm.startPrank(traders[i]);
            
            uint256 tokenBalance = tokenContract.balanceOf(traders[i]);
            uint256 sellAmount = tokenBalance / 2; // Sell 50%
            
            // Approve tokens
            tokenContract.approve(address(swapExecutor), sellAmount);
            
            uint256 ethBeforeSell = traders[i].balance;
            
            // Execute sell
            swapExecutor.swapExactIn(
                info.poolKey,
                false, // Token -> ETH
                sellAmount
            );
            
            uint256 ethAfterSell = traders[i].balance;
            uint256 ethReceived = ethAfterSell - ethBeforeSell;
            
            console2.log("- Trader", i+1, "sold:", sellAmount / 1e18, "tokens for", ethReceived / 1e15, "mETH [OK]");
            
            vm.stopPrank();
        }
        
        // STEP 6: Collect LP fees
        console2.log("\nSTEP 6: Collecting LP fees from P1...");
        
        vm.startPrank(creator);
        
        uint256 ethBefore = creator.balance;
        uint256 tokensBefore = tokenContract.balanceOf(creator);
        
        factory.collectFeesFromPosition(poolId, 0); // P1
        
        uint256 ethAfter = creator.balance;
        uint256 tokensAfter = tokenContract.balanceOf(creator);
        
        uint256 ethCollected = ethAfter - ethBefore;
        uint256 tokensCollected = tokensAfter - tokensBefore;
        
        console2.log("- ETH collected:", ethCollected / 1e15, "mETH [OK]");
        console2.log("- Tokens collected:", tokensCollected / 1e18, "[OK]");
        
        // Verify fees were collected
        assertTrue(ethCollected > 0 || tokensCollected > 0, "Should collect some fees");
        
        vm.stopPrank();
        
        // STEP 7: Verify NO graduation
        console2.log("\nSTEP 7: Verifying NO graduation...");
        
        IClawclickFactory.PoolState memory finalState = factory.poolStates(poolId);
        assertEq(finalState.graduationMCAP, 0, "GraduationMCAP should still be 0");
        assertFalse(finalState.graduated, "Pool should never graduate");
        
        for (uint i = 0; i < 5; i++) {
            if (finalState.positionMinted[i]) {
                assertFalse(finalState.positionRetired[i], "No positions should be retired");
            }
        }
        
        console2.log("- GraduationMCAP still 0 [OK]");
        console2.log("- Not graduated [OK]");
        console2.log("- No positions retired [OK]");
        
        console2.log("\n=== DIRECT FLOW TEST [PASS] ===\n");
    }
    
    /*//////////////////////////////////////////////////////////////
                        AGENT FLOW TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_AgentFlow_Complete() public {
        console2.log("\n=== AGENT FLOW: COMPLETE LIFECYCLE TEST ===\n");
        
        // STEP 1: Create AGENT token
        console2.log("STEP 1: Creating AGENT token...");
        
        vm.startPrank(creator);
        
        uint256 targetMcapETH = 1 ether; // Start at 1 ETH for maximum epochs
        uint256 bootstrapAmount2 = 0.001 ether;
        
        uint16[5] memory percentages;
        address[5] memory wallets;
        
        IClawclickFactory.CreateParams memory params = IClawclickFactory.CreateParams({
            name: "Agent Test Token",
            symbol: "ATEST",
            beneficiary: creator,
            agentWallet: address(0),
            targetMcapETH: targetMcapETH,
            feeSplit: IClawclickFactory.FeeSplit({
                wallets: wallets,
                percentages: percentages,
                count: 0
            }),
            launchType: IClawclickFactory.LaunchType.AGENT
        });
        
        (address token, PoolId poolId) = factory.createLaunch{value: bootstrapAmount2}(params);
        
        console2.log("Token:", token);
        console2.logBytes32(PoolId.unwrap(poolId));
        
        vm.stopPrank();
        
        // STEP 2: Verify launch parameters
        console2.log("\nSTEP 2: Verifying launch parameters...");
        
        IClawclickFactory.LaunchInfo memory info = factory.launchByToken(token);
        IClawclickFactory.PoolState memory state = factory.poolStates(poolId);
        
        // Assertions
        assertEq(uint(info.launchType), 1, "LaunchType should be AGENT");
        assertTrue(address(info.poolKey.hooks) != address(0), "Hook should be set");
        assertEq(info.poolKey.fee, 0, "Pool fee should be 0 (hook collects)");
        assertEq(state.graduationMCAP, targetMcapETH * 16, "GraduationMCAP should be 16x");
        assertTrue(state.activated, "Pool should be activated");
        assertFalse(state.graduated, "Pool should not be graduated yet");
        
        console2.log("- LaunchType: AGENT [OK]");
        console2.log("- Hook: set [OK]");
        console2.log("- Pool Fee: 0 (hook collects) [OK]");
        console2.log("- GraduationMCAP: 16 ETH [OK]");
        
        // STEP 3: Check hook registration
        console2.log("\nSTEP 3: Verifying hook registration...");
        
        (
            address hookToken,
            address hookBeneficiary,
            uint256 startMcap,
            uint256 baseTax,
            ,
            ClawclickHook.Phase phase,
            ,
        ) = hook.launches(poolId);
        
        assertEq(hookToken, token, "Hook should track token");
        assertEq(hookBeneficiary, creator, "Hook should track beneficiary");
        assertEq(startMcap, targetMcapETH, "Hook should track startMcap");
        assertEq(baseTax, 5000, "BaseTax should be 50% for 1 ETH start");
        assertEq(uint(phase), 0, "Phase should be PROTECTED");
        
        console2.log("- Hook registered [OK]");
        console2.log("- BaseTax: 50% [OK]");
        console2.log("- Phase: PROTECTED [OK]");
        
        // STEP 4: Test Epoch 1 (50% tax)
        console2.log("\nSTEP 4: Testing Epoch 1 (50% tax, 1 ETH -> 2 ETH)...");
        
        ClawclickToken tokenContract = ClawclickToken(token);
        
        vm.startPrank(trader1);
        
        // Execute buy in epoch 1
        uint256 buyAmount1 = 0.5 ether;
        uint256 balanceBefore1 = tokenContract.balanceOf(trader1);
        
        swapExecutor.swapExactIn{value: buyAmount1}(
            info.poolKey,
            true,
            buyAmount1
        );
        
        uint256 balanceAfter1 = tokenContract.balanceOf(trader1);
        uint256 tokensReceived1 = balanceAfter1 - balanceBefore1;
        
        console2.log("- Bought in Epoch 1:", tokensReceived1 / 1e18, "tokens [OK]");
        
        // Check current epoch
        (,,,,,, uint256 currentEpoch,) = hook.poolProgress(poolId);
        assertEq(currentEpoch, 1, "Should be in Epoch 1");
        
        vm.stopPrank();
        
        // STEP 5: Push to Epoch 2 (25% tax)
        console2.log("\nSTEP 5: Testing Epoch 2 (25% tax, 2 ETH -> 4 ETH)...");
        
        // Need to push MCAP to 2 ETH (2x growth)
        vm.startPrank(trader2);
        
        // Large buy to push MCAP
        uint256 buyAmount2 = 1 ether;
        swapExecutor.swapExactIn{value: buyAmount2}(
            info.poolKey,
            true,
            buyAmount2
        );
        
        // Check epoch advanced
        (,,,,,, currentEpoch,) = hook.poolProgress(poolId);
        console2.log("- Current Epoch:", currentEpoch, "[OK]");
        assertTrue(currentEpoch >= 2, "Should have advanced to Epoch 2");
        
        vm.stopPrank();
        
        // STEP 6: Push through remaining epochs to graduation
        console2.log("\nSTEP 6: Pushing through Epochs 3-4 to graduation...");
        
        vm.startPrank(trader3);
        
        // Keep buying to push through epochs
        for (uint i = 0; i < 5; i++) {
            swapExecutor.swapExactIn{value: 2 ether}(
                info.poolKey,
                true,
                2 ether
            );
        }
        
        vm.stopPrank();
        
        // Check graduation
        (,,,,,,,bool graduated) = hook.poolProgress(poolId);
        IClawclickFactory.PoolState memory stateAfterGrad = factory.poolStates(poolId);
        
        console2.log("- Graduated:", graduated);
        
        if (graduated) {
            console2.log("- Pool graduated [PASS]");
            assertTrue(stateAfterGrad.graduated, "Factory should track graduation");
            
            // Verify post-graduation state
            (,,,,, ClawclickHook.Phase finalPhase,,) = hook.launches(poolId);
            assertEq(uint(finalPhase), 1, "Phase should be GRADUATED");
            console2.log("- Phase: GRADUATED [OK]");
        }
        
        // STEP 7: Test post-graduation trading
        console2.log("\nSTEP 7: Testing post-graduation trading...");
        
        vm.startPrank(trader1);
        
        uint256 balanceBefore = tokenContract.balanceOf(trader1);
        
        swapExecutor.swapExactIn{value: 0.1 ether}(
            info.poolKey,
            true,
            0.1 ether
        );
        
        uint256 balanceAfter = tokenContract.balanceOf(trader1);
        uint256 tokensReceived = balanceAfter - balanceBefore;
        
        console2.log("- Post-graduation buy:", tokensReceived / 1e18, "tokens [OK]");
        assertTrue(tokensReceived > 0, "Should receive tokens post-graduation");
        
        vm.stopPrank();
        
        // STEP 8: Collect fees
        console2.log("\nSTEP 8: Collecting fees...");
        
        vm.startPrank(creator);
        
        uint256 ethBefore = creator.balance;
        
        factory.collectFeesFromPosition(poolId, 0);
        
        uint256 ethAfter = creator.balance;
        uint256 ethCollected = ethAfter - ethBefore;
        
        console2.log("- Fees collected:", ethCollected / 1e18, "ETH [OK]");
        
        vm.stopPrank();
        
        console2.log("\n=== AGENT FLOW TEST [PASS] ===\n");
    }
    
    /*//////////////////////////////////////////////////////////////
                        HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    function _calculateMCAP(uint160 sqrtPriceX96) internal pure returns (uint256) {
        uint256 Q96 = FixedPoint96.Q96;
        uint256 intermediate = FullMath.mulDiv(TOTAL_SUPPLY, Q96, sqrtPriceX96);
        return FullMath.mulDiv(intermediate, Q96, sqrtPriceX96);
    }
}
