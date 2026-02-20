// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {FullMath} from "v4-core/src/libraries/FullMath.sol";
import {FixedPoint96} from "v4-core/src/libraries/FixedPoint96.sol";

/**
 * @title PriceMath
 * @notice External library for MCAP-based pricing calculations
 * @dev Extracted from ClawclickFactory to reduce contract size
 */
library PriceMath {
    /// @notice Minimum target MCAP (1 ETH)
    uint256 public constant MIN_TARGET_MCAP = 1 ether;
    
    /// @notice Maximum target MCAP (10 ETH)
    uint256 public constant MAX_TARGET_MCAP = 10 ether;

    error InvalidTargetMcap();
    error SqrtPriceOverflow();

    /**
     * @notice Calculate sqrtPriceX96 from target MCAP using exact Q64.96 math
     * @dev sqrtPriceX96 = sqrt(totalSupply / targetMcap) * 2^96
     * @param targetMcapETH Target market cap in ETH (1-10 ETH)
     * @param totalSupply Total token supply
     * @return sqrtPriceX96 The sqrt price in Q64.96 format
     */
    function calculateSqrtPrice(uint256 targetMcapETH, uint256 totalSupply) 
        external 
        pure 
        returns (uint160 sqrtPriceX96) 
    {
        if (targetMcapETH < MIN_TARGET_MCAP || targetMcapETH > MAX_TARGET_MCAP) {
            revert InvalidTargetMcap();
        }
        
        // Calculate ratio = totalSupply / targetMcap (price inverted for token/ETH)
        // Use FullMath.mulDiv for precision: ratio * 2^96
        uint256 ratioX96 = FullMath.mulDiv(totalSupply, FixedPoint96.Q96, targetMcapETH);
        
        // Take square root of (ratio * 2^96)
        // Result is sqrt(ratio) * 2^48
        uint256 sqrtRatioX48 = _sqrt(ratioX96);
        
        // Final sqrtPrice = sqrtRatio * 2^48
        // sqrtRatioX48 is already sqrt(ratio) * 2^48
        // So we multiply by 2^48 again
        sqrtPriceX96 = uint160((sqrtRatioX48 * (1 << 48)) / (1 << 0));
        
        if (sqrtPriceX96 == 0) revert SqrtPriceOverflow();
        
        return sqrtPriceX96;
    }

    /**
     * @notice Calculate position ranges and token allocations for 5-position strategy
     * @param targetMcapETH Initial target market cap
     * @param totalSupply Total token supply
     * @return tickLowers Array of lower ticks for each position
     * @return tickUppers Array of upper ticks for each position
     * @return allocations Array of token amounts for each position
     */
    function calculatePositionRanges(
        uint256 targetMcapETH,
        uint256 totalSupply
    ) external pure returns (
        int24[5] memory tickLowers,
        int24[5] memory tickUppers,
        uint256[5] memory allocations
    ) {
        // Position 1: Full range (spans current price, gets bootstrap ETH)
        tickLowers[0] = -887220;
        tickUppers[0] = 887220;
        allocations[0] = totalSupply * 20 / 100; // 20%
        
        // Positions 2-5: Staggered ranges below current tick (token-only, one-sided)
        // As MCAP increases, price moves UP through these ranges, making tokens tradeable
        
        // P2: 1x-2x MCAP range
        uint256 mcap2x = targetMcapETH * 2;
        tickLowers[1] = _mcapToTick(targetMcapETH, totalSupply);
        tickUppers[1] = _mcapToTick(mcap2x, totalSupply);
        allocations[1] = totalSupply * 20 / 100; // 20%
        
        // P3: 2x-4x MCAP range
        uint256 mcap4x = targetMcapETH * 4;
        tickLowers[2] = _mcapToTick(mcap2x, totalSupply);
        tickUppers[2] = _mcapToTick(mcap4x, totalSupply);
        allocations[2] = totalSupply * 20 / 100; // 20%
        
        // P4: 4x-8x MCAP range
        uint256 mcap8x = targetMcapETH * 8;
        tickLowers[3] = _mcapToTick(mcap4x, totalSupply);
        tickUppers[3] = _mcapToTick(mcap8x, totalSupply);
        allocations[3] = totalSupply * 20 / 100; // 20%
        
        // P5: 8x-16x MCAP range
        uint256 mcap16x = targetMcapETH * 16;
        tickLowers[4] = _mcapToTick(mcap8x, totalSupply);
        tickUppers[4] = _mcapToTick(mcap16x, totalSupply);
        allocations[4] = totalSupply * 20 / 100; // 20%
        
        return (tickLowers, tickUppers, allocations);
    }

    /**
     * @notice Convert MCAP to tick (inverse of price → tick conversion)
     * @dev tick = log_1.0001(sqrt(token/ETH)) = log_1.0001(sqrt(supply/mcap))
     * @param mcap Market cap in ETH
     * @param totalSupply Total token supply
     * @return tick The tick value
     */
    function _mcapToTick(
        uint256 mcap,
        uint256 totalSupply
    ) internal pure returns (int24 tick) {
        // Calculate sqrtPrice for this MCAP
        uint256 ratioX96 = FullMath.mulDiv(totalSupply, FixedPoint96.Q96, mcap);
        uint256 sqrtRatioX48 = _sqrt(ratioX96);
        uint160 sqrtPriceX96 = uint160((sqrtRatioX48 * (1 << 48)) / (1 << 0));
        
        // Convert sqrtPrice to tick
        tick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);
        
        // Round to nearest valid tick (tickSpacing = 60)
        int24 remainder = tick % 60;
        if (remainder != 0) {
            if (remainder > 30) {
                tick = tick + (60 - remainder);
            } else {
                tick = tick - remainder;
            }
        }
        
        return tick;
    }

    /**
     * @notice Integer square root using Newton-Raphson method
     * @dev Gas-optimized sqrt for Q96 fixed-point numbers
     * @param x Input value
     * @return y Square root of x
     */
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        
        uint256 z = (x + 1) / 2;
        y = x;
        
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
        
        return y;
    }
}
