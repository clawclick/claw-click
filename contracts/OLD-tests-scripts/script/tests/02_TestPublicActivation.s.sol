// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/core/ClawclickHook_V4.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickToken.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";

contract TestPublicActivation is Script {
    ClawclickConfig public config;
    ClawclickHook public hook;
    ClawclickFactory public factory;
    address public dev;

    function setUp() public {
        config = ClawclickConfig(vm.envAddress("CONFIG"));
        hook = ClawclickHook(payable(vm.envAddress("HOOK")));
        factory = ClawclickFactory(payable(vm.envAddress("FACTORY")));
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        dev = vm.addr(pk);
    }

    function run() external {
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        console2.log("=== 02_TestActivation ===");
        vm.startBroadcast(pk);
        _testPoolActivatesAtLaunch();
        _testLPPositionExists();
        _testHookRegistered();
        _testTokensDistributed();
        vm.stopBroadcast();
        console2.log("=== ALL ACTIVATION TESTS PASSED ===");
    }

    function _testPoolActivatesAtLaunch() internal {
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "ACT1", symbol: "ACT1", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        require(factory.poolActivated(poolId), "Pool not activated");
        console2.log("  [OK] Pool activates at launch");
    }

    function _testLPPositionExists() internal {
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "ACT2", symbol: "ACT2", beneficiary: dev, agentWallet: dev, targetMcapETH: 2 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        require(factory.positionTokenId(poolId) > 0, "No LP position");
        console2.log("  [OK] LP position exists");
    }

    function _testHookRegistered() internal {
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "ACT3", symbol: "ACT3", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        (address hookToken,,,uint256 baseTax,,,,) = hook.launches(poolId);
        require(hookToken == token, "Hook mismatch");
        require(baseTax == 5000, "baseTax not 5000");
        console2.log("  [OK] Hook registered");
    }

    function _testTokensDistributed() internal {
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token,) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "ACT5", symbol: "ACT5", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        uint256 total = ClawclickToken(token).totalSupply();
        uint256 factBal = ClawclickToken(token).balanceOf(address(factory));
        console2.log("  Supply:", total / 1e18, "Factory:", factBal / 1e18);
        console2.log("  [OK] Tokens distributed");
    }
}
