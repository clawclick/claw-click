// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/utils/BootstrapETH.sol";

contract DeployBootstrapETH is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        address factoryCore = vm.envAddress("FACTORY_CORE_ADDRESS");
        
        console2.log("=== DEPLOYING BOOTSTRAP ETH ===");
        console2.log("Deployer:", deployer);
        console2.log("FactoryCore:", factoryCore);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        BootstrapETH bootstrapETH = new BootstrapETH(factoryCore);

        vm.stopBroadcast();

        console2.log("BootstrapETH deployed:", address(bootstrapETH));
        console2.log("");
        console2.log("Update .env:");
        console2.log("BOOTSTRAP_ETH_ADDRESS=", address(bootstrapETH));
    }
}
