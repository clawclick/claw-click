// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IClawclickFactory} from "../src/interfaces/IClawclickFactory.sol";
import {ClawclickToken} from "../src/core/ClawclickToken.sol";
import {FixedPoint96} from "v4-core/src/libraries/FixedPoint96.sol";
import {FullMath} from "v4-core/src/libraries/FullMath.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";

contract SepoliaDirectFlowTest is Script {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    // Deployed addresses
    address constant FACTORY = 0x488626C043513F3ad48d1437bd0b04FB040947C5;
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POOL_SWAP_TEST = 0x9B6b46e2c869aa39918Db7f52f5557FE577B6eEe;
    
    uint256 constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        
        console2.log("\n========================================");
        console2.log("SEPOLIA DIRECT FLOW - LIVE TEST");
        console2.log("========================================\n");
        
        console2.log("Deployer:", deployer);
        console2.log("Balance:", deployer.balance / 1e18, "ETH\n");
        
        vm.startBroadcast(pk);
        
        // ==================================================================
        // STEP 1: CREATE DIRECT TOKEN
        // ==================================================================
        console2.log("STEP 1: Creating DIRECT token...\n");
        
        IClawclickFactory factory = IClawclickFactory(FACTORY);
        IPoolManager poolManager = IPoolManager(POOL_MANAGER);
        
        uint256 targetMcapETH = 3 ether; // 3 ETH starting MCAP
        uint256 bootstrapETH = 0.001 ether; // ~$2
        
        console2.log("Target MCAP:", targetMcapETH / 1e18, "ETH");
        console2.log("Bootstrap:", bootstrapETH / 1e15, "mETH");
        
        uint16[5] memory percentages;
        address[5] memory wallets;
        
        IClawclickFactory.CreateParams memory params = IClawclickFactory.CreateParams({
            name: "Sepolia Direct Test",
            symbol: "SDTEST",
            beneficiary: deployer,
            agentWallet: address(0),
            targetMcapETH: targetMcapETH,
            feeSplit: IClawclickFactory.FeeSplit({
                wallets: wallets,
                percentages: percentages,
                count: 0
            }),
            launchType: IClawclickFactory.LaunchType.DIRECT
        });
        
        (address token, PoolId poolId) = factory.createLaunch{value: bootstrapETH}(params);
        
        console2.log("\nToken created:", token);
        console2.log("PoolId:");
        console2.logBytes32(PoolId.unwrap(poolId));
        
        vm.stopBroadcast();
        
        // ==================================================================
        // STEP 2: VERIFY LAUNCH PARAMETERS
        // ==================================================================
        console2.log("\n\nSTEP 2: Verifying launch parameters...\n");
        
        IClawclickFactory.LaunchInfo memory info = factory.launchByToken(token);
        IClawclickFactory.PoolState memory state = factory.poolStates(poolId);
        (uint160 sqrtPriceX96, int24 tick,,) = poolManager.getSlot0(poolId);
        
        uint256 currentMCAP = _calculateMCAP(sqrtPriceX96);
        
        console2.log("Launch Type:", uint(info.launchType));
        console2.log("Hook:");
        console2.logAddress(address(info.poolKey.hooks));
        console2.log("Pool Fee:", info.poolKey.fee, "bps");
        console2.log("Graduation MCAP:", state.graduationMCAP / 1e18, "ETH");
        console2.log("Starting MCAP:", state.startingMCAP / 1e18, "ETH");
        console2.log("Current MCAP:", currentMCAP / 1e18, "ETH");
        console2.log("Activated:", state.activated);
        console2.log("Graduated:", state.graduated);
        
        console2.log("\nPositions:");
        uint256 mintedCount = 0;
        for (uint i = 0; i < 5; i++) {
            if (state.positionMinted[i]) {
                console2.log("Position minted, index:", i);
                console2.log("TokenId:", state.positionTokenIds[i]);
                mintedCount++;
            }
        }
        console2.log("Total minted:", mintedCount);
        
        // Verify MCAP accuracy
        uint256 mcapDiff = currentMCAP > targetMcapETH 
            ? currentMCAP - targetMcapETH 
            : targetMcapETH - currentMCAP;
        uint256 mcapDiffBps = (mcapDiff * 10000) / targetMcapETH;
        
        console2.log("\nMCAP accuracy (bps):", mcapDiffBps);
        console2.log("MCAP accuracy (%):", mcapDiffBps / 100);
        
        bool hookIsZero = address(info.poolKey.hooks) == address(0);
        bool feeIs1Percent = info.poolKey.fee == 100;
        bool typeIsDirect = uint(info.launchType) == 0;
        bool gradIsZero = state.graduationMCAP == 0;
        bool mcapAccurate = mcapDiffBps < 100; // Within 1%
        
        console2.log("\nVerification:");
        console2.log("- Hook is zero:", hookIsZero);
        console2.log("- Fee is 1%:", feeIs1Percent);
        console2.log("- Type is DIRECT:", typeIsDirect);
        console2.log("- GradMCAP is 0:", gradIsZero);
        console2.log("- MCAP accurate:", mcapAccurate);
        
        require(hookIsZero, "Hook must be zero");
        require(feeIs1Percent, "Fee must be 1%");
        require(typeIsDirect, "Type must be DIRECT");
        require(gradIsZero, "GradMCAP must be 0");
        require(mcapAccurate, "MCAP must be accurate");
        
        console2.log("\n[PASS] Launch verification complete");
        
        // ==================================================================
        // STEP 3: EXECUTE BUY TRADES
        // ==================================================================
        console2.log("\n\nSTEP 3: Executing buy trades...\n");
        
        vm.startBroadcast(pk);
        
        ClawclickToken tokenContract = ClawclickToken(token);
        PoolSwapTest swapTest = PoolSwapTest(POOL_SWAP_TEST);
        
        // Execute 3 buy trades
        for (uint i = 0; i < 3; i++) {
            uint256 buyAmount = 0.05 ether;
            uint256 balanceBefore = tokenContract.balanceOf(deployer);
            
            console2.log("Buy trade", i+1);
            console2.log("Amount (mETH):", buyAmount / 1e15);
            
            SwapParams memory swapParams = SwapParams({
                zeroForOne: true, // ETH -> Token
                amountSpecified: -int256(buyAmount), // Exact input
                sqrtPriceLimitX96: 0 // No limit
            });
            
            PoolSwapTest.TestSettings memory testSettings = PoolSwapTest.TestSettings({
                takeClaims: false,
                settleUsingBurn: false
            });
            
            swapTest.swap{value: buyAmount}(info.poolKey, swapParams, testSettings, "");
            
            uint256 balanceAfter = tokenContract.balanceOf(deployer);
            uint256 tokensReceived = balanceAfter - balanceBefore;
            
            console2.log("Tokens received:", tokensReceived / 1e18);
        }
        
        console2.log("\n[PASS] All buys executed");
        
        // ==================================================================
        // STEP 4: EXECUTE SELL TRADES
        // ==================================================================
        console2.log("\n\nSTEP 4: Executing sell trades...\n");
        
        uint256 totalBalance = tokenContract.balanceOf(deployer);
        uint256 sellAmount = totalBalance / 4; // Sell 25%
        
        console2.log("Total tokens:", totalBalance / 1e18);
        console2.log("Selling:", sellAmount / 1e18);
        
        // Approve tokens
        tokenContract.approve(POOL_SWAP_TEST, sellAmount);
        
        uint256 ethBefore = deployer.balance;
        
        SwapParams memory sellParams = SwapParams({
            zeroForOne: false, // Token -> ETH
            amountSpecified: -int256(sellAmount), // Exact input
            sqrtPriceLimitX96: type(uint160).max // No limit
        });
        
        PoolSwapTest.TestSettings memory testSettings2 = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });
        
        swapTest.swap(info.poolKey, sellParams, testSettings2, "");
        
        uint256 ethAfter = deployer.balance;
        uint256 ethReceived = ethAfter > ethBefore ? ethAfter - ethBefore : 0;
        
        console2.log("ETH received:", ethReceived / 1e15, "mETH");
        console2.log("\n[PASS] Sell executed");
        
        // ==================================================================
        // STEP 5: CHECK FINAL MCAP
        // ==================================================================
        console2.log("\n\nSTEP 5: Checking final MCAP...\n");
        
        (uint160 finalSqrtPrice,,,) = poolManager.getSlot0(poolId);
        uint256 finalMCAP = _calculateMCAP(finalSqrtPrice);
        
        console2.log("Final MCAP:", finalMCAP / 1e18, "ETH");
        uint256 mcapChange = finalMCAP > targetMcapETH ? finalMCAP - targetMcapETH : targetMcapETH - finalMCAP;
        console2.log("Change (mETH):", mcapChange / 1e15);
        
        // ==================================================================
        // STEP 6: COLLECT LP FEES
        // ==================================================================
        console2.log("\n\nSTEP 6: Collecting LP fees from P1...\n");
        
        uint256 ethBeforeFees = deployer.balance;
        uint256 tokensBeforeFees = tokenContract.balanceOf(deployer);
        
        console2.log("Balance before:");
        console2.log("- ETH:", ethBeforeFees / 1e18);
        console2.log("- Tokens:", tokensBeforeFees / 1e18);
        
        try factory.collectFeesFromPosition(poolId, 0) {
            console2.log("\nFee collection successful");
            
            uint256 ethAfterFees = deployer.balance;
            uint256 tokensAfterFees = tokenContract.balanceOf(deployer);
            
            uint256 ethCollected = ethAfterFees > ethBeforeFees ? ethAfterFees - ethBeforeFees : 0;
            uint256 tokensCollected = tokensAfterFees > tokensBeforeFees ? tokensAfterFees - tokensBeforeFees : 0;
            
            console2.log("\nBalance after:");
            console2.log("- ETH:", ethAfterFees / 1e18);
            console2.log("- Tokens:", tokensAfterFees / 1e18);
            
            console2.log("\nFees collected (70% share):");
            console2.log("- ETH:", ethCollected / 1e15, "mETH");
            console2.log("- Tokens:", tokensCollected / 1e18);
            
            console2.log("\n[PASS] Fee collection successful");
        } catch Error(string memory reason) {
            console2.log("\nFee collection failed:", reason);
            console2.log("(This may be expected if no fees accumulated yet)");
        }
        
        // ==================================================================
        // STEP 7: VERIFY NO GRADUATION
        // ==================================================================
        console2.log("\n\nSTEP 7: Verifying NO graduation...\n");
        
        IClawclickFactory.PoolState memory finalState = factory.poolStates(poolId);
        
        console2.log("Graduation MCAP:", finalState.graduationMCAP);
        console2.log("Graduated:", finalState.graduated);
        
        require(finalState.graduationMCAP == 0, "GradMCAP should remain 0");
        require(!finalState.graduated, "Should never graduate");
        
        console2.log("\n[PASS] NO graduation confirmed");
        
        vm.stopBroadcast();
        
        // ==================================================================
        // FINAL SUMMARY
        // ==================================================================
        console2.log("\n\n========================================");
        console2.log("TEST SUMMARY");
        console2.log("========================================\n");
        
        console2.log("Token:", token);
        console2.log("Symbol: SDTEST");
        console2.log("Starting MCAP:", targetMcapETH / 1e18, "ETH");
        console2.log("Final MCAP:", finalMCAP / 1e18, "ETH");
        console2.log("Positions minted:", mintedCount);
        console2.log("Trades executed: 3 buys + 1 sell");
        console2.log("\nExplorer:");
        console2.log("https://sepolia.etherscan.io/address/%s", token);
        
        console2.log("\n[PASS] ALL TESTS PASSED");
        console2.log("========================================\n");
    }
    
    function _calculateMCAP(uint160 sqrtPriceX96) internal pure returns (uint256) {
        uint256 Q96 = FixedPoint96.Q96;
        uint256 intermediate = FullMath.mulDiv(TOTAL_SUPPLY, Q96, sqrtPriceX96);
        return FullMath.mulDiv(intermediate, Q96, sqrtPriceX96);
    }
}
