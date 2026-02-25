// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactoryCore.sol";
import "../src/core/ClawclickConfig.sol";

contract TransferOwnership is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        address factoryCoreAddr = vm.envAddress("FACTORY_CORE_ADDRESS");
        address configAddr = vm.envAddress("CONFIG_ADDRESS");
        address safeAddr = vm.envAddress("SAFE_ADDRESS");
        
        console2.log("=== TRANSFERRING OWNERSHIP TO SAFE ===");
        console2.log("SAFE:", safeAddr);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Transfer FactoryCore ownership
        ClawclickFactoryCore factoryCore = ClawclickFactoryCore(payable(factoryCoreAddr));
        factoryCore.transferOwnership(safeAddr);
        console2.log("[OK] FactoryCore ownership -> SAFE");

        // Transfer Config ownership (if we still own it)
        try ClawclickConfig(configAddr).owner() returns (address currentOwner) {
            if (currentOwner == msg.sender) {
                ClawclickConfig(configAddr).transferOwnership(safeAddr);
                console2.log("[OK] Config ownership -> SAFE");
            } else {
                console2.log("[INFO] Config already owned by:", currentOwner);
            }
        } catch {
            console2.log("[INFO] Config ownership check failed");
        }

        vm.stopBroadcast();

        console2.log("");
        console2.log("[OK] Ownership transfer complete");
    }
}
