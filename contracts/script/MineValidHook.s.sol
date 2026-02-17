// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import "../src/utils/CREATE2HookDeployer.sol";

contract MineValidHook is Script {
    function run() external {
        address poolManager = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
        address config = 0x4Db3e2D2448F23223317bc431172E7891Ea1D24D;
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
        
        CREATE2HookDeployer miner = new CREATE2HookDeployer();
        
        // Required permissions
        uint160 requiredFlags = 0;
        requiredFlags |= (1 << 0);  // beforeInitialize
        requiredFlags |= (1 << 2);  // beforeAddLiquidity
        requiredFlags |= (1 << 4);  // beforeRemoveLiquidity
        requiredFlags |= (1 << 6);  // beforeSwap
        requiredFlags |= (1 << 7);  // afterSwap
        requiredFlags |= (1 << 10); // beforeSwapReturnDelta
        
        console2.log("Mining for flags:", requiredFlags);
        console2.log("Required pattern: 0x__e_4_0... (approximately)");
        
        uint256 startSalt = 0xee40;
        for (uint256 i = 0; i < 10000; i++) {
            bytes32 salt = bytes32(startSalt + i);
            address predicted = miner.computeAddress(poolManager, config, salt, deployer);
            uint160 addr = uint160(predicted);
            
            if (Hooks.isValidHookAddress(IHooks(predicted), requiredFlags)) {
                console2.log("=== VALID HOOK FOUND ===");
                console2.log("Salt:", uint256(salt));
                console2.log("Address:", predicted);
                console2.log("Flags:", addr & 0xFFFF);
                break;
            }
            
            if (i % 100 == 0) {
                console2.log("Checked", i, "salts...");
            }
        }
    }
}
