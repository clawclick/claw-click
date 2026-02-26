// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickConfig.sol";

/**
 * @title 01_WireFactory
 * @notice Wire Factory address into Config (Step 1 of mainnet wiring)
 * 
 * @dev CRITICAL: Must be done before any tokens can be launched
 * 
 * WHAT IT DOES:
 * - Calls Config.setFactory(FACTORY_ADDRESS)
 * - Verifies factory address is set correctly
 * - Enables token launching functionality
 * 
 * REQUIREMENTS:
 * - DEPLOYER_PRIVATE_KEY (must be current Config owner)
 * - CONFIG_ADDRESS (from deployment)
 * - FACTORY_ADDRESS (from deployment)
 * 
 * USAGE:
 * forge script mainnet-wire/01_WireFactory.s.sol \
 *   --rpc-url $BASE_MAINNET_RPC_URL \
 *   --broadcast \
 *   --legacy
 */
contract WireFactory is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("MAINNET_DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);
        
        address configAddress = vm.envAddress("CONFIG_ADDRESS");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");

        console2.log("=== WIRING FACTORY TO CONFIG ===");
        console2.log("Deployer:", deployer);
        console2.log("Config:", configAddress);
        console2.log("Factory:", factoryAddress);
        console2.log("");

        ClawclickConfig config = ClawclickConfig(configAddress);

        // Check current state
        console2.log("Current Config State:");
        console2.log("  Owner:", config.owner());
        console2.log("  Factory:", config.factory());
        console2.log("  Treasury:", config.treasury());
        console2.log("");

        require(config.owner() == deployer, "Deployer is not Config owner");

        vm.startBroadcast(deployerPrivateKey);

        // Wire factory into config
        config.setFactory(factoryAddress);

        vm.stopBroadcast();

        console2.log("=== FACTORY WIRED ===");
        console2.log("");
        console2.log("Verifying...");
        console2.log("Config.factory():", config.factory());
        
        require(config.factory() == factoryAddress, "Factory not set correctly");
        
        console2.log("");
        console2.log("[OK] Factory successfully wired to Config!");
        console2.log("[OK] Token launching is now enabled");
    }
}
