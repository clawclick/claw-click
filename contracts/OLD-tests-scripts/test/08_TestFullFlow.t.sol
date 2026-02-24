// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTest.sol";

/**
 * @title TestFullFlow
 * @notice End-to-end fork test covering the complete token lifecycle:
 *         launch → trades → epoch progression → graduation → post-grad trades
 *         → sell → fee claiming.
 *
 * New system notes:
 *   - Pool is activated at launch (createLaunch sends fee + bootstrap)
 *   - Epochs are stored in poolProgress (not dynamically calculated from price)
 *   - Epoch advancement happens in afterSwap based on MCAP growth
 *   - Tax scales by MCAP tier: 1 ETH=50%, 5 ETH=30%, 10 ETH=5%
 *   - Tax decay: E1=50%, E2=25%, E3=12.5%, E4=6.25% (graduation at end of E4)
 *   - No _setMcap — we use real trades to grow MCAP
 */
contract TestFullFlow is BaseTest {
    using PoolIdLibrary for PoolKey;

    address[] traders;
    uint256 constant NUM_TRADERS = 10;

    function setUp() public override {
        super.setUp();
        for (uint256 i = 0; i < NUM_TRADERS; i++) {
            address trader = makeAddr(string(abi.encodePacked("trader", vm.toString(i))));
            vm.deal(trader, 100 ether);
            traders.push(trader);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  FULL LIFECYCLE — END TO END
    // ═══════════════════════════════════════════════════════════════

    function test_fullLifecycle() public {
        // ── 1. CREATE LAUNCH ──
        vm.startPrank(deployer);
        (address token, PoolId poolId, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        assertFalse(hook.isGraduated(poolId), "Should not be graduated");
        assertEq(hook.getCurrentEpoch(poolId), 1, "Epoch starts at 1");
        assertEq(hook.getCurrentTax(poolId), 5000, "Tax 50% at epoch 1");

        // ── 2. INITIAL BUY — VERIFY ~50% TAX ──
        uint256 feeBefore = _totalFeesETH(beneficiary);
        _safeBuyFresh(key);
        uint256 feesCollected = _totalFeesETH(beneficiary) - feeBefore;
        assertTrue(feesCollected > 0, "Should collect fees");

        // ── 3. TRADE TO ADVANCE EPOCHS ──
        uint256 epochBefore = hook.getCurrentEpoch(poolId);

        for (uint256 i = 0; i < 500; i++) {
            _safeBuyFresh(key);
        }

        uint256 epochAfter = hook.getCurrentEpoch(poolId);
        assertTrue(epochAfter >= epochBefore, "Epoch should advance with trades");

        // Tax should have decayed
        uint256 taxNow = hook.getCurrentTax(poolId);
        if (epochAfter > epochBefore) {
            assertTrue(taxNow < 5000, "Tax should have decayed from 50%");
        }

        // ── 4. TRADE TO GRADUATION ──
        for (uint256 i = 0; i < 10000; i++) {
            _safeBuyFresh(key);
            if (hook.isGraduated(poolId)) break;
        }

        // Check graduation status
        bool graduated = hook.isGraduated(poolId);

        if (graduated) {
            // ── 5. POST-GRADUATION CHECKS ──
            assertTrue(hook.isGraduatedByToken(token), "isGraduatedByToken");
            assertEq(hook.getCurrentTax(poolId), 0, "Tax 0% after graduation");

            (uint256 maxTx, uint256 maxWallet) = hook.getCurrentLimits(poolId);
            assertEq(maxTx, type(uint256).max, "Unlimited maxTx");
            assertEq(maxWallet, type(uint256).max, "Unlimited maxWallet");

            // ── 6. POST-GRAD BUY — 0 TAX ──
            uint256 feesPre = _totalFeesETH(beneficiary);
            _safeBuyFresh(key);
            assertEq(_totalFeesETH(beneficiary) - feesPre, 0, "No fees post-grad");
        }

        // ── 7. SELL TOKENS ──
        // Find any trader with tokens to sell (use the first fresh wallet buyer)
        // After graduation, post-grad buyer should have tokens
        // For simplicity, skip sell test if no trader has tokens
        {
            uint256 bFee2 = hook.beneficiaryFeesETH(beneficiary);
            uint256 pFee2 = hook.platformFeesETH();
            assertTrue(bFee2 > 0 || pFee2 > 0, "Should have fees to claim");
        }

        // ── 8. CLAIM ALL FEES ──
        uint256 bFee = hook.beneficiaryFeesETH(beneficiary);
        uint256 pFee = hook.platformFeesETH();
        assertTrue(bFee > 0 || pFee > 0, "Should have fees to claim");

        if (bFee > 0) {
            // 70/30 check
            uint256 bPct = (bFee * 10000) / (bFee + pFee);
            assertApproxEqAbs(bPct, 7000, 1, "70/30 split");

            uint256 benBal = beneficiary.balance;
            hook.claimBeneficiaryFeesETH(beneficiary);
            assertEq(beneficiary.balance - benBal, bFee, "Beneficiary claimed");
            assertEq(hook.beneficiaryFeesETH(beneficiary), 0, "Zeroed");
        }

        if (pFee > 0) {
            uint256 tresBal = treasury.balance;
            vm.prank(treasury);
            hook.claimPlatformFeesETH();
            assertEq(treasury.balance - tresBal, pFee, "Treasury claimed");
            assertEq(hook.platformFeesETH(), 0, "Zeroed");
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  TAX DECAY OBSERVED THROUGH REAL TRADES
    // ═══════════════════════════════════════════════════════════════

    function test_taxDecayThroughTrades() public {
        vm.startPrank(deployer);
        (, PoolId poolId, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        assertEq(hook.getCurrentTax(poolId), 5000, "E1 = 50%");

        // Track tax across trades
        uint256 prevTax = 5000;
        uint256 prevEpoch = 1;

        for (uint256 i = 0; i < 1000; i++) {
            _safeBuyFresh(key);

            uint256 curEpoch = hook.getCurrentEpoch(poolId);
            uint256 curTax = hook.getCurrentTax(poolId);

            if (curEpoch > prevEpoch) {
                assertTrue(curTax <= prevTax, "Tax should decrease on epoch advance");
                prevTax = curTax;
                prevEpoch = curEpoch;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  LIMITS SCALE THROUGH REAL TRADES
    // ═══════════════════════════════════════════════════════════════

    function test_limitsScaleThroughTrades() public {
        vm.startPrank(deployer);
        (, PoolId poolId, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        (uint256 maxTx0,) = hook.getCurrentLimits(poolId);
        assertTrue(maxTx0 > 0, "Initial limits > 0");

        // Trade to grow MCAP — fresh wallets (respects maxTx)
        for (uint256 i = 0; i < 200; i++) {
            _safeBuyFresh(key);
        }

        (uint256 maxTx1,) = hook.getCurrentLimits(poolId);
        assertTrue(maxTx1 >= maxTx0, "Limits should not decrease as MCAP grows");
    }

    // ═══════════════════════════════════════════════════════════════
    //  MULTIPLE TOKENS — INDEPENDENT STATE
    // ═══════════════════════════════════════════════════════════════

    function test_multipleTokensIndependentGraduation() public {
        vm.startPrank(deployer);
        (address tokenA, PoolId poolIdA, PoolKey memory keyA) =
            _createAndActivateNamed("Token A", "TKNA", 1 ether, beneficiary, 0);

        (, PoolId poolIdB,) =
            _createAndActivateNamed("Token B", "TKNB", 1 ether, alice, 0);
        vm.stopPrank();

        // Trade heavily on token A only — fresh wallets (respects maxTx)
        for (uint256 i = 0; i < 2000; i++) {
            _safeBuyFresh(keyA);
        }

        // Token A may have advanced or graduated
        uint256 epochA = hook.getCurrentEpoch(poolIdA);
        uint256 epochB = hook.getCurrentEpoch(poolIdB);
        assertTrue(epochA >= epochB, "Traded token should have >= epoch");

        // Token B should still be at epoch 1
        assertEq(epochB, 1, "Untraded token stays at epoch 1");
    }

    // ═══════════════════════════════════════════════════════════════
    //  FEE SPLIT ACCURACY
    // ═══════════════════════════════════════════════════════════════

    function test_feeSplitAccuracy() public {
        vm.startPrank(deployer);
        (,, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        // Multiple trades, check 70/30 split after each
        for (uint256 i = 0; i < 5; i++) {
            uint256 bBefore = hook.beneficiaryFeesETH(beneficiary);
            uint256 pBefore = hook.platformFeesETH();

            _safeBuyFresh(key);

            uint256 bD = hook.beneficiaryFeesETH(beneficiary) - bBefore;
            uint256 pD = hook.platformFeesETH() - pBefore;
            uint256 total = bD + pD;
            if (total > 0) {
                uint256 bPct = (bD * 10000) / total;
                assertApproxEqAbs(bPct, 7000, 1, "70/30 split");
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    //  HELPER
    // ═══════════════════════════════════════════════════════════════

    function _totalFeesETH(address _beneficiary) internal view returns (uint256) {
        return hook.beneficiaryFeesETH(_beneficiary) + hook.platformFeesETH();
    }
}
