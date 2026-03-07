// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../contracts/AgentNFTidRegistry.sol";

/**
 * @title DeployRegistry_V2_Base
 * @notice Deploy AgentNFTidRegistry pointing to ClawdNFT V2 on Base mainnet
 */
contract DeployRegistry_V2_Base is Script {
    // Base mainnet addresses
    address constant CLAWD_NFT_V2 = 0x86d7d293DD9bFE25CA3CAF4Cb09f8d2c266823E0;  // New ClawdNFT V2
    address constant BIRTH_CERTIFICATE = 0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy AgentNFTidRegistry
        AgentNFTidRegistry registry = new AgentNFTidRegistry(
            CLAWD_NFT_V2,
            BIRTH_CERTIFICATE
        );
        
        console.log("=== AgentNFTidRegistry V2 Deployment (Base Mainnet) ===");
        console.log("AgentNFTidRegistry V2:", address(registry));
        console.log("ClawdNFT V2:", CLAWD_NFT_V2);
        console.log("Birth Certificate:", BIRTH_CERTIFICATE);
        
        vm.stopBroadcast();
    }
}
