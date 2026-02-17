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
 * @title 04_TestTaxDecay
 * @notice Tests tax decay mechanism at MCAP milestones using REAL Sepolia swaps
 * @dev All swaps execute through Universal Router via SwapExecutor
 */
contract TestTaxDecay is Script {
    
    ClawclickConfig public config;
    ClawclickHook public hook;
    ClawclickFactory public factory;
    SwapExecutor public swapExecutor;
    address public dev;
    
    function setUp() public {
        config = ClawclickConfig(vm.envAddress("CONFIG"));
        hook = ClawclickHook(payable(vm.envAddress("HOOK")));
        factory = ClawclickFactory(payable(vm.envAddress("FACTORY")));
        swapExecutor = SwapExecutor(payable(vm.envAddress("SWAP_EXECUTOR")));
        
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        dev = vm.addr(pk);
    }
    
    function run() external {
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        
        console2.log("=== 04_TestTaxDecay: Tax Decay via Real Sepolia Swaps ===");
        console2.log("");
        
        vm.startBroadcast(pk);
        
        // Test 1: Initial 50% tax
        testInitialTax();
        
        // Test 2: Tax halves at 2x MCAP
        testTaxDecayAt2x();
        
        // Test 3: Tax halves at 4x MCAP
        testTaxDecayAt4x();
        
        // Test 4: Tax halves at 8x MCAP
        testTaxDecayAt8x();
        
        // Test 5: Fee accounting
        testFeeAccounting();
        
        vm.stopBroadcast();
        
        console2.log("");
        console2.log("=== ALL TAX DECAY TESTS PASSED ===");
    }
    
    function testInitialTax() internal {
        console2.log("Test 1: Initial Tax (50%)");
        
        // Create launch with 1 ETH target MCAP
        uint256 fee = factory.getFee(false);
        uint256 targetMcap = 1 ether;
        
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({
                name: "Tax Decay Test 1",
                symbol: "TAXDECAY1",
                beneficiary: dev,
                agentWallet: dev,
                isPremium: false,
                targetMcapETH: targetMcap
            })
        );
        
        PoolKey memory key = _createPoolKey(token);
        
        // Activate pool (public activation)
        uint256 activationEth = 0.05 ether;
        factory.activatePool{value: activationEth}(key);
        console2.log("  [OK] Pool activated");
        
        // Check initial tax from hook
        (,,,uint256 baseTax,,,,) = hook.launches(poolId);
        require(baseTax == 5000, "FAIL: Base tax should be 5000 (50%)");
        console2.log("  [OK] Base tax: 5000 (50%)");
        
        // Execute buy through SwapExecutor
        uint256 buyAmount = 0.1 ether;
        uint256 balanceBefore = ClawclickToken(token).balanceOf(dev);
        
        swapExecutor.executeBuy{value: buyAmount}(key, buyAmount, 0);
        
        uint256 balanceAfter = ClawclickToken(token).balanceOf(dev);
        uint256 tokensOut = balanceAfter - balanceBefore;
        
        console2.log("  [OK] Buy executed");
        console2.log("    ETH in:", buyAmount / 1e18, "ETH");
        console2.log("    Tokens out:", tokensOut / 1e18, "tokens");
        
        console2.log("  [OK] Test 1 PASSED");
        console2.log("");
    }
    
    function testTaxDecayAt2x() internal {
        console2.log("Test 2: Tax Decay at 2x MCAP");
        
        // Create launch
        uint256 fee = factory.getFee(false);
        uint256 targetMcap = 1 ether;
        
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({
                name: "Tax Decay Test 2",
                symbol: "TAXDECAY2",
                beneficiary: dev,
                agentWallet: dev,
                isPremium: false,
                targetMcapETH: targetMcap
            })
        );
        
        PoolKey memory key = _createPoolKey(token);
        
        // Activate
        factory.activatePool{value: 0.05 ether}(key);
        
        // Buy until 2x MCAP reached
        // Need to push ~1 ETH into pool to double MCAP
        uint256 balanceBefore = ClawclickToken(token).balanceOf(dev);
        
        for (uint i = 0; i < 10; i++) {
            swapExecutor.executeBuy{value: 0.1 ether}(key, 0.1 ether, 0);
        }
        
        uint256 balanceAfter = ClawclickToken(token).balanceOf(dev);
        uint256 totalBought = balanceAfter - balanceBefore;
        
        console2.log("  [OK] Bought tokens to reach 2x MCAP");
        console2.log("    Total tokens bought:", totalBought / 1e18);
        
        // Check current tax (should be halved to 2500)
        uint256 currentTax = hook.getCurrentTax(poolId);
        console2.log("    Current tax:", currentTax, "bps");
        
        // Tax should be 2500 (25%) at 2x MCAP
        require(currentTax <= 2500, "FAIL: Tax should be <= 2500 at 2x MCAP");
        console2.log("  [OK] Tax decayed to 25% at 2x MCAP");
        
        console2.log("  [OK] Test 2 PASSED");
        console2.log("");
    }
    
    function testTaxDecayAt4x() internal {
        console2.log("Test 3: Tax Decay at 4x MCAP");
        
        // Create launch
        uint256 fee = factory.getFee(false);
        
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({
                name: "Tax Decay Test 3",
                symbol: "TAXDECAY3",
                beneficiary: dev,
                agentWallet: dev,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );
        
        PoolKey memory key = _createPoolKey(token);
        
        // Activate
        factory.activatePool{value: 0.05 ether}(key);
        
        // Buy aggressively to reach 4x MCAP (~3 ETH)
        for (uint i = 0; i < 30; i++) {
            swapExecutor.executeBuy{value: 0.1 ether}(key, 0.1 ether, 0);
        }
        
        console2.log("  [OK] Bought tokens to reach 4x MCAP");
        
        // Check current tax (should be 1250 = 12.5%)
        uint256 currentTax = hook.getCurrentTax(poolId);
        console2.log("    Current tax:", currentTax, "bps");
        
        require(currentTax <= 1250, "FAIL: Tax should be <= 1250 at 4x MCAP");
        console2.log("  [OK] Tax decayed to 12.5% at 4x MCAP");
        
        console2.log("  [OK] Test 3 PASSED");
        console2.log("");
    }
    
    function testTaxDecayAt8x() internal {
        console2.log("Test 4: Tax Decay at 8x MCAP");
        
        // Create launch
        uint256 fee = factory.getFee(false);
        
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({
                name: "Tax Decay Test 4",
                symbol: "TAXDECAY4",
                beneficiary: dev,
                agentWallet: dev,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );
        
        PoolKey memory key = _createPoolKey(token);
        
        // Activate
        factory.activatePool{value: 0.05 ether}(key);
        
        // Buy massively to reach 8x MCAP (~7 ETH)
        for (uint i = 0; i < 70; i++) {
            swapExecutor.executeBuy{value: 0.1 ether}(key, 0.1 ether, 0);
        }
        
        console2.log("  [OK] Bought tokens to reach 8x MCAP");
        
        // Check current tax (should be 625 = 6.25%)
        uint256 currentTax = hook.getCurrentTax(poolId);
        console2.log("    Current tax:", currentTax, "bps");
        
        require(currentTax <= 625, "FAIL: Tax should be <= 625 at 8x MCAP");
        console2.log("  [OK] Tax decayed to 6.25% at 8x MCAP");
        
        console2.log("  [OK] Test 4 PASSED");
        console2.log("");
    }
    
    function testFeeAccounting() internal {
        console2.log("Test 5: Fee Accounting");
        
        // Create launch
        uint256 fee = factory.getFee(false);
        
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({
                name: "Tax Decay Test 5",
                symbol: "TAXDECAY5",
                beneficiary: dev,
                agentWallet: dev,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );
        
        PoolKey memory key = _createPoolKey(token);
        
        // Activate
        factory.activatePool{value: 0.05 ether}(key);
        
        // Check beneficiary fees before swap
        uint256 feesBefore = hook.beneficiaryFeesToken(dev, token);
        console2.log("  [OK] Beneficiary fees before:", feesBefore / 1e18, "tokens");
        
        // Execute buy
        swapExecutor.executeBuy{value: 0.1 ether}(key, 0.1 ether, 0);
        
        // Check beneficiary fees after swap
        uint256 feesAfter = hook.beneficiaryFeesToken(dev, token);
        console2.log("  [OK] Beneficiary fees after:", feesAfter / 1e18, "tokens");
        
        // Fees should have increased
        require(feesAfter > feesBefore, "FAIL: Fees should have increased");
        console2.log("  [OK] Fees collected and accounted");
        
        console2.log("  [OK] Test 5 PASSED");
        console2.log("");
    }
    
    function _createPoolKey(address token) internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: 0x800000,
            tickSpacing: 200,
            hooks: IHooks(address(hook))
        });
    }
}
