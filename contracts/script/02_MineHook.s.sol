// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/utils/HookMiner.sol";
import "../src/core/ClawclickHook_V4.sol";
import "v4-core/src/libraries/Hooks.sol";
import "v4-core/src/interfaces/IPoolManager.sol";
import "../src/core/ClawclickConfig.sol";

contract MineHook is Script {

    function encodePermissions(Hooks.Permissions memory perms) internal pure returns (uint160) {
        return uint160(
            (perms.beforeInitialize ? 1 << 159 : 0) |
            (perms.afterInitialize ? 1 << 158 : 0) |
            (perms.beforeAddLiquidity ? 1 << 157 : 0) |
            (perms.afterAddLiquidity ? 1 << 156 : 0) |
            (perms.beforeRemoveLiquidity ? 1 << 155 : 0) |
            (perms.afterRemoveLiquidity ? 1 << 154 : 0) |
            (perms.beforeSwap ? 1 << 153 : 0) |
            (perms.afterSwap ? 1 << 152 : 0) |
            (perms.beforeDonate ? 1 << 151 : 0) |
            (perms.afterDonate ? 1 << 150 : 0) |
            (perms.beforeSwapReturnDelta ? 1 << 149 : 0) |
            (perms.afterSwapReturnDelta ? 1 << 148 : 0) |
            (perms.afterAddLiquidityReturnDelta ? 1 << 147 : 0) |
            (perms.afterRemoveLiquidityReturnDelta ? 1 << 146 : 0)
        );
    }

    function run() external view {

        address deployer = vm.envAddress("DEPLOYER");
        address poolManager = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
        address config = vm.envAddress("CONFIG");

        // Define permissions inline to avoid address(0) casting issue
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

        (address predicted, bytes32 salt) = HookMiner.find(
            deployer,
            requiredFlags,
            type(ClawclickHook).creationCode,
            abi.encode(poolManager, config)
        );

        console2.log("=== HOOK SALT FOUND ===");
        console2.log("Predicted Address:", predicted);
        console2.logBytes32(salt);
    }
}