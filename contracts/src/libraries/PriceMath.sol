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
     * @dev Matches original factory logic:
     *      P1: startMCAP → 16x (epochs 1-4, hook tax phase)
     *      P2: 16x → 256x (graduation, LP fee active)
     *      P3: 256x → 4,096x
     *      P4: 4,096x → 65,536x
     *      P5: 65,536x → infinity
     *      Token allocations: geometric decay (75%, 18.75%, 4.6875%, 1.1719%, 0.3906%)
     *      5% overlap between adjacent positions
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
        // Token allocations (geometric decay, EXTENDED_BPS = 100000)
        uint256 EXTENDED_BPS = 100000;
        allocations[0] = (totalSupply * 75000) / EXTENDED_BPS;   // 75.0000%
        allocations[1] = (totalSupply * 18750) / EXTENDED_BPS;   // 18.7500%
        allocations[2] = (totalSupply * 4688) / EXTENDED_BPS;    // 4.6875%
        allocations[3] = (totalSupply * 1172) / EXTENDED_BPS;    // 1.1719%
        allocations[4] = (totalSupply * 390) / EXTENDED_BPS;     // 0.3906%

        // MCAP milestones (16x per step): 16x, 256x, 4096x, 65536x
        uint256 multiplier = 16;
        uint256 p1End = targetMcapETH * multiplier;
        uint256 p2End = p1End * multiplier;
        uint256 p3End = p2End * multiplier;
        uint256 p4End = p3End * multiplier;

        uint256[5] memory mcapMilestones = [
            p1End,              // P1 end: 16x
            p2End,              // P2 end: 256x
            p3End,              // P3 end: 4096x
            p4End,              // P4 end: 65536x
            type(uint256).max   // P5 end: infinity
        ];

        uint256 BPS = 10000;
        uint256 overlapBps = 500; // 5% overlap

        int24 TICK_LOWER = -887220;
        int24 TICK_UPPER = 887220;
        int24 spacing = 60;

        // Calculate tick ranges with 5% overlap
        for (uint256 i = 0; i < 5; i++) {
            if (i == 0) {
                // P1: starts at initial MCAP
                tickLowers[i] = _mcapToTick(targetMcapETH, totalSupply);
            } else {
                // P2-P5: start 5% before previous end (overlap)
                uint256 lowerMCAP = (mcapMilestones[i-1] * (BPS - overlapBps)) / BPS;
                tickLowers[i] = _mcapToTick(lowerMCAP, totalSupply);
            }

            if (i == 4) {
                // P5: ends at infinity MCAP → lowest possible tick
                tickUppers[i] = TICK_LOWER;
            } else {
                // P1-P4: end 5% after milestone (overlap)
                uint256 upperMCAP = (mcapMilestones[i] * (BPS + overlapBps)) / BPS;
                tickUppers[i] = _mcapToTick(upperMCAP, totalSupply);
            }

            // Ensure tick spacing alignment
            tickLowers[i] = (tickLowers[i] / spacing) * spacing;
            tickUppers[i] = (tickUppers[i] / spacing) * spacing;

            // Bounds check
            if (tickLowers[i] < TICK_LOWER) tickLowers[i] = TICK_LOWER;
            if (tickUppers[i] > TICK_UPPER) tickUppers[i] = TICK_UPPER;

            // FIX: For ETH(currency0)/Token(currency1) pairs, higher MCAP → lower tick.
            // _mcapToTick(lowerMCAP) returns a HIGHER tick than _mcapToTick(higherMCAP),
            // so tickLowers and tickUppers end up inverted. Swap to ensure tickLower < tickUpper.
            if (tickLowers[i] > tickUppers[i]) {
                int24 temp = tickLowers[i];
                tickLowers[i] = tickUppers[i];
                tickUppers[i] = temp;
            }
        }

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
