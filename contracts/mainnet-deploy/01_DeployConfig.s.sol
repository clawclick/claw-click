// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickConfig.sol";

/**
 * @title 01_DeployConfig
 * @notice Deploy ClawclickConfig contract (Step 1 of mainnet deployment)
 * 
 * @dev This is the FIRST deployment step
 * 
 * WHAT IT DOES:
 * - Deploys ClawclickConfig with SAFE as treasury and deployer as temporary owner
 * - Sets all platform constants (bootstrap, epochs, multipliers)
 * - Owner will be transferred to SAFE after wiring is complete
 * 
 * REQUIREMENTS:
 * - DEPLOYER_PRIVATE_KEY set in environment
 * - SAFE_ADDRESS set in environment (0xFf7549B06E68186C91a6737bc0f0CDE1245e349b)
 * 
 * USAGE:
 * forge script mainnet-deploy/01_DeployConfig.s.sol \
 *   --rpc-url $BASE_MAINNET_RPC_URL \
 *   --broadcast \
 *   --verify \
 *   --legacy
 * 
 * OUTPUT:
 * - CONFIG_ADDRESS (save this for next steps)
 */
contract DeployConfig is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address safe = vm.envAddress("SAFE_ADDRESS");

        console2.log("=== DEPLOYING CONFIG ===");
        console2.log("Deployer:", deployer);
        console2.log("Treasury (SAFE):", safe);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Config with SAFE as treasury, deployer as temporary owner
        ClawclickConfig config = new ClawclickConfig(
            safe,      // treasury (platform fees go here)
            deployer   // owner (temporary - will transfer to SAFE after wiring)
        );

        vm.stopBroadcast();

        console2.log("=== CONFIG DEPLOYED ===");
        console2.log("Config Address:", address(config));
        console2.log("");
        console2.log("Treasury:", config.treasury());
        console2.log("Owner:", config.owner());
        console2.log("Min Bootstrap:", config.MIN_BOOTSTRAP_ETH());
        console2.log("Position Multiplier:", config.POSITION_MCAP_MULTIPLIER());
        console2.log("");
        console2.log("[OK] Save CONFIG_ADDRESS for next steps:");
        console2.log(address(config));
    }
}
