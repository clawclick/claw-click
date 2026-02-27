// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/bundler/AgentLaunchBundler.sol";

/**
 * @title DeployBundler
 * @notice Deploy AgentLaunchBundler (combines createLaunch + mintBirthCertificate)
 * @dev Run AFTER deploying Factory and Birth Certificate
 */
contract DeployBundler is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("TESTING_DEV_WALLET_PK");
        address deployer = vm.addr(deployerPrivateKey);
        
        address factory = vm.envAddress("FACTORY_ADDRESS_SEPOLIA");
        address birthCert = vm.envAddress("BIRTH_CERT_ADDRESS_SEPOLIA");
        
        console2.log("=== DEPLOYING BUNDLER ===");
        console2.log("Deployer:", deployer);
        console2.log("Factory:", factory);
        console2.log("Birth Cert:", birthCert);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        AgentLaunchBundler bundler = new AgentLaunchBundler(factory, birthCert);

        vm.stopBroadcast();

        console2.log("=== BUNDLER DEPLOYED ===");
        console2.log("Bundler:", address(bundler));
        console2.log("");
        console2.log("Verifying configuration...");
        console2.log("Factory:", address(bundler.factory()));
        console2.log("Birth Cert:", address(bundler.birthCert()));
        console2.log("");
        console2.log("[OK] Save BUNDLER_ADDRESS:");
        console2.log(address(bundler));
    }
}
