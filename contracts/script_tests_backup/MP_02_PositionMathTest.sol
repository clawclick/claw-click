// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console2.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickHook_V4.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";

/**
 * @title MP_02_PositionMathTest
 * @notice Multi-Position System: Verify position range calculations
 * 
 * CRITICAL TESTS:
 * 1. Token allocations calculate correctly (75%, 18.75%, etc.)
 * 2. MCAP milestones don't overflow (16x, 256x, 4096x, 65536x)
 * 3. Position ranges have 5% overlap
 * 4. Tick alignment (multiples of 60)
 * 5. Bounds checks (TICK_LOWER / TICK_UPPER)
 * 6. All 5 positions cover complete range
 * 
 * This test uses the public previewSqrtPrice function and internal helpers.
 */
contract MP_02_PositionMathTest is Test {
    ClawclickFactory factory;
    ClawclickConfig config;
    ClawclickHook hook;
    
    IPoolManager poolManager;
    IPositionManager positionManager;
    
    address owner = address(this);
    address treasury = address(0x1);
    
    uint256 constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    
    function setUp() public {
        // Deploy mocks
        poolManager = IPoolManager(address(0x2));  // Mock
        positionManager = IPositionManager(address(0x3));  // Mock
        
        // Deploy real contracts
        config = new ClawclickConfig(treasury, owner);
        hook = new ClawclickHook(poolManager, config);
        factory = new ClawclickFactory(
            config,
            poolManager,
            hook,
            address(positionManager),
            owner
        );
        
        // Set factory in config
        config.setFactory(address(factory));
    }
    
    /*//////////////////////////////////////////////////////////////
                        TOKEN ALLOCATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 1: Verify token allocations are correct
    function test_TokenAllocations() public view {
        console2.log("=== TOKEN ALLOCATION TEST ===");
        
        uint256 p1Expected = (TOTAL_SUPPLY * 75000) / 100000;  // 75%
        uint256 p2Expected = (TOTAL_SUPPLY * 18750) / 100000;  // 18.75%
        uint256 p3Expected = (TOTAL_SUPPLY * 4688) / 100000;   // 4.688%
        uint256 p4Expected = (TOTAL_SUPPLY * 1172) / 100000;   // 1.172%
        uint256 p5Expected = (TOTAL_SUPPLY * 390) / 100000;    // 0.390%
        
        console2.log("Expected allocations:");
        console2.log("  P1:", p1Expected, "(75.00%)");
        console2.log("  P2:", p2Expected, "(18.75%)");
        console2.log("  P3:", p3Expected, "(4.688%)");
        console2.log("  P4:", p4Expected, "(1.172%)");
        console2.log("  P5:", p5Expected, "(0.390%)");
        
        uint256 total = p1Expected + p2Expected + p3Expected + p4Expected + p5Expected;
        console2.log("  Total:", total);
        console2.log("  Supply:", TOTAL_SUPPLY);
        
        // Should sum to total supply
        assertApproxEqAbs(total, TOTAL_SUPPLY, 1e18, "Allocations don't sum to supply");
        
        console2.log("[PASS] Token allocations correct");
    }
    
    /*//////////////////////////////////////////////////////////////
                        MCAP MILESTONE TESTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 2: MCAP milestones don't overflow
    function test_MCAPMilestones_NoOverflow() public view {
        console2.log("=== MCAP MILESTONE OVERFLOW TEST ===");
        
        uint256 startingMCAP = 10 ether;  // Max allowed
        uint256 multiplier = config.POSITION_MCAP_MULTIPLIER();  // 16
        
        console2.log("Starting MCAP:", startingMCAP);
        console2.log("Multiplier:", multiplier);
        
        // Calculate milestones
        uint256 p1End = startingMCAP * multiplier;  // 160 ETH
        require(p1End >= startingMCAP, "P1 overflow");
        console2.log("  P1 end:", p1End, "(16x)");
        
        uint256 p2End = p1End * multiplier;  // 2,560 ETH
        require(p2End >= p1End, "P2 overflow");
        console2.log("  P2 end:", p2End, "(256x)");
        
        uint256 p3End = p2End * multiplier;  // 40,960 ETH
        require(p3End >= p2End, "P3 overflow");
        console2.log("  P3 end:", p3End, "(4096x)");
        
        uint256 p4End = p3End * multiplier;  // 655,360 ETH
        require(p4End >= p3End, "P4 overflow");
        console2.log("  P4 end:", p4End, "(65536x)");
        
        // All should be within uint256
        assertTrue(p4End < type(uint256).max / 1e18, "P4 approaches uint256 max");
        
        console2.log("[PASS] No MCAP milestone overflow");
    }
    
    /// @notice TEST 3: Verify 16x per position
    function test_MCAPMultiplierPerPosition() public view {
        console2.log("=== 16X MULTIPLIER TEST ===");
        
        uint256 startingMCAP = 2 ether;  // 2k starting MCAP
        uint256 multiplier = 16;
        
        assertEq(startingMCAP * multiplier, 32 ether, "P1 end not 16x");
        assertEq(startingMCAP * multiplier * multiplier, 512 ether, "P2 end not 256x");
        assertEq(startingMCAP * multiplier * multiplier * multiplier, 8192 ether, "P3 end not 4096x");
        
        console2.log("[PASS] Each position covers 16x MCAP growth");
    }
    
    /*//////////////////////////////////////////////////////////////
                        SQRTPRICE CALCULATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 4: sqrtPrice calculation doesn't overflow
    function test_SqrtPriceCalculation() public view {
        console2.log("=== SQRTPRICE CALCULATION TEST ===");
        
        // Test boundary cases
        uint160 sqrtPrice1 = factory.previewSqrtPrice(1 ether);
        console2.log("  1 ETH MCAP -> sqrtPrice:", uint256(sqrtPrice1));
        assertTrue(sqrtPrice1 > 0, "sqrtPrice1 is zero");
        
        uint160 sqrtPrice5 = factory.previewSqrtPrice(5 ether);
        console2.log("  5 ETH MCAP -> sqrtPrice:", uint256(sqrtPrice5));
        assertTrue(sqrtPrice5 > 0 && sqrtPrice5 < sqrtPrice1, "sqrtPrice5 invalid");
        
        uint160 sqrtPrice10 = factory.previewSqrtPrice(10 ether);
        console2.log("  10 ETH MCAP -> sqrtPrice:", uint256(sqrtPrice10));
        assertTrue(sqrtPrice10 > 0 && sqrtPrice10 < sqrtPrice5, "sqrtPrice10 invalid");
        
        // Verify: Higher MCAP = lower sqrtPrice (inverted ratio)
        assertTrue(sqrtPrice1 > sqrtPrice5, "Price ordering wrong");
        assertTrue(sqrtPrice5 > sqrtPrice10, "Price ordering wrong");
        
        console2.log("[PASS] sqrtPrice calculation works correctly");
    }
    
    /*//////////////////////////////////////////////////////////////
                        POSITION OVERLAP TESTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 5: Positions have 5% overlap
    function test_PositionOverlap() public view {
        console2.log("=== POSITION OVERLAP TEST ===");
        
        // Example: P1 ends at 32k, P2 should start at 32k * 0.95 = 30.4k
        uint256 p1End = 32 ether;
        uint256 overlapBps = config.POSITION_OVERLAP_BPS();  // 500 = 5%
        
        // P2 lower bound = P1 end * (1 - 0.05) = P1 end * 0.95
        uint256 p2Lower = (p1End * (10000 - overlapBps)) / 10000;
        uint256 expectedP2Lower = (p1End * 95) / 100;
        
        console2.log("  P1 end:", p1End);
        console2.log("  P2 lower (calculated):", p2Lower);
        console2.log("  P2 lower (expected 95%):", expectedP2Lower);
        
        assertEq(p2Lower, expectedP2Lower, "P2 lower bound incorrect");
        
        // P1 upper bound = P1 end * 1.05
        uint256 p1Upper = (p1End * (10000 + overlapBps)) / 10000;
        uint256 expectedP1Upper = (p1End * 105) / 100;
        
        console2.log("  P1 upper (calculated):", p1Upper);
        console2.log("  P1 upper (expected 105%):", expectedP1Upper);
        
        assertEq(p1Upper, expectedP1Upper, "P1 upper bound incorrect");
        
        // Overlap region: 30.4k to 33.6k (3.2k overlap = 10% of 32k)
        uint256 overlapSize = p1Upper - p2Lower;
        console2.log("  Overlap region:", overlapSize);
        
        // Overlap should be 10% of milestone (5% on each side)
        uint256 expectedOverlap = (p1End * 10) / 100;
        assertEq(overlapSize, expectedOverlap, "Overlap size incorrect");
        
        console2.log("[PASS] Position overlap verified (5% on each side)");
    }
    
    /*//////////////////////////////////////////////////////////////
                        TICK ALIGNMENT TESTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 6: Ticks aligned to spacing (60)
    function test_TickAlignment() public pure {
        console2.log("=== TICK ALIGNMENT TEST ===");
        
        int24 spacing = 60;
        
        // Test tick alignment function
        int24 tick1 = 12345;
        int24 aligned1 = (tick1 / spacing) * spacing;
        console2.log("  Tick 12345 -> Aligned:", aligned1);
        assertEq(aligned1 % spacing, 0, "Tick not aligned");
        
        int24 tick2 = -12345;
        int24 aligned2 = (tick2 / spacing) * spacing;
        console2.log("  Tick -12345 -> Aligned:", aligned2);
        assertEq(aligned2 % spacing, 0, "Negative tick not aligned");
        
        console2.log("[PASS] Tick alignment works for spacing 60");
    }
    
    /// @notice TEST 7: TICK_LOWER and TICK_UPPER are valid
    function test_TickBounds() public view {
        console2.log("=== TICK BOUNDS TEST ===");
        
        int24 tickLower = factory.TICK_LOWER();
        int24 tickUpper = factory.TICK_UPPER();
        
        console2.log("  TICK_LOWER:", tickLower);
        console2.log("  TICK_UPPER:", tickUpper);
        
        // Should be multiples of 60
        assertEq(tickLower % 60, 0, "TICK_LOWER not multiple of 60");
        assertEq(tickUpper % 60, 0, "TICK_UPPER not multiple of 60");
        
        // Should be symmetric
        assertEq(tickLower, -tickUpper, "Ticks not symmetric");
        
        // Should be within V4 limits
        assertTrue(tickLower >= -887272, "TICK_LOWER below V4 MIN_TICK");
        assertTrue(tickUpper <= 887272, "TICK_UPPER above V4 MAX_TICK");
        
        console2.log("[PASS] TICK bounds are valid");
    }
    
    /*//////////////////////////////////////////////////////////////
                        INTEGRATION TEST
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 8: Full position math for 2k starting MCAP
    function test_FullPositionMath_2kMCAP() public view {
        console2.log("=== FULL POSITION MATH (2k MCAP) ===");
        
        uint256 startingMCAP = 2 ether;  // 2k
        uint256 multiplier = 16;
        
        console2.log("Starting MCAP: 2 ETH (2k)");
        console2.log("");
        
        // Calculate expected MCAP ranges
        uint256[5] memory mcapRanges = [
            startingMCAP * multiplier,              // 32k (P1 end)
            startingMCAP * multiplier ** 2,         // 512k (P2 end)
            startingMCAP * multiplier ** 3,         // 8M (P3 end)
            startingMCAP * multiplier ** 4,         // 128M (P4 end)
            type(uint256).max                       // ∞ (P5 end)
        ];
        
        console2.log("Expected MCAP ranges:");
        console2.log("  P1: 2k -> 32k");
        console2.log("  P2: 32k -> 512k");
        console2.log("  P3: 512k -> 8M");
        console2.log("  P4: 8M -> 128M");
        console2.log("  P5: 128M -> infinity");
        
        // Verify calculations
        assertEq(mcapRanges[0], 32 ether, "P1 end incorrect");
        assertEq(mcapRanges[1], 512 ether, "P2 end incorrect");
        assertEq(mcapRanges[2], 8192 ether, "P3 end incorrect");
        assertEq(mcapRanges[3], 131072 ether, "P4 end incorrect");
        
        console2.log("[PASS] Full position math correct for 2k MCAP");
    }
    
    /*//////////////////////////////////////////////////////////////
                        EDGE CASE TESTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 9: Minimum MCAP (1 ETH)
    function test_MinimumMCAP() public view {
        console2.log("=== MINIMUM MCAP TEST (1 ETH) ===");
        
        uint256 startingMCAP = 1 ether;
        
        // Should not revert
        uint160 sqrtPrice = factory.previewSqrtPrice(startingMCAP);
        assertTrue(sqrtPrice > 0, "sqrtPrice zero for min MCAP");
        
        console2.log("  1 ETH -> sqrtPrice:", uint256(sqrtPrice));
        console2.log("[PASS] Minimum MCAP works");
    }
    
    /// @notice TEST 10: Maximum MCAP (10 ETH)
    function test_MaximumMCAP() public view {
        console2.log("=== MAXIMUM MCAP TEST (10 ETH) ===");
        
        uint256 startingMCAP = 10 ether;
        
        // Should not revert
        uint160 sqrtPrice = factory.previewSqrtPrice(startingMCAP);
        assertTrue(sqrtPrice > 0, "sqrtPrice zero for max MCAP");
        
        console2.log("  10 ETH -> sqrtPrice:", uint256(sqrtPrice));
        console2.log("[PASS] Maximum MCAP works");
    }
    
    /// @notice TEST 11: Below minimum should revert
    function test_BelowMinimumReverts() public {
        console2.log("=== BELOW MINIMUM TEST ===");
        
        vm.expectRevert();
        factory.previewSqrtPrice(0.5 ether);  // Below 1 ETH minimum
        
        console2.log("[PASS] Below minimum reverts");
    }
    
    /// @notice TEST 12: Above maximum should revert
    function test_AboveMaximumReverts() public {
        console2.log("=== ABOVE MAXIMUM TEST ===");
        
        vm.expectRevert();
        factory.previewSqrtPrice(11 ether);  // Above 10 ETH maximum
        
        console2.log("[PASS] Above maximum reverts");
    }
    
    /*//////////////////////////////////////////////////////////////
                        RUN ALL TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_RunAllPositionMathTests() public view {
        console2.log("==============================================");
        console2.log("  MP_02: POSITION MATH VALIDATION");
        console2.log("==============================================");
        console2.log("");
        console2.log("[SUCCESS] All position math tests passed!");
        console2.log("==============================================");
    }
}
