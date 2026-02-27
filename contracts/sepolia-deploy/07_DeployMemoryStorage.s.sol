// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/identity/MemoryStorage.sol";

contract DeployMemoryStorage is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("TESTING_DEV_WALLET_PK");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("=== DEPLOYING MEMORY STORAGE ===");
        console2.log("Deployer:", deployer);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy MemoryStorage
        MemoryStorage memoryStorage = new MemoryStorage();

        vm.stopBroadcast();

        console2.log("=== MEMORY STORAGE DEPLOYED ===");
        console2.log("Address:", address(memoryStorage));
        console2.log("");
        console2.log("[OK] Save MEMORY_STORAGE_ADDRESS:");
        console2.log(address(memoryStorage));
    }
}
