// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/core/ClawclickHook_V4.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickToken.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

/**
 * @title 03_TestDevActivation
 * @notice Validates pool auto-activation (dev activation removed in new system)
 */
contract TestDevActivation is Script {
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
        console2.log("=== 03_TestDevActivation ===");
        vm.startBroadcast(pk);
        testAutoActivation();
        testDevCapCheck();
        testActivationInProgressFlag();
        vm.stopBroadcast();
        console2.log("=== ALL DEV ACTIVATION TESTS PASSED ===");
    }

    function testAutoActivation() internal {
        console2.log("Test 1: Auto-Activation at Launch");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "DEVACT1", symbol: "DA1", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        require(factory.poolActivated(poolId), "Pool not activated");
        require(factory.positionTokenId(poolId) > 0, "No LP position");
        console2.log("  [OK] Pool auto-activated with LP");
    }

    function testDevCapCheck() internal {
        console2.log("Test 2: Dev Cap Check");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "DEVACT2", symbol: "DA2", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        bool capOk = factory.checkDevCap(poolId, dev);
        require(capOk, "Dev should be within cap");
        console2.log("  [OK] Dev within 15% cap");
    }

    function testActivationInProgressFlag() internal {
        console2.log("Test 3: activationInProgress Flag");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "DEVACT3", symbol: "DA3", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        bool flag = hook.activationInProgress(poolId);
        console2.log("  activationInProgress:", flag);
        console2.log("  [OK] Flag accessible");
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
