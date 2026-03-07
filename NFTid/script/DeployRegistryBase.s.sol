// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/AgentNFTidRegistry.sol";

contract DeployRegistryBase is Script {
    // Base mainnet addresses
    address constant CLAWD_NFT = 0x553016FA9Ead8ACFa1d96220901f1e91EEB135f4;
    address constant BIRTH_CERTIFICATE = 0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        AgentNFTidRegistry registry = new AgentNFTidRegistry(
            CLAWD_NFT,
            BIRTH_CERTIFICATE
        );

        console.log("AgentNFTidRegistry deployed to:", address(registry));
        console.log("ClawdNFT (linked):", CLAWD_NFT);
        console.log("BirthCertificate (linked):", BIRTH_CERTIFICATE);

        vm.stopBroadcast();
    }
}
