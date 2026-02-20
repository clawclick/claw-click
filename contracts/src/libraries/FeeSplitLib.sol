// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FeeSplitLib
 * @notice Library for fee split validation (extracted from Factory to reduce bytecode)
 */
library FeeSplitLib {
    uint256 constant BPS = 10000;
    
    struct FeeSplit {
        address[5] wallets;
        uint16[5] percentages;
        uint8 count;
    }
    
    error InvalidFeeSplit();
    error ZeroAddressInSplit();
    
    /**
     * @notice Validates fee split configuration
     * @param wallets Array of wallet addresses
     * @param percentages Array of percentages in BPS
     * @param count Number of active wallets
     */
    function validate(
        address[5] calldata wallets,
        uint16[5] calldata percentages,
        uint8 count
    ) internal pure {
        if (count > 5) revert InvalidFeeSplit();
        
        if (count > 0) {
            uint256 totalPercentage;
            for (uint8 i = 0; i < count; i++) {
                if (wallets[i] == address(0)) revert ZeroAddressInSplit();
                totalPercentage += percentages[i];
            }
            if (totalPercentage != BPS) revert InvalidFeeSplit();
        }
    }
}
