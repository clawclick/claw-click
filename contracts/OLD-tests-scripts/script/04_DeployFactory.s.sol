// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/core/ClawclickConfig.sol";
import "../src/utils/BootstrapETH.sol";
import "v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";

contract DeployFactory is Script {

    function run() external {

        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");

        address configAddr = vm.envAddress("CONFIG");
        address payable hookAddr = payable(vm.envAddress("HOOK"));

        address poolManager = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
        address positionManager = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;

        vm.startBroadcast(pk);

        // Note: BootstrapETH address should be set via environment variable if available
        address payable bootstrapETHAddr = payable(vm.envOr("BOOTSTRAP_ETH", address(0)));
        
        ClawclickFactory factory = new ClawclickFactory(
            ClawclickConfig(configAddr),
            IPoolManager(poolManager),
            ClawclickHook(hookAddr),
            positionManager,
            BootstrapETH(bootstrapETHAddr),
            vm.addr(pk)  // owner
        );

        // Wire factory into config
        ClawclickConfig(configAddr).setFactory(address(factory));

        vm.stopBroadcast();

        console2.log("=== FACTORY DEPLOYED ===");
        console2.log("Factory:", address(factory));
    }
}