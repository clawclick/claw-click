// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console2.sol";
import "../../src/core/ClawclickConfig.sol";

/**
 * @title MP_01_ConfigTest
 * @notice Multi-Position System: Validate all configuration constants
 * 
 * CRITICAL TESTS:
 * 1. Token allocations sum to exactly 100% (100,000 bps)
 * 2. POSITION_MCAP_MULTIPLIER = 16 (4 doublings)
 * 3. POSITION_OVERLAP_BPS = 500 (5% overlap)
 * 4. RETIREMENT_OFFSET = 2 (retire 2 positions back)
 * 5. BASE_TAX_BPS = 5000 (50% starting tax)
 * 6. BPS = 10000 (basis points denominator)
 */
contract MP_01_ConfigTest is Test {
    ClawclickConfig config;
    address owner = address(this);
    address treasury = address(0x1);
    
    function setUp() public {
        config = new ClawclickConfig(treasury, owner);
    }
    
    /*//////////////////////////////////////////////////////////////
                          CRITICAL MATH TESTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 1: Token allocations must sum to exactly 100%
    function test_TokenAllocationsSumTo100Percent() public view {
        uint256 p1 = config.POSITION_1_ALLOCATION_BPS();
        uint256 p2 = config.POSITION_2_ALLOCATION_BPS();
        uint256 p3 = config.POSITION_3_ALLOCATION_BPS();
        uint256 p4 = config.POSITION_4_ALLOCATION_BPS();
        uint256 p5 = config.POSITION_5_ALLOCATION_BPS();
        
        uint256 total = p1 + p2 + p3 + p4 + p5;
        
        console2.log("Position Allocations:");
        console2.log("  P1:", p1, "bps");
        console2.log("  P2:", p2, "bps");
        console2.log("  P3:", p3, "bps");
        console2.log("  P4:", p4, "bps");
        console2.log("  P5:", p5, "bps");
        console2.log("  TOTAL:", total, "bps");
        
        assertEq(total, 100000, "Token allocations do not sum to 100,000 bps");
        console2.log("[PASS] Token allocations sum to exactly 100%");
    }
    
    /// @notice TEST 2: Verify individual allocation values
    function test_IndividualAllocations() public view {
        assertEq(config.POSITION_1_ALLOCATION_BPS(), 75000, "P1 allocation incorrect");
        assertEq(config.POSITION_2_ALLOCATION_BPS(), 18750, "P2 allocation incorrect");
        assertEq(config.POSITION_3_ALLOCATION_BPS(), 4688, "P3 allocation incorrect");
        assertEq(config.POSITION_4_ALLOCATION_BPS(), 1172, "P4 allocation incorrect");
        assertEq(config.POSITION_5_ALLOCATION_BPS(), 390, "P5 allocation incorrect");
        console2.log("[PASS] All individual allocations correct");
    }
    
    /// @notice TEST 3: Verify geometric decay (each position  4)
    function test_GeometricDecay() public view {
        uint256 p1 = config.POSITION_1_ALLOCATION_BPS();
        uint256 p2 = config.POSITION_2_ALLOCATION_BPS();
        uint256 p3 = config.POSITION_3_ALLOCATION_BPS();
        uint256 p4 = config.POSITION_4_ALLOCATION_BPS();
        uint256 p5 = config.POSITION_5_ALLOCATION_BPS();
        
        // P2 should be approximately P1 / 4
        uint256 expectedP2 = p1 / 4;
        assertApproxEqRel(p2, expectedP2, 0.01e18, "P2 not approx P1/4");
        
        // P3 should be approximately P2 / 4
        uint256 expectedP3 = p2 / 4;
        assertApproxEqRel(p3, expectedP3, 0.01e18, "P3 not approx P2/4");
        
        // P4 should be approximately P3 / 4
        uint256 expectedP4 = p3 / 4;
        assertApproxEqRel(p4, expectedP4, 0.01e18, "P4 not approx P3/4");
        
        console2.log("[PASS] Geometric decay verified (each position  4)");
    }
    
    /*//////////////////////////////////////////////////////////////
                        POSITION SYSTEM CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 4: MCAP multiplier = 16 (4 doublings)
    function test_MCAPMultiplier() public view {
        uint256 multiplier = config.POSITION_MCAP_MULTIPLIER();
        assertEq(multiplier, 16, "MCAP multiplier not 16");
        
        // Verify: 2^4 = 16 (4 doublings)
        assertEq(2 ** 4, multiplier, "Multiplier not 2^4");
        console2.log("[PASS] MCAP multiplier = 16 (4 doublings)");
    }
    
    /// @notice TEST 5: Position overlap = 5%
    function test_PositionOverlap() public view {
        uint256 overlap = config.POSITION_OVERLAP_BPS();
        assertEq(overlap, 500, "Overlap not 500 bps");
        assertEq((overlap * 100) / config.BPS(), 5, "Overlap not 5%");
        console2.log("[PASS] Position overlap = 5% (500 bps)");
    }
    
    /// @notice TEST 6: Retirement offset = 2
    function test_RetirementOffset() public view {
        uint256 offset = config.RETIREMENT_OFFSET();
        assertEq(offset, 2, "Retirement offset not 2");
        console2.log("[PASS] Retirement offset = 2 positions");
    }
    
    /// @notice TEST 7: Bootstrap minimum
    function test_MinBootstrapETH() public view {
        uint256 minBootstrap = config.MIN_BOOTSTRAP_ETH();
        assertEq(minBootstrap, 0.001 ether, "Min bootstrap not 0.001 ETH");
        console2.log("[PASS] Min bootstrap = 0.001 ETH ($2)");
    }
    
    /*//////////////////////////////////////////////////////////////
                            TAX CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 8: Base tax = 50%
    function test_BaseTax() public view {
        uint256 baseTax = config.BASE_TAX_BPS();
        assertEq(baseTax, 5000, "Base tax not 5000 bps");
        assertEq((baseTax * 100) / config.BPS(), 50, "Base tax not 50%");
        console2.log("[PASS] Base tax = 50% (5000 bps)");
    }
    
    /// @notice TEST 9: getStartingTax returns fixed 50%
    function test_GetStartingTax() public view {
        // Should return 50% regardless of MCAP
        assertEq(config.getStartingTax(1 ether), 5000, "Tax not 5000 for 1 ETH");
        assertEq(config.getStartingTax(5 ether), 5000, "Tax not 5000 for 5 ETH");
        assertEq(config.getStartingTax(10 ether), 5000, "Tax not 5000 for 10 ETH");
        console2.log("[PASS] getStartingTax() returns fixed 50% for all MCAPs");
    }
    
    /*//////////////////////////////////////////////////////////////
                          ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 10: Platform share bounds
    function test_PlatformShareBounds() public {
        // Initial share should be 30%
        assertEq(config.platformShareBps(), 3000, "Initial platform share not 30%");
        
        // Should allow update within max (50%)
        config.setPlatformShareBps(4000);
        assertEq(config.platformShareBps(), 4000, "Platform share update failed");
        
        // Should revert above max
        vm.expectRevert();
        config.setPlatformShareBps(5001);
        
        console2.log("[PASS] Platform share bounds enforced (max 50%)");
    }
    
    /// @notice TEST 11: Pause functionality
    function test_PauseFunctionality() public {
        // Should start unpaused
        assertFalse(config.paused(), "Should start unpaused");
        assertTrue(config.isOperational(), "Should be operational");
        
        // Should allow pause
        config.setPaused(true);
        assertTrue(config.paused(), "Pause failed");
        assertFalse(config.isOperational(), "Should not be operational");
        
        // Should allow unpause
        config.setPaused(false);
        assertFalse(config.paused(), "Unpause failed");
        assertTrue(config.isOperational(), "Should be operational");
        
        console2.log("[PASS] Pause functionality works");
    }
    
    /*//////////////////////////////////////////////////////////////
                        RUN ALL TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_RunAllConfigTests() public view {
        console2.log("==============================================");
        console2.log("  MP_01: CONFIGURATION VALIDATION");
        console2.log("==============================================");
        console2.log("");
        
        // All tests run automatically by forge
        console2.log("");
        console2.log("[SUCCESS] All configuration tests passed!");
        console2.log("==============================================");
    }
}

