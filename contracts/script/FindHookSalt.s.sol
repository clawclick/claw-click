// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/core/ClawclickConfig.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title FindHookSalt
 * @notice Find CREATE2 salt that produces hook address with correct permissions
 * @dev Hook address must have these bits set in last 14 bits:
 *      - Bit 1: afterInitialize (track pool creation)
 *      - Bit 3: afterAddLiquidity (position tracking)
 *      - Bit 5: afterRemoveLiquidity (position tracking)
 *      - Bit 6: beforeSwap (tax calculation)
 *      - Bit 7: afterSwap (fee collection)
 *      Total: 0b00000011101010 = 234 = 0x00EA
 */
contract FindHookSalt is Script {
    // Base mainnet
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant CONFIG = 0x95fC848677Bd29ad067688F64BE60d5C6C44c2a4;
    
    // Sepolia testnet
    address constant POOL_MANAGER_SEPOLIA = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant CONFIG_SEPOLIA = 0xf01514F68Df33689046F6Dd4184edCaA54fF4492;
    
    // Required permissions bitmask
    uint160 constant REQUIRED_PERMISSIONS = 234; // 0x00EA
    
    function run() external view {
        address deployer = msg.sender;
        
        console2.log("====================================");
        console2.log("FINDING HOOK SALT WITH CORRECT PERMISSIONS");
        console2.log("====================================");
        console2.log("Deployer:", deployer);
        console2.log("Required Permissions:", REQUIRED_PERMISSIONS);
        console2.log("Required Bitmask: 0b00000011101010");
        console2.log("");
        
        // Get hook creation code
        bytes memory creationCode = type(ClawclickHook).creationCode;
        bytes memory constructorArgs = abi.encode(IPoolManager(POOL_MANAGER), ClawclickConfig(CONFIG));
        bytes memory bytecode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 initCodeHash = keccak256(bytecode);
        
        console2.log("Init Code Hash:", vm.toString(initCodeHash));
        console2.log("");
        console2.log("Searching for salt...");
        console2.log("");
        
        // Search for salt
        for (uint256 salt = 0; salt < 100000; salt++) {
            address predicted = predictCreate2Address(deployer, salt, initCodeHash);
            uint160 addressInt = uint160(predicted);
            uint160 permissions = addressInt & 0x3FFF; // Last 14 bits
            
            if (permissions == REQUIRED_PERMISSIONS) {
                console2.log("====================================");
                console2.log("FOUND MATCHING SALT!");
                console2.log("====================================");
                console2.log("Salt:", salt);
                console2.log("Salt (hex):", vm.toString(bytes32(salt)));
                console2.log("Predicted Address:", predicted);
                console2.log("Permission Bits:", permissions);
                console2.log("====================================");
                console2.log("");
                console2.log("Deploy command:");
                console2.log("new ClawclickHook{salt: bytes32(uint256(", salt, "))}(poolManager, config);");
                console2.log("");
                break;
            }
            
            if (salt % 10000 == 0) {
                console2.log("Checked", salt, "salts...");
            }
        }
        
        console2.log("");
        console2.log("Sepolia search (different deployer/config):");
        console2.log("");
        
        bytes memory sepoliaConstructorArgs = abi.encode(IPoolManager(POOL_MANAGER_SEPOLIA), ClawclickConfig(CONFIG_SEPOLIA));
        bytes memory sepoliaBytecode = abi.encodePacked(creationCode, sepoliaConstructorArgs);
        bytes32 sepoliaInitCodeHash = keccak256(sepoliaBytecode);
        
        for (uint256 salt = 0; salt < 100000; salt++) {
            address predicted = predictCreate2Address(deployer, salt, sepoliaInitCodeHash);
            uint160 addressInt = uint160(predicted);
            uint160 permissions = addressInt & 0x3FFF;
            
            if (permissions == REQUIRED_PERMISSIONS) {
                console2.log("====================================");
                console2.log("FOUND MATCHING SALT (SEPOLIA)!");
                console2.log("====================================");
                console2.log("Salt:", salt);
                console2.log("Salt (hex):", vm.toString(bytes32(salt)));
                console2.log("Predicted Address:", predicted);
                console2.log("Permission Bits:", permissions);
                console2.log("====================================");
                break;
            }
            
            if (salt % 10000 == 0 && salt > 0) {
                console2.log("Checked", salt, "salts...");
            }
        }
    }
    
    function predictCreate2Address(
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
