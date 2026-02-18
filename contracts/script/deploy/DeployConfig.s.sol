// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickConfig.sol";

/**
 * @title DeployConfig
 * @notice Deploy ClawclickConfig to Sepolia
 * 
 * Usage:
 *   forge script script/DeployConfig.s.sol:DeployConfig \
 *     --rpc-url $SEPOLIA_RPC \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast \
 *     --verify --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployConfig is Script {
    function run() external {
        // Get deployment parameters from environment
        address treasury = vm.envOr("TREASURY_ADDRESS", msg.sender);
        address owner = vm.envOr("OWNER_ADDRESS", msg.sender);
        
        console2.log("=== DEPLOYING CLAWCLICK CONFIG ===");
        console2.log("Treasury:", treasury);
        console2.log("Owner:", owner);
        console2.log("Deployer:", msg.sender);
        
        vm.startBroadcast();
        
        // Deploy config
        ClawclickConfig config = new ClawclickConfig(treasury, owner);
        
        vm.stopBroadcast();
        
        console2.log("");
        console2.log("=== DEPLOYMENT COMPLETE ===");
        console2.log("ClawclickConfig:", address(config));
        console2.log("");
        console2.log("Save this address for next deployment step!");
        console2.log("export CONFIG_ADDRESS=", address(config));
    }
}
