// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/ClawdNFT_V2.sol";

/**
 * @title DeployClawdNFT_V2_Base
 * @notice Deploy ClawdNFT V2 to Base mainnet (fixed free mint logic)
 * 
 * USAGE:
 * forge script script/DeployClawdNFT_V2_Base.s.sol:DeployClawdNFT_V2_Base \
 *   --rpc-url https://mainnet.base.org \
 *   --broadcast \
 *   --verify \
 *   --etherscan-api-key $BASESCAN_API_KEY
 */
contract DeployClawdNFT_V2_Base is Script {
    // Base mainnet addresses
    address constant BIRTH_CERTIFICATE = 0x6E9B093FdD12eC34ce358bd70CF59EeCb5D1A95B;
    address constant TREASURY = 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b;
    string constant BASE_METADATA_URI = "https://api.claw.click/nftid";
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy ClawdNFT V2
        ClawdNFT clawdNFT = new ClawdNFT(
            BIRTH_CERTIFICATE,
            TREASURY,
            BASE_METADATA_URI
        );
        
        console.log("=== ClawdNFT V2 Deployment (Base Mainnet) ===");
        console.log("ClawdNFT V2:", address(clawdNFT));
        console.log("Birth Certificate:", BIRTH_CERTIFICATE);
        console.log("Treasury:", TREASURY);
        console.log("Base Metadata URI:", BASE_METADATA_URI);
        
        vm.stopBroadcast();
    }
}
