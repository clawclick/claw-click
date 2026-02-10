// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Hooks} from "v4-core/src/libraries/Hooks.sol";

/**
 * @title HookMiner
 * @notice Utility to find CREATE2 salts for valid hook addresses
 * @dev Based on Uniswap V4 hook address validation rules
 * 
 * ⚠️ WARNING: OFF-CHAIN ONLY ⚠️
 * 
 * ✅ FIX #14: This library is for OFF-CHAIN use ONLY
 * 
 * DO NOT call from on-chain contracts:
 *   - Uses unbounded loops (10M iterations)
 *   - Will run out of gas
 *   - Should be used in scripts/tests only
 * 
 * Proper usage:
 *   1. Run offline in a Foundry script
 *   2. Pre-compute the salt
 *   3. Hardcode salt in deployment script
 */
library HookMiner {
    /**
     * @notice Mines a salt that produces a hook address with the required permissions
     * @dev OFF-CHAIN ONLY - DO NOT CALL FROM CONTRACTS
     * @param deployer The address that will deploy the hook
     * @param flags The required hook permission flags
     * @param creationCode The contract creation bytecode
     * @param constructorArgs The ABI-encoded constructor arguments
     * @return hookAddress The computed hook address
     * @return salt The CREATE2 salt that produces the valid address
     */
    function find(
        address deployer,
        uint160 flags,
        bytes memory creationCode,
        bytes memory constructorArgs
    ) internal view returns (address hookAddress, bytes32 salt) {
        // Combine creation code and constructor args
        bytes memory initCode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 initCodeHash = keccak256(initCode);
        
        // Try different salts until we find a valid hook address
        // Exact match is rare - need large search space
        for (uint256 i = 0; i < 10_000_000; i++) {
            salt = bytes32(i);
            
            // Compute CREATE2 address
            hookAddress = computeCreate2Address(deployer, salt, initCodeHash);
            
            // Check if address satisfies required flags
            if (isValidHookAddress(hookAddress, flags)) {
                return (hookAddress, salt);
            }
        }
        
        revert("HookMiner: Failed to find valid salt");
    }
    
    /**
     * @notice Computes the CREATE2 address
     * @param deployer The deployer address
     * @param salt The CREATE2 salt
     * @param initCodeHash The keccak256 hash of the init code
     * @return The computed CREATE2 address
     */
    function computeCreate2Address(
        address deployer,
        bytes32 salt,
        bytes32 initCodeHash
    ) internal pure returns (address) {
        return address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            bytes1(0xff),
                            deployer,
                            salt,
                            initCodeHash
                        )
                    )
                )
            )
        );
    }
    
    /**
     * @notice Validates if a hook address satisfies the required permission flags
     * @param hookAddress The hook address to validate
     * @param requiredFlags The required permission flags
     * @return true if the address is valid
     */
    function isValidHookAddress(address hookAddress, uint160 requiredFlags) internal pure returns (bool) {
        // Extract the permission bits from the address (bottom 15 bits)
        uint160 addressFlags = uint160(hookAddress) & uint160(0x7FFF);
        
        // Flags must match EXACTLY (not just contain required flags)
        return addressFlags == requiredFlags;
    }
}
