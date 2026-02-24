// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickConfig.sol";

/**
 * @title ConfigureContracts
 * @notice Set factory address in config (final setup step)
 * 
 * Usage:
 *   export CONFIG_ADDRESS=0x...
 *   export FACTORY_ADDRESS=0x...
 *   forge script script/ConfigureContracts.s.sol:ConfigureContracts \
 *     --rpc-url $SEPOLIA_RPC \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 */
contract ConfigureContracts is Script {
    function run() external {
        // Get addresses from environment
        address configAddress = vm.envAddress("CONFIG_ADDRESS");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        
        console2.log("=== CONFIGURING CONTRACTS ===");
        console2.log("Config:", configAddress);
        console2.log("Factory:", factoryAddress);
        console2.log("Caller:", msg.sender);
        
        vm.startBroadcast();
        
        // Set factory in config
        ClawclickConfig config = ClawclickConfig(configAddress);
        config.setFactory(factoryAddress);
        
        vm.stopBroadcast();
        
        console2.log("");
        console2.log("=== CONFIGURATION COMPLETE ===");
        console2.log("Factory set in config!");
        console2.log("");
        console2.log("System is now ready for test launches.");
        console2.log("Run CreateTestLaunch.s.sol to create first launch.");
    }
}
