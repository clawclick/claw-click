// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ClawclickToken} from "../core/ClawclickToken.sol";

/**
 * @title LaunchLib
 * @notice Library for token launch logic (extracted from Factory to reduce bytecode)
 */
library LaunchLib {
    uint256 constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    
    /**
     * @notice Deploys a new ClawclickToken
     * @param name Token name
     * @param symbol Token symbol
     * @param hook Hook address
     * @param beneficiary Token beneficiary
     * @param agentWallet Agent wallet address
     * @return token The deployed token address
     */
    function deployToken(
        string calldata name,
        string calldata symbol,
        address hook,
        address beneficiary,
        address agentWallet
    ) internal returns (address token) {
        token = address(new ClawclickToken(
            name,
            symbol,
            hook,
            beneficiary,
            agentWallet
        ));
    }
    
    /**
     * @notice Calculates sqrtPriceX96 from target market cap
     * @param targetMcapETH Target market cap in ETH
     * @return sqrtPriceX96 The sqrt price in Q64.96 format
     */
    function calculateSqrtPrice(uint256 targetMcapETH) internal pure returns (uint160 sqrtPriceX96) {
        // price = targetMcap / totalSupply
        // sqrtPrice = sqrt(price) * 2^96
        // Calculation done in steps to avoid overflow
        
        uint256 price = (targetMcapETH * 1e18) / TOTAL_SUPPLY;
        
        // Calculate sqrt(price) using Babylonian method
        uint256 z = (price + 1) / 2;
        uint256 y = price;
        while (z < y) {
            y = z;
            z = (price / z + z) / 2;
        }
        
        // Convert to Q64.96 format
        // sqrtPriceX96 = sqrt(price) * 2^96
        // Since price has 18 decimals, sqrt(price) has 9 decimals
        // We need to adjust: sqrt(price) * 2^96 / 1e9
        sqrtPriceX96 = uint160((y * (1 << 96)) / 1e9);
        
        require(sqrtPriceX96 > 0, "Invalid sqrt price");
    }
}
