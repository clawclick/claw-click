// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickConfig.sol";

contract DeployCore is Script {

    function run() external {

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        ClawclickConfig config = new ClawclickConfig(
            deployer,      // treasury (for now same as deployer)
            deployer       // owner
        );

        vm.stopBroadcast();

        console2.log("=== CORE DEPLOYED ===");
        console2.log("Config:", address(config));
    }
}