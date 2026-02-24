// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickHook_V4.sol";

/**
 * @title 02_SetSafeExemption
 * @notice Set SAFE treasury as globally exempt (Step 2 of mainnet wiring)
 * 
 * @dev CRITICAL: Needed for $CLAWS deployment (15% transfer to SAFE)
 * 
 * WHAT IT DOES:
 * - Calls Hook.setGlobalExemption(SAFE_ADDRESS, true)
 * - SAFE becomes PERMANENTLY exempt from ALL taxes and limits
 * - Applies across ALL tokens (current and future)
 * - Cannot be reversed once set
 * 
 * REQUIREMENTS:
 * - DEPLOYER_PRIVATE_KEY (must be Hook owner or factory)
 * - HOOK_ADDRESS (from deployment)
 * - SAFE_ADDRESS (0xFf7549B06E68186C91a6737bc0f0CDE1245e349b)
 * 
 * USAGE:
 * forge script mainnet-wire/02_SetSafeExemption.s.sol \
 *   --rpc-url $BASE_MAINNET_RPC_URL \
 *   --broadcast \
 *   --legacy
 */
contract SetSafeExemption is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        address hookAddress = vm.envAddress("HOOK_ADDRESS");
        address safeAddress = vm.envAddress("SAFE_ADDRESS");

        console2.log("=== SETTING SAFE GLOBAL EXEMPTION ===");
        console2.log("Deployer:", deployer);
        console2.log("Hook:", hookAddress);
        console2.log("SAFE:", safeAddress);
        console2.log("");

        ClawclickHook hook = ClawclickHook(payable(hookAddress));

        // Check current state
        console2.log("Current Exemption Status:");
        console2.log("  SAFE exempt:", hook.globalExemptions(safeAddress));
        console2.log("");

        if (hook.globalExemptions(safeAddress)) {
            console2.log("⚠️  SAFE is already exempt!");
            console2.log("✅ No action needed");
            return;
        }

        vm.startBroadcast(deployerPrivateKey);

        // Set SAFE as globally exempt (permanent)
        hook.setGlobalExemption(safeAddress, true);

        vm.stopBroadcast();

        console2.log("=== SAFE EXEMPTION SET ===");
        console2.log("");
        console2.log("Verifying...");
        console2.log("Hook.globalExemptions(SAFE):", hook.globalExemptions(safeAddress));
        
        require(hook.globalExemptions(safeAddress), "SAFE exemption not set correctly");
        
        console2.log("");
        console2.log("✅ SAFE successfully exempted!");
        console2.log("✅ SAFE can now:");
        console2.log("   - Hold any token amount (no maxWallet)");
        console2.log("   - Transfer any amount (no maxTx)");
        console2.log("   - Trade without taxes (0% fee)");
        console2.log("   - Works across ALL tokens");
        console2.log("");
        console2.log("⚠️  IMPORTANT: This exemption is PERMANENT and cannot be removed");
    }
}
