// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";

/**
 * @title DeployFactory
 * @notice Deploy ClawclickFactory to Sepolia
 * 
 * Usage:
 *   export CONFIG_ADDRESS=0x...
 *   export HOOK_ADDRESS=0x...
 *   forge script script/DeployFactory.s.sol:DeployFactory \
 *     --rpc-url $SEPOLIA_RPC \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast \
 *     --verify --etherscan-api-key $ETHERSCAN_API_KEY
 */
contract DeployFactory is Script {
    // Sepolia V4 addresses
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POSITION_MANAGER = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;
    
    function run() external {
        // Get addresses from environment
        address configAddress = vm.envAddress("CONFIG_ADDRESS");
        address hookAddress = vm.envAddress("HOOK_ADDRESS");
        
        console2.log("=== DEPLOYING CLAWCLICK FACTORY ===");
        console2.log("Config:", configAddress);
        console2.log("PoolManager:", POOL_MANAGER);
        console2.log("Hook:", hookAddress);
        console2.log("PositionManager:", POSITION_MANAGER);
        console2.log("Deployer:", msg.sender);
        
        vm.startBroadcast();
        
        // Deploy factory
        ClawclickFactory factory = new ClawclickFactory(
            ClawclickConfig(configAddress),
            IPoolManager(POOL_MANAGER),
            ClawclickHook(payable(hookAddress)),
            POSITION_MANAGER,
            msg.sender
        );
        
        vm.stopBroadcast();
        
        console2.log("");
        console2.log("=== DEPLOYMENT COMPLETE ===");
        console2.log("ClawclickFactory:", address(factory));
        console2.log("");
        console2.log("Save this address for configuration step!");
        console2.log("export FACTORY_ADDRESS=", address(factory));
    }
}
