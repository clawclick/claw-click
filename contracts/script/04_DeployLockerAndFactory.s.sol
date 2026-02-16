// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickLPLocker.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/core/ClawclickConfig.sol";
import "v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";

contract DeployLockerAndFactory is Script {

    function run() external {

        uint256 pk = vm.envUint("PRIVATE_KEY");

        address configAddr = vm.envAddress("CONFIG");
        address payable hookAddr = payable(vm.envAddress("HOOK"));

        address poolManager = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
        address positionManager = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;

        vm.startBroadcast(pk);

        ClawclickLPLocker locker = new ClawclickLPLocker(
            positionManager,
            hookAddr,
            msg.sender
        );

        ClawclickHook(hookAddr).setLPLocker(locker);

        ClawclickFactory factory = new ClawclickFactory(
            ClawclickConfig(configAddr),
            IPoolManager(poolManager),
            ClawclickHook(hookAddr),
            locker,
            IPositionManager(positionManager),
            msg.sender
        );

        ClawclickConfig(configAddr).setFactory(address(factory));

        vm.stopBroadcast();

        console2.log("=== LOCKER + FACTORY DEPLOYED ===");
        console2.log("Locker:", address(locker));
        console2.log("Factory:", address(factory));
    }
}