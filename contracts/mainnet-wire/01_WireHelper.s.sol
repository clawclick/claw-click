// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactoryCore.sol";

contract WireHelper is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        address factoryCoreAddr = vm.envAddress("FACTORY_CORE_ADDRESS");
        address factoryHelperAddr = vm.envAddress("FACTORY_HELPER_ADDRESS");
        
        console2.log("=== WIRING HELPER ===");
        console2.log("FactoryCore:", factoryCoreAddr);
        console2.log("FactoryHelper:", factoryHelperAddr);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        ClawclickFactoryCore factoryCore = ClawclickFactoryCore(payable(factoryCoreAddr));
        factoryCore.setHelper(factoryHelperAddr);

        vm.stopBroadcast();

        console2.log("[OK] Helper wired to FactoryCore");
    }
}
