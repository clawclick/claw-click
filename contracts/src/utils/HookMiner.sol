// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title HookMiner
 * @notice Finds CREATE2 salts for hook addresses with required permission bits
 * @dev OFF-CHAIN ONLY - uses unbounded loops
 *
 * IMPORTANT:
 * Uniswap v4 validates hooks using:
 *
 *   if ((uint160(hookAddress) & requiredFlags) != requiredFlags) revert;
 *
 * Therefore:
 *   A valid hook address must satisfy:
 *
 *   (uint160(address) & requiredFlags) == requiredFlags
 *
 * We DO NOT mask bottom 14 bits.
 * We DO NOT require exact equality.
 * We ONLY require required bits to be set.
 */
library HookMiner {
    /**
     * @notice Mines a salt that produces a hook address with required permission bits
     * @param deployer The CREATE2 deployer address
     * @param requiredFlags The required permission flags bitmap
     * @param creationCode The contract creation bytecode
     * @param constructorArgs ABI-encoded constructor arguments
     * @return hookAddress The valid hook address found
     * @return salt The CREATE2 salt that produces this address
     */
    function find(
        address deployer,
        uint160 requiredFlags,
        bytes memory creationCode,
        bytes memory constructorArgs
    ) internal view returns (address hookAddress, bytes32 salt) {
        bytes memory initCode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 initCodeHash = keccak256(initCode);

        // 2^14 space = 16384 possibilities
        // Searching 1M for better coverage
        for (uint256 i = 0; i < 1_000_000; i++) {
            salt = bytes32(i);
            hookAddress = computeCreate2Address(deployer, salt, initCodeHash);

            if (isValidHookAddress(hookAddress, requiredFlags)) {
                return (hookAddress, salt);
            }
        }

        revert("HookMiner: No valid salt found");
    }

    /**
     * @notice Validates hook address against required permission flags
     * @dev Must match Uniswap v4 PoolManager logic exactly
     */
    function isValidHookAddress(
        address hookAddress,
        uint160 requiredFlags
    ) internal pure returns (bool) {
        // REQUIRED: All required bits must be present
        return (uint160(hookAddress) & requiredFlags) == requiredFlags;
    }

    /**
     * @notice Computes CREATE2 address
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
}