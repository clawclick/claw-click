// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/utils/HookMiner.sol";
import "../src/core/ClawclickHook_V4.sol";
import "v4-core/src/libraries/Hooks.sol";

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

        // Foundry uses this CREATE2 deployer for {salt:} deployments
        address deployer = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
        address poolManager = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
        address config = vm.envAddress("CONFIG");

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
            beforeSwapReturnDelta: true,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });

        uint160 requiredFlags = encodePermissions(perms);

        console2.log("=== MINING PARAMETERS ===");
        console2.log("Deployer:", deployer);
        console2.log("PoolManager:", poolManager);
        console2.log("Config:", config);
        console2.log("Required Flags:", requiredFlags);
        console2.log("");

        (address predicted, bytes32 salt) = HookMiner.find(
            deployer,
            requiredFlags,
            type(ClawclickHook).creationCode,
            abi.encode(poolManager, config)
        );

        console2.log("=== HOOK SALT FOUND ===");
        console2.log("Predicted Address:", predicted);
        console2.logBytes32(salt);
        
        // Verify flag validation
        bool valid = (uint160(predicted) & requiredFlags) == requiredFlags;
        console2.log("Address Valid:", valid);
    }
}


// forge script script/02_MineHook.s.sol \
// --rpc-url $ALCHEMY_API_ETH_SEPOLIA
