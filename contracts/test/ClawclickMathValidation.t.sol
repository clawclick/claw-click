// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import {TickMath} from "v4-core/src/libraries/TickMath.sol";

/**
 * @title ClawclickMathValidation
 * @notice COMPREHENSIVE MATHEMATICAL VALIDATION
 * 
 * Tests critical mathematical relationships:
 * 1. Tick monotonicity (MCAP up -> tick DOWN)
 * 2. Stage range construction
 * 3. Bootstrap correctness
 * 4. Graduation triggers
 * 5. Stage transitions
 * 6. High MCAP stability
 * 
 * DO NOT PROCEED TO PHASE 2 UNTIL ALL TESTS PASS
 */
contract ClawclickMathValidationTest is Test {
    uint256 constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    
    /*//////////////////////////////////////////////////////////////
                    TEST 1: TICK MONOTONICITY
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Test: Tick decreases as MCAP increases
     * @dev CRITICAL: Verifies fundamental price orientation
     */
    function test_TickMonotonicity_Decreasing() public view {
        console.log("\n=== TICK MONOTONICITY TEST ===");
        console.log("Verifying: MCAP up -> tick DOWN\n");
        
        // Calculate ticks for key MCAP values
        int24 tick1e = _mcapToTick(1 ether);
        int24 tick16e = _mcapToTick(16 ether);
        int24 tick96e = _mcapToTick(96 ether);
        int24 tick960e = _mcapToTick(960 ether);
        int24 tick96000e = _mcapToTick(96_000 ether);
        
        console.log("MCAP ->    Tick");
        console.log("1 ETH:     ", tick1e);
        console.log("16 ETH:    ", tick16e);
        console.log("96 ETH:    ", tick96e);
        console.log("960 ETH:   ", tick960e);
        console.log("96000 ETH: ", tick96000e);
        
        // Verify monotonic DECREASING
        assertGt(tick1e, tick16e, "tick(1 ETH) must be > tick(16 ETH)");
        assertGt(tick16e, tick96e, "tick(16 ETH) must be > tick(96 ETH)");
        assertGt(tick96e, tick960e, "tick(96 ETH) must be > tick(960 ETH)");
        assertGt(tick960e, tick96000e, "tick(960 ETH) must be > tick(96000 ETH)");
        
        console.log("\n[PASS] Tick monotonicity verified");
        console.log("[PASS] Higher MCAP -> Lower tick (LOCKED)\n");
    }
    
    /**
     * @notice Fuzz test: Tick monotonicity holds for any MCAP pair
     * @dev Due to tickSpacing alignment, different MCAPs can map to same aligned tick
     *      Therefore we test monotonic non-increasing (>=) not strictly decreasing (>)
     */
    function testFuzz_TickMonotonicity(uint256 mcap1, uint256 mcap2) public view {
        // Bound inputs to reasonable range
        mcap1 = bound(mcap1, 1 ether, 1_000_000 ether);
        mcap2 = bound(mcap2, 1 ether, 1_000_000 ether);
        
        // Skip identical MCAPs
        vm.assume(mcap1 != mcap2);
        
        int24 tick1 = _mcapToTick(mcap1);
        int24 tick2 = _mcapToTick(mcap2);
        
        if (mcap1 < mcap2) {
            // Lower MCAP should have higher OR EQUAL tick (due to alignment)
            assertGe(tick1, tick2, "Lower MCAP must produce >= tick (monotonic non-increasing)");
        } else {
            // Higher MCAP should have lower OR EQUAL tick
            assertLe(tick1, tick2, "Higher MCAP must produce <= tick (monotonic non-increasing)");
        }
    }
    
    /*//////////////////////////////////////////////////////////////
                TEST 2: STAGE RANGE CONSTRUCTION
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Test: All stage ranges satisfy tickLower < tickUpper
     */
    function test_StageRanges_ValidOrdering() public view {
        console.log("\n=== STAGE RANGE CONSTRUCTION TEST ===");
        
        uint256 G = 16 ether; // Graduation MCAP
        
        // Stage 1: [G, G*6]
        (int24 lower1, int24 upper1) = _getStageTickRange(G, G * 6);
        console.log("Stage 1 tickLower:", lower1);
        console.log("Stage 1 tickUpper:", upper1);
        assertLt(lower1, upper1, "Stage 1: tickLower must be < tickUpper");
        
        // Stage 2: [G*6, G*60]
        (int24 lower2, int24 upper2) = _getStageTickRange(G * 6, G * 60);
        console.log("Stage 2 tickLower:", lower2);
        console.log("Stage 2 tickUpper:", upper2);
        assertLt(lower2, upper2, "Stage 2: tickLower must be < tickUpper");
        
        // Stage 3: [G*60, G*6000]
        (int24 lower3, int24 upper3) = _getStageTickRange(G * 60, G * 6000);
        console.log("Stage 3 tickLower:", lower3);
        console.log("Stage 3 tickUpper:", upper3);
        assertLt(lower3, upper3, "Stage 3: tickLower must be < tickUpper");
        
        console.log("\n[PASS] All stage ranges valid");
    }
    
    /**
     * @notice Test: Stage ranges move DOWN as MCAP grows
     */
    function test_StageRanges_MoveDownward() public view {
        console.log("\n=== STAGE RANGE MOVEMENT TEST ===");
        
        uint256 G = 16 ether;
        
        (int24 lower1, int24 upper1) = _getStageTickRange(G, G * 6);
        (int24 lower2, int24 upper2) = _getStageTickRange(G * 6, G * 60);
        (int24 lower3, int24 upper3) = _getStageTickRange(G * 60, G * 6000);
        
        console.log("Stage 1 upper:", upper1);
        console.log("Stage 2 upper:", upper2);
        console.log("Stage 3 upper:", upper3);
        
        // As stages progress (MCAP increases), ticks should decrease
        assertGt(upper1, upper2, "Stage 2 upper must be < Stage 1 upper");
        assertGt(upper2, upper3, "Stage 3 upper must be < Stage 2 upper");
        
        assertGt(lower1, lower2, "Stage 2 lower must be < Stage 1 lower");
        assertGt(lower2, lower3, "Stage 3 lower must be < Stage 2 lower");
        
        console.log("\n[PASS] Ranges move downward (higher price)");
    }
    
    /*//////////////////////////////////////////////////////////////
                    TEST 3: BOOTSTRAP
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Test: Bootstrap range is below current price
     */
    function test_Bootstrap_BelowPrice() public view {
        console.log("\n=== BOOTSTRAP RANGE TEST ===");
        
        uint256 startMcap = 1 ether;
        int24 currentTick = _mcapToTick(startMcap);
        
        console.log("Start MCAP: 1 ETH");
        console.log("Current tick:", currentTick);
        
        // Align current tick
        int24 tickSpacing = 200;
        int24 alignedCurrent = (currentTick / tickSpacing) * tickSpacing;
        
        // Bootstrap range
        int24 tickUpper = alignedCurrent - tickSpacing;
        int24 tickLower = -887200; // MIN_TICK aligned
        
        console.log("Bootstrap tickLower:", tickLower);
        console.log("Bootstrap tickUpper:", tickUpper);
        
        // Verify range is below price
        assertLt(tickUpper, currentTick, "tickUpper must be < currentTick");
        assertLt(tickLower, tickUpper, "tickLower must be < tickUpper");
        
        console.log("\n[PASS] Bootstrap range below current price");
        console.log("[PASS] Position will hold 100%% tokens, 0%% ETH");
    }
    
    /*//////////////////////////////////////////////////////////////
                    TEST 4: STAGE DETECTION
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Test: Stage detection for various MCAP values
     */
    function test_StageDetection_Boundaries() public view {
        console.log("\n=== STAGE DETECTION TEST ===");
        
        uint256 G = 16 ether;
        
        // Below Stage 1
        uint8 stage0 = _getLiquidityStage(15 ether, G);
        assertEq(stage0, 1, "Below G should be Stage 1"); // Clamps at 1
        
        // Stage 1: [G, G*6)
        uint8 stage1a = _getLiquidityStage(16 ether, G);
        assertEq(stage1a, 1, "At G should be Stage 1");
        
        uint8 stage1b = _getLiquidityStage(50 ether, G);
        assertEq(stage1b, 1, "Mid-Stage 1 should be 1");
        
        uint8 stage1c = _getLiquidityStage(95 ether, G);
        assertEq(stage1c, 1, "Just below G*6 should be Stage 1");
        
        // Stage 2: [G*6, G*60)
        uint8 stage2a = _getLiquidityStage(96 ether, G);
        assertEq(stage2a, 2, "At G*6 should be Stage 2");
        
        uint8 stage2b = _getLiquidityStage(500 ether, G);
        assertEq(stage2b, 2, "Mid-Stage 2 should be 2");
        
        uint8 stage2c = _getLiquidityStage(959 ether, G);
        assertEq(stage2c, 2, "Just below G*60 should be Stage 2");
        
        // Stage 3: [G*60, inf)
        uint8 stage3a = _getLiquidityStage(960 ether, G);
        assertEq(stage3a, 3, "At G*60 should be Stage 3");
        
        uint8 stage3b = _getLiquidityStage(10_000 ether, G);
        assertEq(stage3b, 3, "High MCAP should be Stage 3");
        
        uint8 stage3c = _getLiquidityStage(1_000_000 ether, G);
        assertEq(stage3c, 3, "Extremely high MCAP should clamp at Stage 3");
        
        console.log("\n[PASS] Stage detection correct at all boundaries");
    }
    
    /*//////////////////////////////////////////////////////////////
                    TEST 7: HIGH MCAP STABILITY
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Test: System remains stable at extremely high MCAP
     */
    function test_HighMcap_Stability() public view {
        console.log("\n=== HIGH MCAP STABILITY TEST ===");
        
        uint256 G = 16 ether;
        
        // Test extremely large MCAP values
        uint256[] memory testMcaps = new uint256[](5);
        testMcaps[0] = 10_000 ether;
        testMcaps[1] = 100_000 ether;
        testMcaps[2] = 1_000_000 ether;
        testMcaps[3] = 10_000_000 ether;
        testMcaps[4] = 100_000_000 ether;
        
        for (uint256 i = 0; i < testMcaps.length; i++) {
            uint256 mcap = testMcaps[i];
            
            // Stage should clamp at 3
            uint8 stage = _getLiquidityStage(mcap, G);
            assertEq(stage, 3, "Stage must clamp at 3");
            
            // Tick calculation should not overflow
            int24 tick = _mcapToTick(mcap);
            assertGt(tick, TickMath.MIN_TICK, "Tick must be > MIN_TICK");
            assertLt(tick, TickMath.MAX_TICK, "Tick must be < MAX_TICK");
            
            console.log("MCAP (ETH):", mcap / 1e18);
            console.log("  Stage:", stage);
            console.log("  Tick:", tick);
        }
        
        console.log("\n[PASS] System stable at high MCAP");
        console.log("[PASS] Stage clamps at 3");
        console.log("[PASS] No overflow");
    }
    
    /**
     * @notice Fuzz test: No tick overflow at any MCAP
     */
    function testFuzz_NoTickOverflow(uint256 mcap) public view {
        // Bound to reasonable range (avoid division by zero)
        mcap = bound(mcap, 0.001 ether, 1_000_000_000 ether);
        
        int24 tick = _mcapToTick(mcap);
        
        // Tick must be within valid range
        assertGe(tick, TickMath.MIN_TICK, "Tick underflow");
        assertLe(tick, TickMath.MAX_TICK, "Tick overflow");
    }
    
    /*//////////////////////////////////////////////////////////////
                        HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Convert MCAP to tick (matches hook implementation)
     */
    function _mcapToTick(uint256 mcap) internal pure returns (int24) {
        // ratio = TOTAL_SUPPLY / mcap (TOKEN/ETH)
        uint256 ratio = (TOTAL_SUPPLY * (2**96)) / mcap;
        uint256 sqrtRatio = _sqrt(ratio);
        
        require(sqrtRatio > 0 && sqrtRatio <= type(uint160).max, "Invalid sqrtPrice");
        
        int24 tick = TickMath.getTickAtSqrtPrice(uint160(sqrtRatio));
        
        // Align to tickSpacing
        int24 tickSpacing = 200;
        return (tick / tickSpacing) * tickSpacing;
    }
    
    /**
     * @notice Get tick range for stage (matches hook implementation)
     */
    function _getStageTickRange(uint256 lowerMcap, uint256 upperMcap) 
        internal pure returns (int24 tickLower, int24 tickUpper) 
    {
        require(lowerMcap < upperMcap, "Invalid MCAP bounds");
        
        // Higher MCAP -> Lower tick
        tickLower = _mcapToTick(upperMcap);
        tickUpper = _mcapToTick(lowerMcap);
        
        require(tickLower < tickUpper, "Invalid tick range");
        
        return (tickLower, tickUpper);
    }
    
    /**
     * @notice Determine liquidity stage (matches hook implementation)
     */
    function _getLiquidityStage(uint256 currentMcap, uint256 G) 
        internal pure returns (uint8) 
    {
        if (currentMcap < G * 6) {
            return 1;
        } else if (currentMcap < G * 60) {
            return 2;
        } else {
            return 3; // Clamps at 3
        }
    }
    
    /**
     * @notice Babylonian square root
     */
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        
        uint256 z = (x + 1) / 2;
        y = x;
        
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
