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
        console2.log("=== 04_TestTaxDecay ===");
        vm.startBroadcast(pk);
        testInitialTax();
        testTaxDecayAt2x();
        testTaxDecayAt4x();
        testTaxDecayAt8x();
        testFeeAccounting();
        vm.stopBroadcast();
        console2.log("=== ALL TAX DECAY TESTS PASSED ===");
    }

    function testInitialTax() internal {
        console2.log("Test 1: Initial Tax (50%)");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "TAXFINAL", symbol: "TXF", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        PoolKey memory key = _createPoolKey(token);
        (,,, uint256 baseTax,,,,) = hook.launches(poolId);
        require(baseTax == 5000, "Base tax should be 5000");
        console2.log("  [OK] Base tax: 5000 (50%)");
        uint256 buyAmount = 0.001 ether;
        uint256 balBefore = ClawclickToken(token).balanceOf(dev);
        swapExecutor.executeBuy{value: buyAmount}(key, buyAmount, 0);
        uint256 balAfter = ClawclickToken(token).balanceOf(dev);
        console2.log("  Tokens out:", (balAfter - balBefore) / 1e18);
        console2.log("  [OK] Test 1 PASSED");
    }

    function testTaxDecayAt2x() internal {
        console2.log("Test 2: Tax Decay at 2x MCAP");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "TAXDECAY2", symbol: "TD2", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        PoolKey memory key = _createPoolKey(token);
        for (uint i = 0; i < 50; i++) { swapExecutor.executeBuy{value: 0.002 ether}(key, 0.002 ether, 0); }
        uint256 currentTax = hook.getCurrentTax(poolId);
        console2.log("  Current tax:", currentTax, "bps");
        require(currentTax <= 2500, "Tax should be <= 2500 at 2x");
        console2.log("  [OK] Test 2 PASSED");
    }

    function testTaxDecayAt4x() internal {
        console2.log("Test 3: Tax Decay at 4x MCAP");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "TAXDECAY3", symbol: "TD3", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        PoolKey memory key = _createPoolKey(token);
        for (uint i = 0; i < 30; i++) { swapExecutor.executeBuy{value: 0.1 ether}(key, 0.1 ether, 0); }
        uint256 currentTax = hook.getCurrentTax(poolId);
        console2.log("  Current tax:", currentTax, "bps");
        require(currentTax <= 1250, "Tax should be <= 1250 at 4x");
        console2.log("  [OK] Test 3 PASSED");
    }

    function testTaxDecayAt8x() internal {
        console2.log("Test 4: Tax Decay at 8x MCAP");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "TAXDECAY4", symbol: "TD4", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        PoolKey memory key = _createPoolKey(token);
        for (uint i = 0; i < 70; i++) { swapExecutor.executeBuy{value: 0.1 ether}(key, 0.1 ether, 0); }
        uint256 currentTax = hook.getCurrentTax(poolId);
        console2.log("  Current tax:", currentTax, "bps");
        require(currentTax <= 625, "Tax should be <= 625 at 8x");
        console2.log("  [OK] Test 4 PASSED");
    }

    function testFeeAccounting() internal {
        console2.log("Test 5: Fee Accounting");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "TAXDECAY5", symbol: "TD5", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        PoolKey memory key = _createPoolKey(token);
        uint256 feesBefore = hook.beneficiaryFeesToken(dev, token);
        swapExecutor.executeBuy{value: 0.001 ether}(key, 0.001 ether, 0);
        uint256 feesAfter = hook.beneficiaryFeesToken(dev, token);
        require(feesAfter > feesBefore, "Fees should increase");
        console2.log("  [OK] Test 5 PASSED");
    }

    function _createPoolKey(address token) internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: 0x800000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
    }
}
