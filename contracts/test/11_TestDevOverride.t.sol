// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTest.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestDevOverride
 * @notice Tests the creator first-buy privilege (dev override):
 *   - Creator can buy tax-free within 1 minute of launch
 *   - Creator buy bypasses maxTx and maxWallet limits
 *   - 15% supply cap is enforced via checkDevCap view
 *   - Non-creator buys in the same window still pay full tax
 *   - After 1 minute, creator buys pay normal tax
 *   - clearDevOverride can be called by creator after 1 minute
 */
contract TestDevOverride is BaseTest {
    using PoolIdLibrary for PoolKey;

    address creator;
    address token;
    PoolId poolId;
    PoolKey key;

    function setUp() public override {
        super.setUp();
        creator = deployer; // deployer calls createLaunch → becomes creator
    }

    /// @dev Launch a 1 ETH pool and return state
    function _launchPool() internal {
        vm.startPrank(creator);
        (token, poolId, key) = _createLaunch(1 ether, beneficiary);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
       TEST 1: Creator buys tax-free within 1 minute window
    //////////////////////////////////////////////////////////////*/

    function test_creatorBuyTaxFreeInWindow() public {
        _launchPool();

        // Snapshot fees before
        uint256 benFeesBefore = hook.beneficiaryFeesETH(beneficiary);
        uint256 platFeesBefore = hook.platformFeesETH();

        // Creator buys (tx.origin must be creator — use two-arg prank)
        vm.prank(creator, creator); // msg.sender=creator, tx.origin=creator
        router.buy{value: 0.01 ether}(key, 0.01 ether);

        // Fees should NOT have increased — creator buy is tax-free
        uint256 benFeesAfter = hook.beneficiaryFeesETH(beneficiary);
        uint256 platFeesAfter = hook.platformFeesETH();

        assertEq(benFeesAfter, benFeesBefore, "No beneficiary fees on creator buy");
        assertEq(platFeesAfter, platFeesBefore, "No platform fees on creator buy");

        // Creator should have received tokens
        uint256 creatorBal = IERC20(token).balanceOf(creator);
        assertTrue(creatorBal > 0, "Creator should have tokens");

        emit log_named_decimal_uint("Creator tokens received", creatorBal, 18);
        emit log("PASS: Creator buy was tax-free within 1min window");
    }

    /*//////////////////////////////////////////////////////////////
      TEST 2: Non-creator buys DO pay tax in the same window
    //////////////////////////////////////////////////////////////*/

    function test_nonCreatorPaysTaxInWindow() public {
        _launchPool();

        uint256 benFeesBefore = hook.beneficiaryFeesETH(beneficiary);
        uint256 platFeesBefore = hook.platformFeesETH();

        // Alice buys (not creator)
        vm.prank(alice, alice);
        router.buy{value: 0.001 ether}(key, 0.001 ether);

        uint256 benFeesAfter = hook.beneficiaryFeesETH(beneficiary);
        uint256 platFeesAfter = hook.platformFeesETH();

        uint256 totalNewFees = (benFeesAfter - benFeesBefore) + (platFeesAfter - platFeesBefore);
        assertTrue(totalNewFees > 0, "Non-creator should pay tax");

        emit log_named_decimal_uint("Fees collected from non-creator", totalNewFees, 18);
        emit log("PASS: Non-creator paid tax during creator window");
    }

    /*//////////////////////////////////////////////////////////////
      TEST 3: Creator buy AFTER 1 minute pays full tax
    //////////////////////////////////////////////////////////////*/

    function test_creatorPaysTaxAfterWindow() public {
        _launchPool();

        // Warp past the 1-minute window
        vm.warp(block.timestamp + 61);

        uint256 benFeesBefore = hook.beneficiaryFeesETH(beneficiary);
        uint256 platFeesBefore = hook.platformFeesETH();

        // Creator buys after window expired
        vm.prank(creator, creator);
        router.buy{value: 0.001 ether}(key, 0.001 ether);

        uint256 totalNewFees = (hook.beneficiaryFeesETH(beneficiary) - benFeesBefore) +
                               (hook.platformFeesETH() - platFeesBefore);
        assertTrue(totalNewFees > 0, "Creator should pay tax after 1min");

        emit log_named_decimal_uint("Fees from creator after window", totalNewFees, 18);
        emit log("PASS: Creator paid tax after 1min window expired");
    }

    /*//////////////////////////////////////////////////////////////
      TEST 4: Creator buy bypasses maxTx/maxWallet limits
    //////////////////////////////////////////////////////////////*/

    function test_creatorBypassesLimits() public {
        _launchPool();

        // Check initial limits
        (uint256 maxTx, uint256 maxWallet) = hook.getCurrentLimits(poolId);
        emit log_named_decimal_uint("MaxTx (tokens)", maxTx, 18);
        emit log_named_decimal_uint("MaxWallet (tokens)", maxWallet, 18);

        // Creator buys a large amount (likely exceeds maxTx for regular users)
        // At 1 ETH MCAP, maxTx = 0.1% of supply = 1M tokens
        // Buying 0.1 ETH at 1 ETH MCAP should yield ~10% of supply before tax
        // which would exceed maxWallet (0.1% = 1M tokens)
        vm.prank(creator, creator);
        router.buy{value: 0.1 ether}(key, 0.1 ether);

        uint256 creatorBal = IERC20(token).balanceOf(creator);
        assertTrue(creatorBal > maxWallet, "Creator should exceed maxWallet (bypassed limits)");

        emit log_named_decimal_uint("Creator balance (tokens)", creatorBal, 18);
        emit log_named_decimal_uint("MaxWallet limit (tokens)", maxWallet, 18);
        emit log("PASS: Creator bypassed maxWallet limit during first-buy window");
    }

    /*//////////////////////////////////////////////////////////////
      TEST 5: checkDevCap tracks creator holdings
    //////////////////////////////////////////////////////////////*/

    function test_checkDevCapEnforced() public {
        _launchPool();

        // Before any buy, dev is within cap
        bool withinCap = factory.checkDevCap(poolId, creator);
        assertTrue(withinCap, "Creator within cap before buying");

        // Creator buys a moderate amount
        vm.prank(creator, creator);
        router.buy{value: 0.01 ether}(key, 0.01 ether);

        uint256 creatorBal = IERC20(token).balanceOf(creator);
        uint256 maxDevTokens = (TOTAL_SUPPLY * 1500) / 10000; // 15%

        emit log_named_decimal_uint("Creator balance", creatorBal, 18);
        emit log_named_decimal_uint("15% cap", maxDevTokens, 18);

        withinCap = factory.checkDevCap(poolId, creator);
        assertTrue(withinCap, "Creator within 15% cap after small buy");

        emit log("PASS: checkDevCap correctly reports creator within cap");
    }

    /*//////////////////////////////////////////////////////////////
      TEST 6: clearDevOverride works after 1 minute
    //////////////////////////////////////////////////////////////*/

    function test_clearDevOverrideAfter1Min() public {
        _launchPool();

        // Before 1 min: clearDevOverride should revert
        vm.prank(creator);
        vm.expectRevert("First-buy window still active");
        factory.clearDevOverride(poolId);

        // After 1 min: clearDevOverride should succeed
        vm.warp(block.timestamp + 61);

        vm.prank(creator);
        factory.clearDevOverride(poolId);

        emit log("PASS: clearDevOverride succeeded after 1min window");
    }

    /*//////////////////////////////////////////////////////////////
      TEST 7: Non-creator cannot call clearDevOverride
    //////////////////////////////////////////////////////////////*/

    function test_onlyCreatorCanClearOverride() public {
        _launchPool();
        vm.warp(block.timestamp + 61);

        // Alice tries to clear — should revert
        vm.prank(alice);
        vm.expectRevert("Only creator or owner");
        factory.clearDevOverride(poolId);

        emit log("PASS: Non-creator correctly reverted on clearDevOverride");
    }

    /*//////////////////////////////////////////////////////////////
     TEST 8: Multiple creator buys within window all tax-free
    //////////////////////////////////////////////////////////////*/

    function test_multipleCreatorBuysInWindow() public {
        _launchPool();

        uint256 totalFeesBefore = hook.beneficiaryFeesETH(beneficiary) + hook.platformFeesETH();

        // Creator makes 3 buys within the 1-minute window
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(creator, creator);
            router.buy{value: 0.005 ether}(key, 0.005 ether);
        }

        uint256 totalFeesAfter = hook.beneficiaryFeesETH(beneficiary) + hook.platformFeesETH();
        assertEq(totalFeesAfter, totalFeesBefore, "All 3 creator buys should be tax-free");

        uint256 creatorBal = IERC20(token).balanceOf(creator);
        emit log_named_decimal_uint("Creator total tokens after 3 buys", creatorBal, 18);
        emit log("PASS: Multiple creator buys all tax-free within window");
    }

    /*//////////////////////////////////////////////////////////////
     TEST 10: Full dev override lifecycle
    //////////////////////////////////////////////////////////////*/

    function test_fullDevOverrideLifecycle() public {
        _launchPool();

        emit log("");
        emit log("  ================================================================");
        emit log("  ||          DEV OVERRIDE FULL LIFECYCLE TEST                  ||");
        emit log("  ================================================================");

        // --- Phase 1: Creator tax-free window (0-60s) ---
        emit log("");
        emit log("  --- Phase 1: Creator Tax-Free Window (t=0) ---");

        vm.prank(creator, creator);
        router.buy{value: 0.02 ether}(key, 0.02 ether);

        uint256 creatorBal = IERC20(token).balanceOf(creator);
        uint256 feesPhase1 = hook.beneficiaryFeesETH(beneficiary) + hook.platformFeesETH();

        emit log_named_decimal_uint("    Creator tokens", creatorBal, 18);
        emit log_named_decimal_uint("    Total ETH fees (should be 0)", feesPhase1, 18);

        bool withinCap = factory.checkDevCap(poolId, creator);
        emit log_named_string("    Within 15% cap", withinCap ? "YES" : "NO");

        // --- Phase 2: Non-creator buys pay tax (same window) ---
        emit log("");
        emit log("  --- Phase 2: Non-Creator Pays Tax (t=0, same window) ---");

        vm.prank(alice, alice);
        router.buy{value: 0.001 ether}(key, 0.001 ether);

        uint256 feesPhase2 = hook.beneficiaryFeesETH(beneficiary) + hook.platformFeesETH();
        uint256 feeDelta = feesPhase2 - feesPhase1;

        emit log_named_decimal_uint("    Fees from alice buy", feeDelta, 18);
        assertTrue(feeDelta > 0, "Alice should pay tax");

        // Verify 70/30 split
        uint256 benFees = hook.beneficiaryFeesETH(beneficiary);
        uint256 platFees = hook.platformFeesETH();
        if (benFees + platFees > 0) {
            uint256 benPct = (benFees * 10000) / (benFees + platFees);
            emit log_named_uint("    Fee split ben (bps)", benPct);
            assertApproxEqAbs(benPct, 7000, 5, "70/30 split");
        }

        // --- Phase 3: Warp past window ---
        emit log("");
        emit log("  --- Phase 3: After Window Expires (t=61s) ---");

        vm.warp(block.timestamp + 61);

        uint256 feesBefore3 = hook.beneficiaryFeesETH(beneficiary) + hook.platformFeesETH();

        vm.prank(creator, creator);
        router.buy{value: 0.001 ether}(key, 0.001 ether);

        uint256 feesAfter3 = hook.beneficiaryFeesETH(beneficiary) + hook.platformFeesETH();
        uint256 creatorTax = feesAfter3 - feesBefore3;

        emit log_named_decimal_uint("    Fees from creator (post-window)", creatorTax, 18);
        assertTrue(creatorTax > 0, "Creator pays tax after window");

        // --- Phase 4: clearDevOverride ---
        emit log("");
        emit log("  --- Phase 4: clearDevOverride ---");

        vm.prank(creator);
        factory.clearDevOverride(poolId);
        emit log("    clearDevOverride: SUCCESS");

        // --- Phase 5: Final cap check ---
        emit log("");
        emit log("  --- Phase 5: Final State ---");

        uint256 finalBal = IERC20(token).balanceOf(creator);
        withinCap = factory.checkDevCap(poolId, creator);
        uint256 maxDev = (TOTAL_SUPPLY * 1500) / 10000;
        uint256 pctOfSupply = (finalBal * 10000) / TOTAL_SUPPLY;

        emit log_named_decimal_uint("    Creator final balance", finalBal, 18);
        emit log_named_decimal_uint("    15% cap (tokens)", maxDev, 18);
        emit log_named_uint("    Creator % of supply (bps)", pctOfSupply);
        emit log_named_string("    Within cap", withinCap ? "YES" : "NO");
        emit log_named_decimal_uint("    Total ETH fees collected", feesAfter3, 18);

        emit log("");
        emit log("  ================================================================");
        emit log("  ||          DEV OVERRIDE LIFECYCLE: COMPLETE                  ||");
        emit log("  ================================================================");
    }
}
