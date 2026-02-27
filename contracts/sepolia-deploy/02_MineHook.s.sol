// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/utils/HookMiner.sol";
import "../src/core/ClawclickHook_V4.sol";
import "v4-core/src/libraries/Hooks.sol";

/**
 * @title 02_MineHook
 * @notice Mine valid hook address salt (Step 2 of mainnet deployment)
 * 
 * @dev This is a VIEW-ONLY operation (no broadcasting)
 * 
 * WHAT IT DOES:
 * - Finds a CREATE2 salt that produces a hook address with correct permission bits
 * - Uses Foundry's CREATE2 deployer (0x4e59b44847b379578588920cA78FbF26c0B4956C)
 * - Validates permission flags match ClawclickHook requirements
 * 
 * REQUIREMENTS:
 * - CONFIG_ADDRESS from Step 1
 * - POOL_MANAGER_ADDRESS (Base mainnet Uniswap V4 PoolManager)
 * 
 * USAGE:
 * forge script mainnet-deploy/02_MineHook.s.sol \
 *   --rpc-url $BASE_MAINNET_RPC_URL
 * 
 * OUTPUT:
 * - HOOK_SALT (bytes32) - Save this to .env for Step 3
 * - Predicted hook address
 * 
 * NOTE: This can take 30-120 seconds to find a valid salt
 */
contract MineHook is Script {

    function encodePermissions(Hooks.Permissions memory perms) internal pure returns (uint160) {
        // Uniswap v4 encodes permissions in BOTTOM 14 bits (bits 0-13)
        return uint160(
            (perms.beforeInitialize ? 1 << 13 : 0) |
            (perms.afterInitialize ? 1 << 12 : 0) |
            (perms.beforeAddLiquidity ? 1 << 11 : 0) |
            (perms.afterAddLiquidity ? 1 << 10 : 0) |
            (perms.beforeRemoveLiquidity ? 1 << 9 : 0) |
            (perms.afterRemoveLiquidity ? 1 << 8 : 0) |
            (perms.beforeSwap ? 1 << 7 : 0) |
            (perms.afterSwap ? 1 << 6 : 0) |
            (perms.beforeDonate ? 1 << 5 : 0) |
            (perms.afterDonate ? 1 << 4 : 0) |
            (perms.beforeSwapReturnDelta ? 1 << 3 : 0) |
            (perms.afterSwapReturnDelta ? 1 << 2 : 0) |
            (perms.afterAddLiquidityReturnDelta ? 1 << 1 : 0) |
            (perms.afterRemoveLiquidityReturnDelta ? 1 << 0 : 0)
        );
    }

    function run() external view {
        // Foundry's CREATE2 deployer (same on all chains)
        address deployer = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
        
        // Base mainnet addresses
        address poolManager = vm.envAddress("POOL_MANAGER_SEPOLIA");
        address config = vm.envAddress("CONFIG_ADDRESS_SEPOLIA");

        console2.log("=== MINING HOOK ADDRESS ===");
        console2.log("CREATE2 Deployer:", deployer);
        console2.log("PoolManager:", poolManager);
        console2.log("Config:", config);
        console2.log("");

        // ClawclickHook permissions (from ClawclickHook_V4.sol::getHookPermissions)
        Hooks.Permissions memory perms = Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true,   // ✅ Hook takes fees via BeforeSwapDelta
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });

        uint160 requiredFlags = encodePermissions(perms);

        console2.log("Required Permission Flags:", requiredFlags);
        console2.log("");
        console2.log("Mining... (this may take 30-120 seconds)");
        console2.log("");

        // Mine for valid salt
        (address predicted, bytes32 salt) = HookMiner.find(
            deployer,
            requiredFlags,
            type(ClawclickHook).creationCode,
            abi.encode(poolManager, config)
        );

        console2.log("=== HOOK SALT FOUND ===");
        console2.log("Predicted Hook Address:", predicted);
        console2.log("");
        console2.log("Salt (bytes32):");
        console2.logBytes32(salt);
        console2.log("");
        
        // Verify flag validation
        bool valid = (uint160(predicted) & requiredFlags) == requiredFlags;
        console2.log("Permission Flags Valid:", valid);
        
        require(valid, "Mined address does not match required flags");
        
        console2.log("");
        console2.log("[OK] Save HOOK_SALT to .env:");
        console2.log("HOOK_SALT=");
        console2.logBytes32(salt);
    }
}
