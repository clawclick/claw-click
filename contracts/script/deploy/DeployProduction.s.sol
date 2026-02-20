// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickHook_V4.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/utils/BootstrapETH.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title DeployProduction
 * @notice Production deployment script for Sepolia
 * @dev Deploys: Config → Hook → Factory
 */
contract DeployProduction is Script {
    // Sepolia Uniswap V4 addresses
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POSITION_MANAGER = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("=== CLAW.CLICK PRODUCTION DEPLOYMENT ===");
        console2.log("Network: Sepolia");
        console2.log("Deployer:", deployer);
        console2.log("Balance:", deployer.balance / 1e18, "ETH");
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // ============================================================================
        // STEP 1: Deploy Config
        // ============================================================================
        console2.log("1/3 Deploying ClawclickConfig...");
        ClawclickConfig config = new ClawclickConfig(deployer, deployer);
        console2.log("   Config:", address(config));

        // ============================================================================
        // STEP 2: Deploy Hook with CREATE2
        // ============================================================================
        console2.log("");
        console2.log("2/3 Deploying ClawclickHook (CREATE2)...");
        
        // Use a simple salt - we'll try a few until we get good flags
        bytes32 salt = bytes32(uint256(0x8df1));
        
        ClawclickHook hook = new ClawclickHook{salt: salt}(
            IPoolManager(POOL_MANAGER),
            config
        );
        
        console2.log("   Hook:", address(hook));
        console2.log("   Salt:", vm.toString(salt));

        // ============================================================================
        // STEP 3: Deploy Factory
        // ============================================================================
        console2.log("");
        console2.log("3/3 Deploying ClawclickFactory...");
        ClawclickFactory factory = new ClawclickFactory(
            config,
            IPoolManager(POOL_MANAGER),
            hook,
            POSITION_MANAGER,
            BootstrapETH(payable(address(0))),
            deployer
        );
        console2.log("   Factory:", address(factory));

        // ============================================================================
        // STEP 4: Wire everything together
        // ============================================================================
        console2.log("");
        console2.log("4/4 Wiring contracts...");
        config.setFactory(address(factory));
        console2.log("   Factory registered in Config");

        vm.stopBroadcast();

        // ============================================================================
        // DEPLOYMENT SUMMARY
        // ============================================================================
        console2.log("");
        console2.log("=== DEPLOYMENT COMPLETE ===");
        console2.log("");
        console2.log("Addresses:");
        console2.log("  CONFIG=", address(config));
        console2.log("  HOOK=", address(hook));
        console2.log("  FACTORY=", address(factory));
        console2.log("");
        console2.log("Copy to backend/.env:");
        console2.log("  FACTORY_ADDRESS=", address(factory));
        console2.log("  HOOK_ADDRESS=", address(hook));
        console2.log("  CONFIG_ADDRESS=", address(config));
    }
}
