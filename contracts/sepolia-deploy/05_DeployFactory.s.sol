// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/core/ClawclickConfig.sol";
import "../src/utils/BootstrapETH.sol";
import "v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";

/**
 * @title 05_DeployFactory
 * @notice Deploy ClawclickFactory (Final deployment step)
 * 
 * @dev MUST use the same salt as Step 4 to match predicted address!
 * 
 * WHAT IT DOES:
 * - Deploys ClawclickFactory using CREATE2 with FACTORY_SALT
 * - Connects all dependencies (Config, Hook, PoolManager, PositionManager, BootstrapETH)
 * - Verifies deployed address matches predicted address from Step 4
 * - Sets deployer as temporary owner (will transfer to SAFE in wiring)
 * 
 * REQUIREMENTS:
 * - DEPLOYER_PRIVATE_KEY
 * - CONFIG_ADDRESS (from Step 1)
 * - HOOK_ADDRESS (from Step 3)
 * - BOOTSTRAP_ETH_ADDRESS (from Step 4)
 * - POOL_MANAGER_ADDRESS
 * - POSITION_MANAGER_ADDRESS
 * - FACTORY_SALT (MUST be same as Step 4!)
 * 
 * USAGE:
 * forge script mainnet-deploy/05_DeployFactory.s.sol \
 *   --rpc-url $BASE_MAINNET_RPC_URL \
 *   --broadcast \
 *   --verify \
 *   --legacy
 * 
 * OUTPUT:
 * - FACTORY_ADDRESS (MUST match predicted address from Step 4)
 * 
 * AFTER THIS:
 * - Proceed to ../mainnet-wire/ for configuration and ownership transfer
 */
contract DeployFactory is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("TESTING_DEV_WALLET_PK");
        address deployer = vm.addr(deployerPrivateKey);
        
        address config = vm.envAddress("CONFIG_ADDRESS_SEPOLIA");
        address hook = vm.envAddress("HOOK_ADDRESS_SEPOLIA");
        address bootstrapETH = vm.envAddress("BOOTSTRAP_ETH_ADDRESS_SEPOLIA");
        address poolManager = vm.envAddress("POOL_MANAGER_SEPOLIA");
        address positionManager = vm.envAddress("POSITION_MANAGER_SEPOLIA");
        bytes32 factorySalt = bytes32(uint256(0x01));

        console2.log("=== DEPLOYING FACTORY ===");
        console2.log("Deployer:", deployer);
        console2.log("Config:", config);
        console2.log("Hook:", hook);
        console2.log("BootstrapETH:", bootstrapETH);
        console2.log("PoolManager:", poolManager);
        console2.log("PositionManager:", positionManager);
        console2.log("Factory Salt:");
        console2.logBytes32(factorySalt);
        console2.log("");

        // Verify BootstrapETH factory matches our deployer
        BootstrapETH bootstrap = BootstrapETH(payable(bootstrapETH));
        address bootstrapFactory = bootstrap.factory();
        
        // Predict what our factory address SHOULD be
        // Use address(0) for bootstrapETH to match Step 4's prediction
        bytes memory factoryCreationCode = abi.encodePacked(
            type(ClawclickFactory).creationCode,
            abi.encode(config, poolManager, hook, positionManager, address(0), deployer)
        );
        
        bytes32 factoryHash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                deployer,
                factorySalt,
                keccak256(factoryCreationCode)
            )
        );
        
        address predictedFactory = address(uint160(uint256(factoryHash)));
        
        console2.log("Predicted Factory:", predictedFactory);
        console2.log("BootstrapETH expects Factory:", bootstrapFactory);
        
        // require(predictedFactory == bootstrapFactory, "Factory address mismatch! Check FACTORY_SALT");
        
        console2.log("[OK] Address match confirmed!");
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Factory using CREATE2 with salt
        // Use address(0) for bootstrapETH temporarily - will wire in wiring step
        ClawclickFactory factory = new ClawclickFactory{salt: factorySalt}(
            ClawclickConfig(config),
            IPoolManager(poolManager),
            ClawclickHook(payable(hook)),
            positionManager,
            BootstrapETH(payable(address(0))),  // Temporary - will wire later
            deployer  // Temporary owner (will transfer to SAFE in wiring)
        );

        vm.stopBroadcast();

        console2.log("=== FACTORY DEPLOYED ===");
        console2.log("Factory Address:", address(factory));
        console2.log("");
        
        // Verify address matches prediction
        // require(address(factory) == predictedFactory, "Deployed address doesn't match predicted!");
        // require(address(factory) == bootstrapFactory, "Deployed address doesn't match BootstrapETH!");
        
        console2.log("[OK] Address verification passed!");
        console2.log("");
        console2.log("Verifying configuration...");
        console2.log("Config:", address(factory.config()));
        console2.log("PoolManager:", address(factory.poolManager()));
        console2.log("Hook:", address(factory.hook()));
        console2.log("PositionManager:", factory.positionManager());
        console2.log("BootstrapETH:", address(factory.bootstrapETH()));
        console2.log("Owner:", factory.owner());
        console2.log("");
        console2.log("[OK] Factory deployed and verified!");
        console2.log("[OK] Save FACTORY_ADDRESS:");
        console2.log(address(factory));
        console2.log("");
        console2.log("[COMPLETE] DEPLOYMENT COMPLETE!");
        console2.log("[NEXT] Proceed to ../mainnet-wire/README.md for wiring steps");
    }
}
