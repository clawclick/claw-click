// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PositionLib
 * @notice Library for position calculation logic (extracted from Factory to reduce bytecode)
 */
library PositionLib {
    uint256 constant BPS = 10000;
    
    // Position allocation percentages (basis points)
    uint256 constant POSITION_1_ALLOCATION_BPS = 1250;  // 12.5%
    uint256 constant POSITION_2_ALLOCATION_BPS = 4700;  // 47%
    uint256 constant POSITION_3_ALLOCATION_BPS = 1900;  // 19%
    uint256 constant POSITION_4_ALLOCATION_BPS = 1180;  // 11.8%
    uint256 constant POSITION_5_ALLOCATION_BPS = 970;   // 9.7%
    
    // Position overlap percentage
    uint256 constant POSITION_OVERLAP_BPS = 500; // 5% overlap between ranges
    
    /**
     * @notice Calculates position ranges and allocations
     * @param startingMcap The starting market cap
     * @param totalSupply The total token supply
     * @return tickLowers Array of lower ticks for each position
     * @return tickUppers Array of upper ticks for each position
     * @return allocations Array of token allocations for each position
     */
    function calculatePositionRanges(
        uint256 startingMcap,
        uint256 totalSupply
    ) internal pure returns (
        int24[5] memory tickLowers,
        int24[5] memory tickUppers,
        uint256[5] memory allocations
    ) {
        // Calculate allocations
        allocations[0] = (totalSupply * POSITION_1_ALLOCATION_BPS) / BPS;
        allocations[1] = (totalSupply * POSITION_2_ALLOCATION_BPS) / BPS;
        allocations[2] = (totalSupply * POSITION_3_ALLOCATION_BPS) / BPS;
        allocations[3] = (totalSupply * POSITION_4_ALLOCATION_BPS) / BPS;
        allocations[4] = (totalSupply * POSITION_5_ALLOCATION_BPS) / BPS;
        
        // For now, use full range for all positions
        // TODO: Implement graduated ranges based on MCAP
        for (uint256 i = 0; i < 5; i++) {
            tickLowers[i] = -887220; // Full range lower
            tickUppers[i] = 887220;  // Full range upper
        }
        
        return (tickLowers, tickUppers, allocations);
    }
}
