// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {ClawclickHook} from "../src/core/ClawclickHook.sol";
import {ClawclickConfig} from "../src/core/ClawclickConfig.sol";

/**
 * @title Find EOA Salt
 * @notice Find CREATE2 salt for deploying hook from EOA
 */
contract FindEOASalt is Script {
    address constant POOL_MANAGER = 0xC36e6A145A1eF688068E30877B19b857BeB9E450;
    address constant DEPLOYER_EOA = 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7;
    address constant CONFIG_ADDR = 0x9f50856a06d9fdADCdd8f800CcfbEeA2d080834E;
    uint160 constant REQUIRED_FLAGS = 10952;
    
    function run() external view {
        console.log("Finding salt for EOA deployment...");
        console.log("Deployer EOA: %s", DEPLOYER_EOA);
        console.log("Config: %s", CONFIG_ADDR);
        console.log("Required flags: %s", REQUIRED_FLAGS);
        console.log("");
        
        bytes memory creationCode = type(ClawclickHook).creationCode;
        bytes memory constructorArgs = abi.encode(IPoolManager(POOL_MANAGER), ClawclickConfig(CONFIG_ADDR));
        bytes memory initCode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 initCodeHash = keccak256(initCode);
        
        console.log("Searching in batches of 10k...");
        
        for (uint256 batch = 0; batch < 100; batch++) {
            uint256 start = batch * 10000;
            uint256 end = start + 10000;
            
            for (uint256 i = start; i < end; i++) {
                bytes32 salt = bytes32(i);
                
                address predicted = address(
                    uint160(
                        uint256(
                            keccak256(
                                abi.encodePacked(
                                    bytes1(0xff),
                                    DEPLOYER_EOA,
                                    salt,
                                    initCodeHash
                                )
                            )
                        )
                    )
                );
                
                uint160 flags = uint160(predicted) & 0x7FFF;
                
                if (flags == REQUIRED_FLAGS) {
                    console.log("");
                    console.log("FOUND!");
                    console.log("  Salt: %s", uint256(salt));
                    console.log("  Address: %s", predicted);
                    console.log("  Flags: %s", flags);
                    return;
                }
            }
            
            if (batch % 10 == 0) {
                console.log("  Checked %s...", end);
            }
        }
        
        console.log("");
        console.log("Not found in first 1M. Need more iterations.");
    }
}
