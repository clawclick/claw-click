// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/utils/BootstrapETH.sol";
import "../src/core/ClawclickFactory.sol";

/**
 * @title 04_DeployBootstrapETH
 * @notice Deploy BootstrapETH funding contract (Step 4 of mainnet deployment)
 * 
 * @dev IMPORTANT: Must be deployed BEFORE Factory
 * 
 * WHAT IT DOES:
 * - Calculates predicted Factory address using CREATE2
 * - Deploys BootstrapETH with predicted Factory address
 * - Factory will be deployed at this exact address in Step 5
 * 
 * REQUIREMENTS:
 * - DEPLOYER_PRIVATE_KEY
 * - CONFIG_ADDRESS (from Step 1)
 * - HOOK_ADDRESS (from Step 3)
 * - POOL_MANAGER_ADDRESS
 * - POSITION_MANAGER_ADDRESS
 * - FACTORY_SALT (set in .env - any bytes32 value, e.g., 0x0000...0001)
 * 
 * USAGE:
 * forge script mainnet-deploy/04_DeployBootstrapETH.s.sol \
 *   --rpc-url $BASE_MAINNET_RPC_URL \
 *   --broadcast \
 *   --verify \
 *   --legacy
 * 
 * OUTPUT:
 * - BOOTSTRAP_ETH_ADDRESS (save this)
 * - Predicted FACTORY_ADDRESS (verify Step 5 matches this)
 */
contract DeployBootstrapETH is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Get all addresses needed for Factory prediction
        address config = vm.envAddress("CONFIG_ADDRESS");
        address hook = vm.envAddress("HOOK_ADDRESS");
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        address positionManager = vm.envAddress("POSITION_MANAGER_ADDRESS");
        bytes32 factorySalt = vm.envBytes32("FACTORY_SALT");

        console2.log("=== PREDICTING FACTORY ADDRESS ===");
        console2.log("Deployer:", deployer);
        console2.log("Factory Salt:");
        console2.logBytes32(factorySalt);
        console2.log("");

        // Predict Factory address using CREATE2
        // Factory constructor params: (config, poolManager, hook, positionManager, bootstrapETH, owner)
        // We'll use address(this) as placeholder for bootstrapETH in prediction
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
        
        console2.log("Predicted Factory Address:", predictedFactory);
        console2.log("");
        console2.log("⚠️  IMPORTANT: Step 5 MUST use this exact salt!");
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy BootstrapETH with predicted Factory address
        BootstrapETH bootstrapETH = new BootstrapETH(predictedFactory);

        vm.stopBroadcast();

        console2.log("=== BOOTSTRAP ETH DEPLOYED ===");
        console2.log("BootstrapETH Address:", address(bootstrapETH));
        console2.log("");
        console2.log("Verifying configuration...");
        console2.log("Factory (predicted):", bootstrapETH.factory());
        console2.log("Daily Limit:", bootstrapETH.DAILY_LAUNCH_LIMIT());
        console2.log("Current Balance:", bootstrapETH.getBalance());
        console2.log("");
        console2.log("✅ BootstrapETH deployed!");
        console2.log("✅ Save BOOTSTRAP_ETH_ADDRESS:");
        console2.log(address(bootstrapETH));
        console2.log("");
        console2.log("✅ Verify FACTORY_ADDRESS in Step 5 matches:");
        console2.log(predictedFactory);
    }
}
