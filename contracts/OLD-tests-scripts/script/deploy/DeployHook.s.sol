// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickHook_V4.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title DeployHook
 * @notice Deploy ClawclickHook_V4 to Sepolia
 * 
 * Usage:
 *   export CONFIG_ADDRESS=0x...
 *   forge script script/DeployHook.s.sol:DeployHook \
 *     --rpc-url $SEPOLIA_RPC \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast \
 *     --verify --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployHook is Script {
    // Sepolia V4 addresses
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    
    function run() external {
        // Get config address from environment
        address configAddress = vm.envAddress("CONFIG_ADDRESS");
        
        console2.log("=== DEPLOYING CLAWCLICK HOOK ===");
        console2.log("PoolManager:", POOL_MANAGER);
        console2.log("Config:", configAddress);
        console2.log("Deployer:", msg.sender);
        
        vm.startBroadcast();
        
        // Deploy hook
        ClawclickHook hook = new ClawclickHook(
            IPoolManager(POOL_MANAGER),
            ClawclickConfig(configAddress)
        );
        
        vm.stopBroadcast();
        
        console2.log("");
        console2.log("=== DEPLOYMENT COMPLETE ===");
        console2.log("ClawclickHook:", address(hook));
        console2.log("");
        console2.log("Save this address for next deployment step!");
        console2.log("export HOOK_ADDRESS=", address(hook));
    }
}
