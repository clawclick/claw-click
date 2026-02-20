// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickHook_V4.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/utils/BootstrapETH.sol";
import "../../src/utils/HookMiner.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";

/**
 * @title DeployProduction
 * @notice Production deployment script for Sepolia
 * @dev Deploys: Config → Hook (CREATE2) → Factory → BootstrapETH
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
        console2.log("1/4 Deploying ClawclickConfig...");
        ClawclickConfig config = new ClawclickConfig();
        console2.log("   Config deployed at:", address(config));

        // ============================================================================
        // STEP 2: Mine and Deploy Hook (CREATE2)
        // ============================================================================
        console2.log("");
        console2.log("2/4 Mining Hook address with correct flags...");
        
        // Required hook flags
        uint160 flags = uint160(
            Hooks.BEFORE_INITIALIZE_FLAG |
            Hooks.BEFORE_ADD_LIQUIDITY_FLAG |
            Hooks.BEFORE_REMOVE_LIQUIDITY_FLAG |
            Hooks.BEFORE_SWAP_FLAG |
            Hooks.AFTER_SWAP_FLAG |
            Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG
        );
        
        console2.log("   Required flags:", flags);
        console2.log("   Mining CREATE2 salt (this may take a minute)...");
        
        bytes memory hookCreationCode = abi.encodePacked(
            type(ClawclickHook).creationCode,
            abi.encode(IPoolManager(POOL_MANAGER), config)
        );
        
        (address hookAddress, bytes32 salt) = HookMiner.find(
            address(this),
            flags,
            hookCreationCode,
            1000000 // Max iterations
        );
        
        console2.log("   Found salt:", vm.toString(salt));
        console2.log("   Hook will deploy to:", hookAddress);
        
        ClawclickHook hook = new ClawclickHook{salt: salt}(
            IPoolManager(POOL_MANAGER),
            config
        );
        
        require(address(hook) == hookAddress, "Hook address mismatch!");
        console2.log("   Hook deployed at:", address(hook));

        // ============================================================================
        // STEP 3: Deploy Factory
        // ============================================================================
        console2.log("");
        console2.log("3/4 Deploying ClawclickFactory...");
        ClawclickFactory factory = new ClawclickFactory(
            config,
            IPoolManager(POOL_MANAGER),
            hook,
            POSITION_MANAGER,
            BootstrapETH(payable(address(0))), // No bootstrap for now
            deployer
        );
        console2.log("   Factory deployed at:", address(factory));

        // ============================================================================
        // STEP 4: Wire Contracts Together
        // ============================================================================
        console2.log("");
        console2.log("4/4 Wiring contracts together...");
        config.setFactory(address(factory));
        console2.log("   Factory registered in Config");

        vm.stopBroadcast();

        // ============================================================================
        // DEPLOYMENT SUMMARY
        // ============================================================================
        console2.log("");
        console2.log("=== DEPLOYMENT COMPLETE ===");
        console2.log("");
        console2.log("📋 Contract Addresses:");
        console2.log("   Config:", address(config));
        console2.log("   Hook:", address(hook));
        console2.log("   Factory:", address(factory));
        console2.log("   PoolManager:", POOL_MANAGER);
        console2.log("   PositionManager:", POSITION_MANAGER);
        console2.log("");
        console2.log("✅ Save these addresses to backend/.env:");
        console2.log("   FACTORY_ADDRESS=", address(factory));
        console2.log("   HOOK_ADDRESS=", address(hook));
        console2.log("   CONFIG_ADDRESS=", address(config));
        console2.log("");
        console2.log("🔍 Verify contracts:");
        console2.log("   forge verify-contract", address(config), "src/core/ClawclickConfig.sol:ClawclickConfig --chain sepolia");
        console2.log("   forge verify-contract", address(hook), "src/core/ClawclickHook_V4.sol:ClawclickHook --chain sepolia");
        console2.log("   forge verify-contract", address(factory), "src/core/ClawclickFactory.sol:ClawclickFactory --chain sepolia");
    }
}
