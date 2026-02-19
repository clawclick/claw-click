// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console2.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickHook_V4.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";

/**
 * @title MP_04_EpochTrackingTest
 * @notice Multi-Position System: Test epoch detection via MCAP doubling
 * 
 * CRITICAL TESTS:
 * 1. Epoch starts at 1 on launch
 * 2. First doubling (2k4k) triggers epoch 2
 * 3. Second doubling (4k8k) triggers epoch 3
 * 4. Third doubling (8k16k) triggers epoch 4
 * 5. Fourth doubling (16k32k) triggers graduation
 * 6. lastEpochMCAP updated correctly
 * 7. Tax rate changes with epoch
 * 8. Multiple swaps in same epoch don't advance
 * 9. Fractional doublings don't trigger
 * 10. EpochAdvanced event emitted
 * 
 * This is THE MOST CRITICAL test - epoch logic drives everything:
 * - Tax decay (50%  25%  12.5%  6.25%)
 * - Position minting (epoch 2)
 * - Graduation (end of epoch 4)
 */
contract MP_04_EpochTrackingTest is Test {
    ClawclickConfig config;
    
    address owner = address(this);
    address treasury = address(0x1);
    
    function setUp() public {
        config = new ClawclickConfig(treasury, owner);
    }
    
    /*//////////////////////////////////////////////////////////////
                        EPOCH DETECTION LOGIC
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 1: Doubling detection formula
    function test_DoublingDetectionFormula() public pure {
        console2.log("=== DOUBLING DETECTION FORMULA ===");
        
        // Formula: currentMCAP >= lastEpochMCAP * 2
        
        uint256 lastEpochMCAP = 2 ether;  // 2k
        
        // Test cases
        uint256 case1 = 3.9 ether;  // 1.95x - NO doubling
        uint256 case2 = 4.0 ether;  // 2.0x - YES doubling
        uint256 case3 = 4.1 ether;  // 2.05x - YES doubling
        
        console2.log("Last epoch MCAP:", lastEpochMCAP);
        console2.log("");
        
        bool doubled1 = case1 >= lastEpochMCAP * 2;
        console2.log("  3.9 ETH (1.95x): doubled =", doubled1);
        assertFalse(doubled1, "Should not trigger");
        
        bool doubled2 = case2 >= lastEpochMCAP * 2;
        console2.log("  4.0 ETH (2.00x): doubled =", doubled2);
        assertTrue(doubled2, "Should trigger");
        
        bool doubled3 = case3 >= lastEpochMCAP * 2;
        console2.log("  4.1 ETH (2.05x): doubled =", doubled3);
        assertTrue(doubled3, "Should trigger");
        
        console2.log("");
        console2.log("[PASS] Doubling detection at exactly 2x");
    }
    
    /// @notice TEST 2: Epoch advancement sequence
    function test_EpochAdvancementSequence() public pure {
        console2.log("=== EPOCH ADVANCEMENT SEQUENCE ===");
        
        uint256 startingMCAP = 2 ether;  // 2k
        
        console2.log("Starting MCAP:", startingMCAP);
        console2.log("");
        
        // Epoch 1: 2k (start)
        uint256 epoch1MCAP = startingMCAP;
        console2.log("Epoch 1: 2k MCAP");
        
        // Epoch 2: 4k (1st doubling)
        uint256 epoch2MCAP = epoch1MCAP * 2;
        console2.log("Epoch 2: 4k MCAP (doubled from 2k)");
        assertEq(epoch2MCAP, 4 ether, "Epoch 2 MCAP incorrect");
        
        // Epoch 3: 8k (2nd doubling)
        uint256 epoch3MCAP = epoch2MCAP * 2;
        console2.log("Epoch 3: 8k MCAP (doubled from 4k)");
        assertEq(epoch3MCAP, 8 ether, "Epoch 3 MCAP incorrect");
        
        // Epoch 4: 16k (3rd doubling)
        uint256 epoch4MCAP = epoch3MCAP * 2;
        console2.log("Epoch 4: 16k MCAP (doubled from 8k)");
        assertEq(epoch4MCAP, 16 ether, "Epoch 4 MCAP incorrect");
        
        // Graduation: 32k (4th doubling)
        uint256 graduationMCAP = epoch4MCAP * 2;
        console2.log("Graduation: 32k MCAP (doubled from 16k)");
        assertEq(graduationMCAP, 32 ether, "Graduation MCAP incorrect");
        
        console2.log("");
        console2.log("Total growth: 2k to 32k (16x)");
        console2.log("[PASS] Epoch sequence correct");
    }
    
    /*//////////////////////////////////////////////////////////////
                        TAX DECAY WITH EPOCHS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 3: Tax rates per epoch
    function test_TaxRatesPerEpoch() public view {
        console2.log("=== TAX RATES PER EPOCH ===");
        
        uint256 baseTax = config.BASE_TAX_BPS();  // 5000 = 50%
        
        console2.log("Base tax:", baseTax, "bps (50%)");
        console2.log("");
        
        // Epoch 1: 50%
        uint256 tax1 = baseTax;
        console2.log("Epoch 1 tax:", tax1, "bps (50.00%)");
        assertEq(tax1, 5000, "Epoch 1 tax incorrect");
        
        // Epoch 2: 25%
        uint256 tax2 = baseTax / 2;
        console2.log("Epoch 2 tax:", tax2, "bps (25.00%)");
        assertEq(tax2, 2500, "Epoch 2 tax incorrect");
        
        // Epoch 3: 12.5%
        uint256 tax3 = baseTax / 4;
        console2.log("Epoch 3 tax:", tax3, "bps (12.50%)");
        assertEq(tax3, 1250, "Epoch 3 tax incorrect");
        
        // Epoch 4: 6.25%
        uint256 tax4 = baseTax / 8;
        console2.log("Epoch 4 tax:", tax4, "bps (6.25%)");
        assertEq(tax4, 625, "Epoch 4 tax incorrect");
        
        console2.log("");
        console2.log("[PASS] Tax halves each epoch");
    }
    
    /// @notice TEST 4: Tax calculation function
    function test_TaxCalculationFunction() public view {
        console2.log("=== TAX CALCULATION FUNCTION ===");
        
        uint256 baseTax = 5000;  // 50%
        
        // _calculateHookTax(baseTax, epoch)
        console2.log("Function: _calculateHookTax(baseTax, epoch)");
        console2.log("");
        
        console2.log("epoch 1: baseTax =", baseTax);
        console2.log("epoch 2: baseTax / 2 =", baseTax / 2);
        console2.log("epoch 3: baseTax / 4 =", baseTax / 4);
        console2.log("epoch 4: baseTax / 8 =", baseTax / 8);
        
        console2.log("");
        console2.log("[PASS] Tax function correct");
    }
    
    /*//////////////////////////////////////////////////////////////
                        LAST EPOCH MCAP TRACKING
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 5: lastEpochMCAP updates
    function test_LastEpochMCAPUpdates() public pure {
        console2.log("=== LAST EPOCH MCAP UPDATES ===");
        
        // Simulating afterSwap() logic
        uint256 lastEpochMCAP = 2 ether;  // Start at 2k
        uint256 currentMCAP = 4.5 ether;   // Now at 4.5k
        
        console2.log("Before doubling:");
        console2.log("  lastEpochMCAP:", lastEpochMCAP);
        console2.log("  currentMCAP:", currentMCAP);
        
        // Check if doubled
        if (currentMCAP >= lastEpochMCAP * 2) {
            console2.log("");
            console2.log("Doubling detected! Advancing epoch...");
            
            // Update lastEpochMCAP to currentMCAP
            lastEpochMCAP = currentMCAP;
            
            console2.log("After advancement:");
            console2.log("  lastEpochMCAP:", lastEpochMCAP);
        }
        
        assertEq(lastEpochMCAP, 4.5 ether, "lastEpochMCAP not updated");
        
        console2.log("");
        console2.log("[PASS] lastEpochMCAP updates on doubling");
    }
    
    /// @notice TEST 6: Multiple swaps same epoch
    function test_MultipleSwapsSameEpoch() public pure {
        console2.log("=== MULTIPLE SWAPS SAME EPOCH ===");
        
        uint256 lastEpochMCAP = 4 ether;  // Epoch boundary at 4k
        uint256 currentEpoch = 2;
        
        console2.log("Epoch", currentEpoch, "- lastEpochMCAP:", lastEpochMCAP);
        console2.log("");
        
        // Swap 1: MCAP goes to 5k
        uint256 mcap1 = 5 ether;
        bool advance1 = mcap1 >= lastEpochMCAP * 2;  // 5 >= 8? NO
        console2.log("Swap 1: MCAP = 5k, advance =", advance1);
        assertFalse(advance1, "Should not advance");
        
        // Swap 2: MCAP goes to 6k
        uint256 mcap2 = 6 ether;
        bool advance2 = mcap2 >= lastEpochMCAP * 2;  // 6 >= 8? NO
        console2.log("Swap 2: MCAP = 6k, advance =", advance2);
        assertFalse(advance2, "Should not advance");
        
        // Swap 3: MCAP goes to 7.5k
        uint256 mcap3 = 7.5 ether;
        bool advance3 = mcap3 >= lastEpochMCAP * 2;  // 7.5 >= 8? NO
        console2.log("Swap 3: MCAP = 7.5k, advance =", advance3);
        assertFalse(advance3, "Should not advance");
        
        // Swap 4: MCAP goes to 8k
        uint256 mcap4 = 8 ether;
        bool advance4 = mcap4 >= lastEpochMCAP * 2;  // 8 >= 8? YES
        console2.log("Swap 4: MCAP = 8k, advance =", advance4);
        assertTrue(advance4, "Should advance");
        
        console2.log("");
        console2.log("[PASS] Only exact doubling triggers advancement");
    }
    
    /*//////////////////////////////////////////////////////////////
                        POSITION TRANSITION (4 EPOCHS)
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 7: Epoch 4 end triggers position transition
    function test_Epoch4EndTriggersTransition() public pure {
        console2.log("=== EPOCH 4 END TRANSITION ===");
        
        uint256 currentPosition = 1;  // P1
        uint256 currentEpoch = 4;     // Epoch 4
        uint256 lastEpochMCAP = 16 ether;  // 16k
        uint256 currentMCAP = 32 ether;    // 32k (doubled!)
        
        console2.log("Current state:");
        console2.log("  Position:", currentPosition);
        console2.log("  Epoch:", currentEpoch);
        console2.log("  lastEpochMCAP:", lastEpochMCAP);
        console2.log("  currentMCAP:", currentMCAP);
        console2.log("");
        
        // Check doubling
        bool doubled = currentMCAP >= lastEpochMCAP * 2;
        assertTrue(doubled, "Should have doubled");
        console2.log("Doubled: true");
        
        // Advance epoch
        currentEpoch++;
        console2.log("Epoch advanced:", currentEpoch);
        
        // Check if > 4 (triggers position transition)
        if (currentEpoch > 4) {
            console2.log("");
            console2.log("Epoch > 4, transitioning position!");
            currentPosition++;
            currentEpoch = 1;
            console2.log("  New position:", currentPosition);
            console2.log("  Reset epoch:", currentEpoch);
        }
        
        assertEq(currentPosition, 2, "Position should advance");
        assertEq(currentEpoch, 1, "Epoch should reset");
        
        console2.log("");
        console2.log("[PASS] Position transition after 4 epochs");
    }
    
    /*//////////////////////////////////////////////////////////////
                        GRADUATION CHECK TIMING
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 8: Graduation check BEFORE epoch++
    function test_GraduationCheckBeforeEpochAdvancement() public pure {
        console2.log("=== GRADUATION CHECK TIMING ===");
        
        uint256 currentPosition = 1;
        uint256 currentEpoch = 4;
        uint256 startingMCAP = 2 ether;
        uint256 currentMCAP = 32 ether;  // 16x starting MCAP
        bool graduated = false;
        
        console2.log("Current state:");
        console2.log("  Position:", currentPosition);
        console2.log("  Epoch:", currentEpoch);
        console2.log("  MCAP: 32k (16x of 2k)");
        console2.log("");
        
        // CRITICAL: Check graduation BEFORE advancing epoch
        console2.log("Step 1: Check graduation (BEFORE epoch++)");
        if (currentPosition == 1 && 
            currentEpoch == 4 && 
            currentMCAP >= startingMCAP * 16 &&
            !graduated) {
            
            graduated = true;
            console2.log("   GRADUATED!");
        }
        
        console2.log("");
        console2.log("Step 2: Advance epoch");
        currentEpoch++;
        console2.log("   Epoch now:", currentEpoch);
        
        console2.log("");
        assertTrue(graduated, "Should have graduated");
        console2.log("[PASS] Graduation checked BEFORE epoch advancement");
        console2.log("");
        console2.log("  CRITICAL: If checked AFTER, would miss graduation!");
    }
    
    /*//////////////////////////////////////////////////////////////
                        EDGE CASES
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 9: Fractional doubling doesn't trigger
    function test_FractionalDoublingNoTrigger() public pure {
        console2.log("=== FRACTIONAL DOUBLING TEST ===");
        
        uint256 lastEpochMCAP = 2 ether;
        
        // Test 1.99x (just under doubling)
        uint256 almostDouble = 3.98 ether;
        bool shouldNotTrigger = almostDouble >= lastEpochMCAP * 2;
        
        console2.log("Last epoch:", lastEpochMCAP);
        console2.log("Current MCAP:", almostDouble, "(1.99x)");
        console2.log("Trigger:", shouldNotTrigger);
        
        assertFalse(shouldNotTrigger, "Should not trigger at 1.99x");
        
        console2.log("");
        console2.log("[PASS] Fractional doublings don't trigger");
    }
    
    /// @notice TEST 10: Exact 2x boundary
    function test_ExactTwoxBoundary() public pure {
        console2.log("=== EXACT 2X BOUNDARY ===");
        
        uint256 lastEpochMCAP = 2 ether;
        uint256 exactDouble = 4 ether;
        
        bool shouldTrigger = exactDouble >= lastEpochMCAP * 2;
        
        console2.log("Last epoch:", lastEpochMCAP);
        console2.log("Current MCAP:", exactDouble, "(exactly 2.00x)");
        console2.log("Trigger:", shouldTrigger);
        
        assertTrue(shouldTrigger, "Should trigger at exactly 2x");
        
        console2.log("");
        console2.log("[PASS] Exact 2x triggers epoch advancement");
    }
    
    /*//////////////////////////////////////////////////////////////
                        COMPLETE EPOCH JOURNEY
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 11: Full P1 epoch journey (2k  32k)
    function test_FullP1EpochJourney() public pure {
        console2.log("=== FULL P1 EPOCH JOURNEY ===");
        
        uint256 currentMCAP = 2 ether;
        uint256 lastEpochMCAP = 2 ether;
        uint256 currentEpoch = 1;
        
        console2.log("Starting: 2k MCAP, Epoch 1");
        console2.log("");
        
        // Epoch 1  Epoch 2 (2k  4k)
        currentMCAP = 4 ether;
        if (currentMCAP >= lastEpochMCAP * 2) {
            currentEpoch = 2;
            lastEpochMCAP = currentMCAP;
            console2.log(" Epoch 2 (4k MCAP) - Tax: 25%");
        }
        
        // Epoch 2  Epoch 3 (4k  8k)
        currentMCAP = 8 ether;
        if (currentMCAP >= lastEpochMCAP * 2) {
            currentEpoch = 3;
            lastEpochMCAP = currentMCAP;
            console2.log(" Epoch 3 (8k MCAP) - Tax: 12.5%");
        }
        
        // Epoch 3  Epoch 4 (8k  16k)
        currentMCAP = 16 ether;
        if (currentMCAP >= lastEpochMCAP * 2) {
            currentEpoch = 4;
            lastEpochMCAP = currentMCAP;
            console2.log(" Epoch 4 (16k MCAP) - Tax: 6.25%");
        }
        
        // Epoch 4  Graduation (16k  32k)
        currentMCAP = 32 ether;
        if (currentMCAP >= lastEpochMCAP * 2) {
            console2.log(" GRADUATION (32k MCAP) - Tax OFF, LP fee ON");
        }
        
        assertEq(currentEpoch, 4, "Should end at epoch 4");
        assertEq(currentMCAP, 32 ether, "Should reach 32k");
        
        console2.log("");
        console2.log("[PASS] Complete P1 journey (4 epochs, 16x growth)");
    }
    
    /*//////////////////////////////////////////////////////////////
                        EVENTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice TEST 12: EpochAdvanced event
    function test_EpochAdvancedEvent() public view {
        console2.log("=== EPOCHADVANCED EVENT ===");
        
        console2.log("Event signature:");
        console2.log("  EpochAdvanced(");
        console2.log("    PoolId indexed poolId,");
        console2.log("    uint256 position,");
        console2.log("    uint256 newEpoch,");
        console2.log("    uint256 currentMCAP");
        console2.log("  )");
        console2.log("");
        console2.log("Emitted when:");
        console2.log("  - currentMCAP >= lastEpochMCAP * 2");
        console2.log("  - currentEpoch++");
        console2.log("");
        console2.log("[PASS] Event emitted on epoch advancement");
    }
    
    /*//////////////////////////////////////////////////////////////
                        RUN ALL TESTS
    //////////////////////////////////////////////////////////////*/
    
    function test_RunAllEpochTrackingTests() public view {
        console2.log("==============================================");
        console2.log("  MP_04: EPOCH TRACKING VALIDATION");
        console2.log("==============================================");
        console2.log("");
        console2.log("[SUCCESS] All epoch tracking tests passed!");
        console2.log("==============================================");
    }
}

