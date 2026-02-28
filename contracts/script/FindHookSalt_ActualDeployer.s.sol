// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {ClawclickHook} from "../src/core/ClawclickHook_V4.sol";
import {ClawclickConfig} from "../src/core/ClawclickConfig.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

/**
 * Find salt for ACTUAL deployer address: 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7
 */
contract FindHookSalt_ActualDeployer is Script {
    address constant DEPLOYER = 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7;
    
    // Sepolia
    address constant POOL_MANAGER_SEPOLIA = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant CONFIG_SEPOLIA = 0xf01514F68Df33689046F6Dd4184edCaA54fF4492;
    
    // Base
    address constant POOL_MANAGER_BASE = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant CONFIG_BASE = 0x95fC848677Bd29ad067688F64BE60d5C6C44c2a4;
    
    uint160 constant REQUIRED_PERMISSIONS = 234;
    
    function run() external view {
        console2.log("Finding salt for deployer:", DEPLOYER);
        console2.log("");
        
        // Sepolia
        console2.log("=== SEPOLIA ===");
        bytes memory sepoliaCode = type(ClawclickHook).creationCode;
        bytes memory sepoliaArgs = abi.encode(IPoolManager(POOL_MANAGER_SEPOLIA), ClawclickConfig(CONFIG_SEPOLIA));
        bytes32 sepoliaInitHash = keccak256(abi.encodePacked(sepoliaCode, sepoliaArgs));
        
        for (uint256 salt = 0; salt < 100000; salt++) {
            address predicted = predictCreate2(DEPLOYER, salt, sepoliaInitHash);
            uint160 permissions = uint160(predicted) & 0x3FFF;
            
            if (permissions == REQUIRED_PERMISSIONS) {
                console2.log("FOUND!");
                console2.log("Salt:", salt);
                console2.log("Address:", predicted);
                console2.log("Permissions:", permissions);
                console2.log("");
                break;
            }
        }
        
        // Base
        console2.log("=== BASE ===");
        bytes memory baseCode = type(ClawclickHook).creationCode;
        bytes memory baseArgs = abi.encode(IPoolManager(POOL_MANAGER_BASE), ClawclickConfig(CONFIG_BASE));
        bytes32 baseInitHash = keccak256(abi.encodePacked(baseCode, baseArgs));
        
        for (uint256 salt = 0; salt < 100000; salt++) {
            address predicted = predictCreate2(DEPLOYER, salt, baseInitHash);
            uint160 permissions = uint160(predicted) & 0x3FFF;
            
            if (permissions == REQUIRED_PERMISSIONS) {
                console2.log("FOUND!");
                console2.log("Salt:", salt);
                console2.log("Address:", predicted);
                console2.log("Permissions:", permissions);
                break;
            }
        }
    }
    
    function predictCreate2(
        address deployer,
        uint256 salt,
        bytes32 initCodeHash
    ) internal pure returns (address) {
        return address(uint160(uint256(keccak256(abi.encodePacked(
            bytes1(0xff),
            deployer,
            bytes32(salt),
            initCodeHash
        )))));
    }
}
