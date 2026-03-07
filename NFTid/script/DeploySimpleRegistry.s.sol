// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/SimpleAgentNFTidRegistry.sol";

/**
 * @title DeploySimpleRegistry
 * @notice Deploy simple registry to Base mainnet
 */
contract DeploySimpleRegistry is Script {
    // Base mainnet addresses
    address constant CLAWD_NFT = 0x86d7d293DD9bFE25CA3CAF4Cb09f8d2c266823E0;
    address constant BIRTH_CERTIFICATE = 0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        SimpleAgentNFTidRegistry registry = new SimpleAgentNFTidRegistry(
            CLAWD_NFT,
            BIRTH_CERTIFICATE
        );
        
        console.log("=== SimpleAgentNFTidRegistry Deployed (Base Mainnet) ===");
        console.log("Registry:", address(registry));
        console.log("ClawdNFT:", CLAWD_NFT);
        console.log("Birth Certificate:", BIRTH_CERTIFICATE);
        
        vm.stopBroadcast();
    }
}
