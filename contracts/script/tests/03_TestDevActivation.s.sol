// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/core/ClawclickHook_V4.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickToken.sol";
import "../../src/utils/SwapExecutor.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

/**
 * @title 03_TestDevActivation
 * @notice ONLY tests dev activation override path
 * @dev Tests actual swap execution through Universal Router on Sepolia
 */
contract TestDevActivation is Script {
    
    ClawclickConfig public config;
    ClawclickHook public hook;
    ClawclickFactory public factory;
    SwapExecutor public swapExecutor;
    address public dev;
    
    address constant UNIVERSAL_ROUTER = 0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af;
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    
    function setUp() public {
        config = ClawclickConfig(vm.envAddress("CONFIG"));
        hook = ClawclickHook(payable(vm.envAddress("HOOK")));
        factory = ClawclickFactory(payable(vm.envAddress("FACTORY")));
        swapExecutor = new SwapExecutor();
        
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        dev = vm.addr(pk);
    }
    
    function run() external {
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        
        console2.log("=== 03_TestDevActivation: Dev Override Path Validation ===");
        console2.log("");
        
        vm.startBroadcast(pk);
        
        // Test 1: Dev activation sets override flag
        testDevActivationSetsFlag();
        
        // Test 2: Dev bypass of tax and limits
        testDevBypassTaxAndLimits();
        
        // Test 3: Dev cap enforcement (15%)
        testDevCapEnforcement();
        
        // Test 4: Liquidity minted during dev activation
        testLiquidityMintedOnDevActivation();
        
        // Test 5: poolActivated flips true
        testPoolActivatedFlipsTrue();
        
        // Test 6: Dev activation cannot run twice
        testDevActivationCannotRunTwice();
        
        vm.stopBroadcast();
        
        console2.log("");
        console2.log("=== ALL DEV ACTIVATION TESTS PASSED ===");
    }
    
    function testDevActivationSetsFlag() internal {
        console2.log("Test 1: Dev Activation Sets Override Flag");
        
        // Create launch
        uint256 fee = factory.getFee(false);
        
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({
                name: "Dev Activation Test 1",
                symbol: "DEVACT1",
                beneficiary: dev,
                agentWallet: dev,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );
        
        // Get pool key
        ClawclickFactory.LaunchInfo memory info = factory.getLaunchByPoolId(poolId);
        PoolKey memory key = _createPoolKey(token);
        
        // Check flag before activation
        bool flagBefore = hook.activationInProgress(poolId);
        require(!flagBefore, "FAIL: activationInProgress should be false before activation");
        console2.log("  [OK] activationInProgress == false before dev activation");
        
        // Dev activates pool (this sets the flag)
        uint256 ethIn = 0.1 ether;
        factory.activateAndSwapDev{value: ethIn}(key);
        
        // Check flag after activation (should be TRUE - waiting for dev swap)
        bool flagAfter = hook.activationInProgress(poolId);
        require(flagAfter, "FAIL: activationInProgress should be true after activateAndSwapDev");
        console2.log("  [OK] activationInProgress == true after activateAndSwapDev");
        
        // Execute dev swap through Universal Router
        uint256 amountOut = swapExecutor.executeBuy{value: ethIn}(key, ethIn);
        
        console2.log("  [OK] Dev swap executed via Universal Router");
        console2.log("    ETH in:", ethIn / 1e18, "ETH");
        console2.log("    Tokens out:", amountOut / 1e18, "tokens");
        
        // Clear dev override
        factory.clearDevOverride(key);
        
        // Check flag after clear (should be FALSE)
        bool flagCleared = hook.activationInProgress(poolId);
        require(!flagCleared, "FAIL: activationInProgress should be false after clearDevOverride");
        console2.log("  [OK] activationInProgress == false after clearDevOverride");
        
        console2.log("  [OK] Test 1 PASSED");
        console2.log("");
    }
    
    function testDevBypassTaxAndLimits() internal {
        console2.log("Test 2: Dev Bypass Tax and Limits");
        
        // Create launch
        uint256 fee = factory.getFee(false);
        
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({
                name: "Dev Activation Test 2",
                symbol: "DEVACT2",
                beneficiary: dev,
                agentWallet: dev,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );
        
        PoolKey memory key = _createPoolKey(token);
        
        // Dev activates
        uint256 ethIn = 0.1 ether;
        factory.activateAndSwapDev{value: ethIn}(key);
        
        // Check dev balance before swap
        uint256 devBalanceBefore = ClawclickToken(token).balanceOf(dev);
        
        // Execute dev swap (should bypass 50% tax)
        uint256 amountOut = swapExecutor.executeBuy{value: ethIn}(key, ethIn);
        
        uint256 devBalanceAfter = ClawclickToken(token).balanceOf(dev);
        uint256 tokensReceived = devBalanceAfter - devBalanceBefore;
        
        // Calculate expected with NO tax (dev override bypasses tax)
        uint256 totalSupply = ClawclickToken(token).totalSupply();
        uint256 expectedNoTax = (ethIn * totalSupply) / (1 ether); // eth/mcap ratio
        
        // Dev should receive close to no-tax amount (within 5% for price impact)
        uint256 tolerance = expectedNoTax * 5 / 100;
        require(
            tokensReceived >= expectedNoTax - tolerance,
            "FAIL: Dev did not receive expected amount (tax may not be bypassed)"
        );
        
        console2.log("  [OK] Dev bypass confirmed");
        console2.log("    Expected (no tax):", expectedNoTax / 1e18, "tokens");
        console2.log("    Received:", tokensReceived / 1e18, "tokens");
        console2.log("    Tax bypassed: ~0%");
        
        factory.clearDevOverride(key);
        
        console2.log("  [OK] Test 2 PASSED");
        console2.log("");
    }
    
    function testDevCapEnforcement() internal {
        console2.log("Test 3: Dev Cap Enforcement (15%)");
        
        // Create launch
        uint256 fee = factory.getFee(false);
        
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({
                name: "Dev Activation Test 3",
                symbol: "DEVACT3",
                beneficiary: dev,
                agentWallet: dev,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );
        
        PoolKey memory key = _createPoolKey(token);
        
        // Try to buy more than 15% (should fail cap check)
        uint256 ethInLarge = 0.2 ether; // Attempt to buy ~20%
        
        factory.activateAndSwapDev{value: ethInLarge}(key);
        
        // Execute large swap
        uint256 amountOut = swapExecutor.executeBuy{value: ethInLarge}(key, ethInLarge);
        
        uint256 devBalance = ClawclickToken(token).balanceOf(dev);
        uint256 totalSupply = ClawclickToken(token).totalSupply();
        uint256 devPercentBps = (devBalance * 10000) / totalSupply;
        
        // Dev should be capped at 15%
        require(devPercentBps <= 1500, "FAIL: Dev exceeded 15% cap");
        
        console2.log("  [OK] Dev cap enforced");
        console2.log("    Dev balance:", devBalance / 1e18, "tokens");
        console2.log("    Dev %:", devPercentBps / 100, "bps");
        console2.log("    Cap: 15.00%");
        
        factory.clearDevOverride(key);
        
        console2.log("  [OK] Test 3 PASSED");
        console2.log("");
    }
    
    function testLiquidityMintedOnDevActivation() internal {
        console2.log("Test 4: Liquidity Minted on Dev Activation");
        
        // Create launch
        uint256 fee = factory.getFee(false);
        
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({
                name: "Dev Activation Test 4",
                symbol: "DEVACT4",
                beneficiary: dev,
                agentWallet: dev,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );
        
        PoolKey memory key = _createPoolKey(token);
        
        // Check no liquidity before activation
        uint256 lpTokenIdBefore = factory.positionTokenId(poolId);
        require(lpTokenIdBefore == 0, "FAIL: LP position exists before activation");
        console2.log("  [OK] No LP position before activation");
        
        // Dev activates (mints liquidity)
        uint256 ethIn = 0.1 ether;
        factory.activateAndSwapDev{value: ethIn}(key);
        
        // Check liquidity after activation
        uint256 lpTokenIdAfter = factory.positionTokenId(poolId);
        require(lpTokenIdAfter > 0, "FAIL: LP position not minted");
        console2.log("  [OK] LP position minted");
        console2.log("    LP NFT ID:", lpTokenIdAfter);
        
        // Execute dev swap and clear
        swapExecutor.executeBuy{value: ethIn}(key, ethIn);
        factory.clearDevOverride(key);
        
        console2.log("  [OK] Test 4 PASSED");
        console2.log("");
    }
    
    function testPoolActivatedFlipsTrue() internal {
        console2.log("Test 5: poolActivated Flips True");
        
        // Create launch
        uint256 fee = factory.getFee(false);
        
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({
                name: "Dev Activation Test 5",
                symbol: "DEVACT5",
                beneficiary: dev,
                agentWallet: dev,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );
        
        PoolKey memory key = _createPoolKey(token);
        
        // Check flag before
        bool activatedBefore = factory.poolActivated(poolId);
        require(!activatedBefore, "FAIL: Pool should not be activated before dev activation");
        console2.log("  [OK] poolActivated == false before activation");
        
        // Dev activates
        uint256 ethIn = 0.1 ether;
        factory.activateAndSwapDev{value: ethIn}(key);
        
        // Check flag after
        bool activatedAfter = factory.poolActivated(poolId);
        require(activatedAfter, "FAIL: Pool should be activated after dev activation");
        console2.log("  [OK] poolActivated == true after activation");
        
        // Execute swap and clear
        swapExecutor.executeBuy{value: ethIn}(key, ethIn);
        factory.clearDevOverride(key);
        
        console2.log("  [OK] Test 5 PASSED");
        console2.log("");
    }
    
    function testDevActivationCannotRunTwice() internal {
        console2.log("Test 6: Dev Activation Cannot Run Twice");
        
        // Create launch
        uint256 fee = factory.getFee(false);
        
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({
                name: "Dev Activation Test 6",
                symbol: "DEVACT6",
                beneficiary: dev,
                agentWallet: dev,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );
        
        PoolKey memory key = _createPoolKey(token);
        
        // First activation
        uint256 ethIn = 0.1 ether;
        factory.activateAndSwapDev{value: ethIn}(key);
        console2.log("  [OK] First dev activation succeeded");
        
        // Execute swap and clear
        swapExecutor.executeBuy{value: ethIn}(key, ethIn);
        factory.clearDevOverride(key);
        
        // Try second activation (should revert)
        try factory.activateAndSwapDev{value: ethIn}(key) {
            revert("FAIL: Second dev activation should have reverted");
        } catch {
            console2.log("  [OK] Second dev activation reverted");
        }
        
        console2.log("  [OK] Test 6 PASSED");
        console2.log("");
    }
    
    function _createPoolKey(address token) internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: 0x800000, // Dynamic fee
            tickSpacing: 200,
            hooks: IHooks(address(hook))
        });
    }
}
