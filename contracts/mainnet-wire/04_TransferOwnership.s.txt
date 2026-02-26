// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickConfig.sol";
import "../src/core/ClawclickFactory.sol";

/**
 * @title 04_TransferOwnership
 * @notice Transfer all ownership to SAFE multisig (FINAL STEP - IRREVERSIBLE)
 * 
 * @dev [EMOJI] THIS IS PERMANENT - NO GOING BACK [EMOJI]
 * 
 * WHAT IT DOES:
 * - Transfers Config ownership to SAFE
 * - Transfers Factory ownership to SAFE
 * - Deployer loses ALL admin access
 * - SAFE multisig gains full control
 * 
 * BEFORE RUNNING THIS:
 * [EMOJI] Verify all contracts on Basescan
 * [EMOJI] Test launching a token
 * [EMOJI] Test swaps work correctly
 * [EMOJI] Verify Factory is wired to Config
 * [EMOJI] Verify SAFE exemption is set
 * [EMOJI] Verify fees are collected correctly
 * [EMOJI] Verify ALL addresses are correct
 * [EMOJI] Have SAFE multisig ready to receive ownership
 * 
 * AFTER RUNNING THIS:
 * [EMOJI] Deployer has ZERO admin powers
 * [EMOJI] SAFE controls everything
 * [EMOJI] All config changes require 3-sig approval
 * [EMOJI] Ecosystem is fully decentralized
 * 
 * REQUIREMENTS:
 * - DEPLOYER_PRIVATE_KEY (must be current owner)
 * - CONFIG_ADDRESS (from deployment)
 * - FACTORY_ADDRESS (from deployment)
 * - SAFE_ADDRESS (0xFf7549B06E68186C91a6737bc0f0CDE1245e349b)
 * 
 * USAGE:
 * forge script mainnet-wire/04_TransferOwnership.s.sol \
 *   --rpc-url $BASE_MAINNET_RPC_URL \
 *   --broadcast \
 *   --legacy
 * 
 * [EMOJI] ONLY RUN AFTER THOROUGH TESTING
 * [EMOJI] VERIFY SAFE_ADDRESS IS CORRECT
 * [EMOJI] THIS CANNOT BE UNDONE
 */
contract TransferOwnership is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        address configAddress = vm.envAddress("CONFIG_ADDRESS");
        address factoryAddress = vm.envAddress("FACTORY_ADDRESS");
        address safeAddress = vm.envAddress("SAFE_ADDRESS");

        console2.log("=== TRANSFERRING OWNERSHIP TO SAFE ===");
        console2.log("Deployer (current owner):", deployer);
        console2.log("SAFE (new owner):", safeAddress);
        console2.log("");
        console2.log("[EMOJI]  WARNING: THIS IS IRREVERSIBLE  [EMOJI]");
        console2.log("");

        ClawclickConfig config = ClawclickConfig(configAddress);
        ClawclickFactory factory = ClawclickFactory(payable(factoryAddress));

        // Check current ownership
        console2.log("Current Ownership:");
        console2.log("  Config Owner:", config.owner());
        console2.log("  Factory Owner:", factory.owner());
        console2.log("  Config Treasury:", config.treasury());
        console2.log("");

        require(config.owner() == deployer, "Deployer is not Config owner");
        require(factory.owner() == deployer, "Deployer is not Factory owner");
        require(config.treasury() == safeAddress, "Treasury is not SAFE");

        // Final verification checks
        console2.log("[EMOJI] FINAL VERIFICATION CHECKLIST:");
        console2.log("");
        
        // Check 1: Factory is wired
        bool factoryWired = config.factory() == factoryAddress;
        console2.log("1. Factory wired to Config:", factoryWired ? "[EMOJI]" : "[EMOJI]");
        require(factoryWired, "Factory not wired! Run 01_WireFactory.s.sol first");
        
        // Check 2: SAFE has exemption
        // We can't check this from Factory, but we should have run 02_SetSafeExemption.s.sol
        console2.log("2. SAFE exemption (verify manually):", "[EMOJI]  Run 02_SetSafeExemption if not done");
        
        // Check 3: All addresses are correct
        console2.log("3. SAFE address verification:");
        console2.log("   Expected: 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b");
        console2.log("   Actual:  ", safeAddress);
        require(safeAddress == 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b, "SAFE address mismatch!");
        console2.log("   [EMOJI] Correct");
        
        console2.log("");
        console2.log("ALL CHECKS PASSED [EMOJI]");
        console2.log("");
        console2.log("Proceeding with ownership transfer...");
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Transfer Config ownership
        config.transferOwnership(safeAddress);
        
        // Transfer Factory ownership
        factory.transferOwnership(safeAddress);

        vm.stopBroadcast();

        console2.log("=== OWNERSHIP TRANSFERRED ===");
        console2.log("");
        console2.log("Verifying new ownership...");
        console2.log("Config Owner:", config.owner());
        console2.log("Factory Owner:", factory.owner());
        console2.log("");
        
        require(config.owner() == safeAddress, "Config ownership transfer failed");
        require(factory.owner() == safeAddress, "Factory ownership transfer failed");
        
        console2.log("[EMOJI] OWNERSHIP SUCCESSFULLY TRANSFERRED!");
        console2.log("");
        console2.log("[EMOJI] FINAL STATE:");
        console2.log("   Config Owner:", config.owner());
        console2.log("   Factory Owner:", factory.owner());
        console2.log("   Treasury:", config.treasury());
        console2.log("");
        console2.log("[EMOJI] ECOSYSTEM IS NOW FULLY DECENTRALIZED!");
        console2.log("[EMOJI] SAFE multisig has full control");
        console2.log("[EMOJI] Deployer has no admin powers");
        console2.log("");
        console2.log("[EMOJI] CLAW.CLICK IS LIVE ON MAINNET!");
    }
}
