// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickHook_V4.sol";
import "v4-core/src/interfaces/IPoolManager.sol";
import "../src/core/ClawclickConfig.sol";

contract DeployHook is Script {

    function run() external {

        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        bytes32 salt = vm.envBytes32("HOOK_SALT");

        address poolManager = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
        address config = vm.envAddress("CONFIG");

        vm.startBroadcast(pk);

        ClawclickHook hook = new ClawclickHook{salt: salt}(
            IPoolManager(poolManager),
            ClawclickConfig(config)
        );

        vm.stopBroadcast();

        console2.log("=== HOOK DEPLOYED ===");
        console2.log("Hook:", address(hook));
    }
}