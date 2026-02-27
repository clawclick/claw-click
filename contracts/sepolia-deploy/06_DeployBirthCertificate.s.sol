// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/identity/AgentBirthCertificateNFT.sol";

contract DeployBirthCertificate is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("TESTING_DEV_WALLET_PK");
        address deployer = vm.addr(deployerPrivateKey);
        address safe = vm.envAddress("SAFE_ADDRESS");

        console2.log("=== DEPLOYING BIRTH CERTIFICATE ===");
        console2.log("Deployer:", deployer);
        console2.log("Treasury (SAFE):", safe);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy AgentBirthCertificateNFT
        // Base URI will be set via API: https://claws.fun/api/nft/{id}
        AgentBirthCertificateNFT birthCert = new AgentBirthCertificateNFT(
            "https://claws.fun/api/nft/",  // baseURI
            safe                            // treasury for immortalization fees
        );

        vm.stopBroadcast();

        console2.log("=== BIRTH CERTIFICATE DEPLOYED ===");
        console2.log("Address:", address(birthCert));
        console2.log("Owner:", birthCert.owner());
        console2.log("Treasury:", birthCert.treasury());
        console2.log("");
        console2.log("[OK] Save BIRTH_CERTIFICATE_ADDRESS:");
        console2.log(address(birthCert));
    }
}
