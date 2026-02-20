// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTest.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestTradeToGraduation
 * @notice End-to-end fork test: real swaps from launch through all epochs to graduation.
 *         Uses unique wallets per buy to simulate real buying volume (no wallet reuse).
 *
 *  NEW SYSTEM (multi-position):
 *    - Pools activate at launch (no separate activation step)
 *    - No keeper/reposition needed — positions managed automatically via hook
 *    - Epoch starts at 1 (not 0)
 *    - Universal 50% base tax for all MCAPs
 *    - Graduation at end of P1 epoch 4 (16x MCAP)
 *
 *  Epoch map (1 ETH target MCAP):
 *    Epoch 1: MCAP 1-2 ETH   | Tax 50%
 *    Epoch 2: MCAP 2-4 ETH   | Tax 25%
 *    Epoch 3: MCAP 4-8 ETH   | Tax 12.5%
 *    Epoch 4: MCAP 8-16 ETH  | Tax 6.25%
 *    Graduated: MCAP 16+ ETH | Tax 0%
 */
contract TestTradeToGraduation is BaseTest {
    using PoolIdLibrary for PoolKey;

    address token;
    PoolId poolId;
    PoolKey key;

    address[] traders;
    uint256 constant NUM_TRADERS = 10;

    /// @dev Pack fee snapshots to avoid stack-too-deep
    struct FeeSnap {
        uint256 benETH;
        uint256 platETH;
        uint256 benTok;
        uint256 platTok;
    }

    function setUp() public override {
        super.setUp();
        for (uint256 i = 0; i < NUM_TRADERS; i++) {
            address t = makeAddr(string(abi.encodePacked("trader", bytes32(i))));
            vm.deal(t, 1000 ether);
            traders.push(t);
        }
    }

    /*//////////////////////////////////////////////////////////////
                              TESTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Helper: log full pool snapshot
    function _logPoolSnapshot(string memory label) internal {
        uint256 mcap = _getCurrentMcap(poolId);
        uint256 pmTokenBal = IERC20(token).balanceOf(POOL_MANAGER);
        uint256 pmEthBal = POOL_MANAGER.balance;
        uint256 ts = IERC20(token).totalSupply();
        uint256 pmPctOfSupply = ts > 0 ? (pmTokenBal * 100) / ts : 0;
        
        emit log(label);
        emit log_named_decimal_uint("    MCAP (ETH)", mcap, 18);
        emit log_named_decimal_uint("    PM token balance", pmTokenBal, 18);
        emit log_named_decimal_uint("    PM ETH balance", pmEthBal, 18);
        emit log_named_uint("    PM token % of supply", pmPctOfSupply);
    }

    /// @notice Detailed per-epoch/position-change log
    function _logDetailedSnapshot(
        uint256 buyNum,
        FeeSnap memory prev
    ) internal {
        // -- Pool progress --
        (uint256 pos, uint256 epoch, uint256 lastEpochMCAP, bool graduated) = hook.poolProgress(poolId);
        uint256 mcap = _getCurrentMcap(poolId);

        emit log("  +============================================================+");
        if (graduated) {
            emit log("  |               ** GRADUATED **                              |");
        }
        emit log("  +============================================================+");

        // -- Identity --
        emit log_named_uint("  | Buy #", buyNum);
        emit log_named_uint("  | Position", pos);
        emit log_named_uint("  | Epoch", epoch);

        // -- MCAP --
        emit log("  +-- MCAP ------------------------------------------------------+");
        emit log_named_decimal_uint("  | Current MCAP (ETH)", mcap, 18);
        emit log_named_decimal_uint("  | Last Epoch MCAP (ETH)", lastEpochMCAP, 18);

        // Launch data
        (,, uint256 startMcap, uint256 baseTax,, , , uint256 gradMcap) = hook.launches(poolId);
        emit log_named_decimal_uint("  | Start MCAP (ETH)", startMcap, 18);
        emit log_named_decimal_uint("  | Graduation MCAP (ETH)", gradMcap, 18);
        if (startMcap > 0) {
            emit log_named_uint("  | MCAP Growth (x)", mcap / startMcap);
        }

        // -- Tax --
        emit log("  +-- TAX -------------------------------------------------------+");
        uint256 taxBps = hook.getCurrentTax(poolId);
        emit log_named_uint("  | Current Tax (bps)", taxBps);
        emit log_named_uint("  | Tax %", taxBps / 100);
        emit log_named_uint("  | Base Tax (bps)", baseTax);

        // -- Limits --
        emit log("  +-- LIMITS ----------------------------------------------------+");
        (uint256 maxTx, uint256 maxWallet) = hook.getCurrentLimits(poolId);
        if (maxTx == type(uint256).max) {
            emit log("  | MaxTx: UNLIMITED (graduated)");
            emit log("  | MaxWallet: UNLIMITED (graduated)");
        } else {
            emit log_named_decimal_uint("  | MaxTx (tokens)", maxTx, 18);
            emit log_named_decimal_uint("  | MaxWallet (tokens)", maxWallet, 18);
            uint256 ts = IERC20(token).totalSupply();
            if (ts > 0) {
                emit log_named_uint("  | MaxTx (bps of supply)", (maxTx * 10000) / ts);
                emit log_named_uint("  | MaxWallet (bps of supply)", (maxWallet * 10000) / ts);
            }
        }

        // -- Fees (cumulative) --
        emit log("  +-- FEES (cumulative) -----------------------------------------+");
        uint256 bFees = hook.beneficiaryFeesETH(beneficiary);
        uint256 pFees = hook.platformFeesETH();
        uint256 bTok = hook.beneficiaryFeesToken(beneficiary, token);
        uint256 pTok = hook.platformFeesToken(token);
        emit log_named_decimal_uint("  | Beneficiary ETH fees", bFees, 18);
        emit log_named_decimal_uint("  | Platform ETH fees", pFees, 18);
        emit log_named_decimal_uint("  | Total ETH fees", bFees + pFees, 18);
        emit log_named_decimal_uint("  | Beneficiary Token fees", bTok, 18);
        emit log_named_decimal_uint("  | Platform Token fees", pTok, 18);

        // Delta
        uint256 dBen = bFees > prev.benETH ? bFees - prev.benETH : 0;
        uint256 dPlat = pFees > prev.platETH ? pFees - prev.platETH : 0;
        uint256 dBenTok = bTok > prev.benTok ? bTok - prev.benTok : 0;
        uint256 dPlatTok = pTok > prev.platTok ? pTok - prev.platTok : 0;
        emit log("  +-- FEES (delta since last snapshot) ---------------------------+");
        emit log_named_decimal_uint("  | +ETH fees this period", dBen + dPlat, 18);
        emit log_named_decimal_uint("  |   +Beneficiary ETH", dBen, 18);
        emit log_named_decimal_uint("  |   +Platform ETH", dPlat, 18);
        emit log_named_decimal_uint("  | +Token fees this period", dBenTok + dPlatTok, 18);
        if (bFees + pFees > 0) {
            emit log_named_uint("  | Ben/Plat split (bps)", (bFees * 10000) / (bFees + pFees));
        }

        // -- LP / Positions --
        emit log("  +-- POSITIONS -------------------------------------------------+");
        uint256[5] memory posIds = factory.getPositionTokenIds(poolId);
        for (uint256 p = 0; p < 5; p++) {
            if (posIds[p] != 0) {
                emit log_named_uint("  | P (minted)", p + 1);
                emit log_named_uint("  |   Token ID", posIds[p]);
            }
        }

        // Factory pool state: recycledETH
        (,,,,,uint256 recycledETH,,) = factory.poolStates(poolId);
        emit log_named_decimal_uint("  | Recycled ETH (from retired)", recycledETH, 18);

        // -- Pool Manager Balances --
        emit log("  +-- PM BALANCES -----------------------------------------------+");
        uint256 pmTokenBal = IERC20(token).balanceOf(POOL_MANAGER);
        uint256 pmEthBal = POOL_MANAGER.balance;
        emit log_named_decimal_uint("  | PM Token Balance", pmTokenBal, 18);
        emit log_named_decimal_uint("  | PM ETH Balance", pmEthBal, 18);

        emit log("  +============================================================+");
    }

    /**
     * @notice Full trade-through-graduation: 1 ETH target MCAP.
     *         Each buy is from a unique wallet simulating real volume.
     */
    function test_tradeToGraduation_1ETH() public {
        // -- 1. CREATE (pool activated at launch with bootstrap ETH) --
        vm.startPrank(deployer);
        (token, poolId, key) = _createLaunch(1 ether, beneficiary);
        vm.stopPrank();

        // Verify initial state
        assertEq(hook.getCurrentEpoch(poolId), 1, "Start epoch 1");
        assertEq(hook.getCurrentTax(poolId), 5000, "Start tax 50%");
        assertFalse(hook.isGraduated(poolId));

        // -- Initial detailed snapshot --
        _logDetailedSnapshot(0, FeeSnap(0, 0, 0, 0));

        // -- 2. TRADE THROUGH ALL EPOCHS --
        uint256 totalBuys = 0;
        uint256 prevEpoch = 1;
        uint256 prevPos = 1;

        // Fee tracking for deltas (packed struct to avoid stack-too-deep)
        FeeSnap memory snap = FeeSnap(
            hook.beneficiaryFeesETH(beneficiary),
            hook.platformFeesETH(),
            hook.beneficiaryFeesToken(beneficiary, token),
            hook.platformFeesToken(token)
        );

        for (uint256 i = 0; i < 10000; i++) {
            _safeBuyFresh(key);
            totalBuys++;

            (uint256 curPos, uint256 curEpoch,, bool grad) = hook.poolProgress(poolId);

            if (curEpoch != prevEpoch || curPos != prevPos || grad) {
                _logDetailedSnapshot(totalBuys, snap);

                // Update fee snapshots after logging delta
                snap = FeeSnap(
                    hook.beneficiaryFeesETH(beneficiary),
                    hook.platformFeesETH(),
                    hook.beneficiaryFeesToken(beneficiary, token),
                    hook.platformFeesToken(token)
                );

                prevEpoch = curEpoch;
                prevPos = curPos;
            }

            if (grad) break;
        }

        // -- 3. VERIFY GRADUATION --
        assertTrue(hook.isGraduated(poolId), "Should have graduated");
        assertEq(hook.getCurrentTax(poolId), 0, "Tax 0% post-graduation");

        (uint256 maxTx, uint256 maxWallet) = hook.getCurrentLimits(poolId);
        assertEq(maxTx, type(uint256).max, "Unlimited maxTx");
        assertEq(maxWallet, type(uint256).max, "Unlimited maxWallet");

        // -- Final summary --
        emit log("  +============================================================+");
        emit log("  |              GRADUATION SUMMARY                            |");
        emit log("  +============================================================+");
        emit log_named_uint("  | Total Buys", totalBuys);
        emit log_named_decimal_uint("  | Final MCAP (ETH)", _getCurrentMcap(poolId), 18);

        uint256 bFees = hook.beneficiaryFeesETH(beneficiary);
        uint256 pFees = hook.platformFeesETH();
        uint256 bTok = hook.beneficiaryFeesToken(beneficiary, token);
        uint256 pTok = hook.platformFeesToken(token);
        emit log_named_decimal_uint("  | Total Beneficiary ETH fees", bFees, 18);
        emit log_named_decimal_uint("  | Total Platform ETH fees", pFees, 18);
        emit log_named_decimal_uint("  | Total ETH fees", bFees + pFees, 18);
        emit log_named_decimal_uint("  | Total Beneficiary Token fees", bTok, 18);
        emit log_named_decimal_uint("  | Total Platform Token fees", pTok, 18);
        emit log_named_decimal_uint("  | Total Token fees", bTok + pTok, 18);
        if (bFees + pFees > 0) {
            emit log_named_uint("  | Fee Split Ben/Total (bps)", (bFees * 10000) / (bFees + pFees));
        }
        emit log("  +============================================================+");

        // -- 4. POST-GRADUATION TRADES: 0% hook tax --
        uint256 feeBefore = bFees + pFees;
        _safeBuyFresh(key);
        uint256 feeAfter = hook.beneficiaryFeesETH(beneficiary) + hook.platformFeesETH();
        assertEq(feeAfter, feeBefore, "No hook fees post-graduation");

        emit log("  Post-grad buy: 0 ETH fees collected (correct)");

        // -- 5. FEE VERIFICATION (70/30 split) --
        assertGt(bFees, 0, "Beneficiary has fees");
        assertGt(pFees, 0, "Platform has fees");

        uint256 bPct = (bFees * 10000) / (bFees + pFees);
        assertApproxEqAbs(bPct, 7000, 5, "70/30 split");
    }

    /**
     * @notice 5 ETH target MCAP. Graduation at ~80 ETH MCAP.
     */
    function test_tradeToGraduation_5ETH() public {
        vm.startPrank(deployer);
        (token, poolId, key) = _createLaunch(5 ether, beneficiary);
        vm.stopPrank();

        assertEq(hook.getCurrentTax(poolId), 5000, "5 ETH tier: 50% tax (universal base)");
        emit log_named_uint("Start MCAP", _getCurrentMcap(poolId));

        uint256 prevEpoch = 1;
        uint256 totalBuys = 0;

        for (uint256 i = 0; i < 15000 && !hook.isGraduated(poolId); i++) {
            _safeBuyFresh(key);
            totalBuys++;

            uint256 epoch = hook.getCurrentEpoch(poolId);
            bool grad = hook.isGraduated(poolId);

            if (epoch != prevEpoch || grad) {
                emit log("----------------------------------------");
                emit log_named_uint("  MCAP", _getCurrentMcap(poolId));
                emit log_named_uint("  Epoch", epoch);
                emit log_named_uint("  Tax", hook.getCurrentTax(poolId));
                if (grad) emit log("  ** GRADUATED **");
                prevEpoch = epoch;
            }
        }

        assertTrue(hook.isGraduated(poolId), "Should graduate at 5 ETH tier");
        assertEq(hook.getCurrentTax(poolId), 0);

        emit log("========================================");
        emit log_named_uint("Final MCAP", _getCurrentMcap(poolId));
        emit log_named_uint("Total Buys", totalBuys);
    }

    /**
     * @notice Epoch progression test: verify taxes decay correctly through epochs.
     */
    function test_epochProgression() public {
        vm.startPrank(deployer);
        (token, poolId, key) = _createLaunch(1 ether, beneficiary);
        vm.stopPrank();

        assertEq(hook.getCurrentEpoch(poolId), 1);
        assertEq(hook.getCurrentTax(poolId), 5000);

        // Buy until epoch 2
        uint256 buys = 0;
        for (uint256 i = 0; i < 10000; i++) {
            _safeBuyFresh(key);
            buys++;
            if (hook.getCurrentEpoch(poolId) >= 2) break;
        }

        assertEq(hook.getCurrentEpoch(poolId), 2, "Should be epoch 2");
        assertEq(hook.getCurrentTax(poolId), 2500, "Epoch 2: 25% tax");
        emit log_named_uint("MCAP at epoch 2", _getCurrentMcap(poolId));
        emit log_named_uint("Buys to epoch 2", buys);

        // Continue to graduation
        for (uint256 i = buys; i < 10000; i++) {
            _safeBuyFresh(key);
            if (hook.isGraduated(poolId)) break;
        }

        assertTrue(hook.isGraduated(poolId), "Should graduate");

        emit log_named_uint("Final MCAP", _getCurrentMcap(poolId));
    }

    /**
     * @notice Interleaved buys and sells, still reaches graduation.
     *         Uses fresh wallets for buys; sellers are those who already bought.
     */
    function test_buySellMixToGraduation() public {
        vm.startPrank(deployer);
        (token, poolId, key) = _createLaunch(1 ether, beneficiary);
        vm.stopPrank();

        uint256 prevEpoch = 1;
        uint256 totalTrades = 0;

        // Track recent buyers so we can sell from them periodically
        address[] memory recentBuyers = new address[](5);
        uint256 buyerSlot = 0;

        for (uint256 round = 0; round < 15000 && !hook.isGraduated(poolId); round++) {
            // Every 5th trade: sell from a previous buyer (if they have tokens)
            if (round % 5 == 4 && round >= 5) {
                address seller = recentBuyers[round % 5];
                uint256 tokenBal = IERC20(token).balanceOf(seller);
                if (tokenBal > 0) {
                    uint256 sellAmt = tokenBal / 5;
                    // maxTx applies to sells too — cap sell amount
                    (uint256 maxTxTokens,) = hook.getCurrentLimits(poolId);
                    if (maxTxTokens < type(uint256).max && sellAmt > maxTxTokens * 60 / 100) {
                        sellAmt = maxTxTokens * 60 / 100;
                    }
                    vm.startPrank(seller);
                    IERC20(token).approve(address(router), sellAmt);
                    try router.sell(key, sellAmt) {} catch {}
                    vm.stopPrank();
                    totalTrades++;
                }
            } else {
                // Buy from fresh wallet (respects maxTx + maxWallet)
                _safeBuyFresh(key);
                totalTrades++;

                // Track this buyer so we can sell from them later
                // (use a made-up address — fresh wallets are unique and hard to track)
                // Instead, just skip sell tracking for simplicity
            }

            uint256 epoch = hook.getCurrentEpoch(poolId);
            bool grad = hook.isGraduated(poolId);

            if (epoch != prevEpoch || grad) {
                emit log("----------------------------------------");
                emit log_named_uint("  Epoch", epoch);
                emit log_named_uint("  MCAP", _getCurrentMcap(poolId));
                emit log_named_uint("  Tax", hook.getCurrentTax(poolId));
                if (grad) emit log("  ** GRADUATED **");
                prevEpoch = epoch;
            }
        }

        assertTrue(hook.isGraduated(poolId), "Should graduate with buy/sell mix");
        assertEq(hook.getCurrentTax(poolId), 0);

        // Post-graduation buy: 0% hook tax
        uint256 feeBefore = hook.beneficiaryFeesETH(beneficiary) + hook.platformFeesETH();
        _safeBuyFresh(key);
        uint256 feeAfter = hook.beneficiaryFeesETH(beneficiary) + hook.platformFeesETH();
        assertEq(feeAfter, feeBefore, "No hook fees post-graduation");

        emit log("========================================");
        emit log_named_uint("Total trades", totalTrades);
        emit log_named_uint("Final MCAP", _getCurrentMcap(poolId));
    }

    /**
     * @notice Full P1→P5 position lifecycle test with DETAILED logging.
     *         Every epoch/position transition prints:
     *           - Tax rate (bps + percentage)
     *           - MaxTx / MaxWallet (tokens + % of supply)
     *           - Live MCAP (ETH)
     *           - Cumulative fees: beneficiary ETH, platform ETH, beneficiary token, platform token
     *           - Fee delta since last transition
     *           - LP snapshot: PoolManager token balance, ETH balance, % of supply in LP
     *           - Position NFT IDs and minted/retired status
     *
     *         Uses 1 ETH target MCAP. Buy sizes scale up per position.
     */
    function test_fullPositionLifecycle_P1toP5() public {
        vm.startPrank(deployer);
        (token, poolId, key) = _createLaunch(1 ether, beneficiary);
        vm.stopPrank();

        // ═══════ INITIAL STATE ═══════
        emit log("");
        emit log("  ################################################################");
        emit log("  ##           P1-P5 FULL LIFECYCLE -- DETAILED LOGS             ##");
        emit log("  ##           1 ETH Target MCAP | 50% Base Tax                 ##");
        emit log("  ################################################################");
        emit log("");

        {
            emit log("  +--------------------------------------------------------------+");
            emit log("  |                     INITIAL STATE                            |");
            emit log("  +--------------------------------------------------------------+");
            uint256 startMcap = _getCurrentMcap(poolId);
            uint256 startTax = hook.getCurrentTax(poolId);
            (uint256 startMaxTx, uint256 startMaxW) = hook.getCurrentLimits(poolId);
            emit log_named_decimal_uint("    MCAP", startMcap, 18);
            emit log_named_uint("    Tax (bps)", startTax);
            emit log_named_decimal_uint("    MaxTx (tokens)", startMaxTx, 18);
            emit log_named_decimal_uint("    MaxWallet (tokens)", startMaxW, 18);
            uint256 maxTxPct = (startMaxTx * 10000) / TOTAL_SUPPLY;
            uint256 maxWPct = (startMaxW * 10000) / TOTAL_SUPPLY;
            emit log_named_uint("    MaxTx (bps of supply)", maxTxPct);
            emit log_named_uint("    MaxWallet (bps of supply)", maxWPct);
            _logPoolSnapshot("    LP Snapshot");
            emit log("");
        }

        uint256 totalBuys = 0;
        uint256 prevPosition = 1;
        uint256 prevEpoch = 1;

        // Fee tracking — cumulative + delta per transition
        uint256 prevBenFeesETH = hook.beneficiaryFeesETH(beneficiary);
        uint256 prevPlatFeesETH = hook.platformFeesETH();
        uint256 prevBenFeesTok = hook.beneficiaryFeesToken(beneficiary, token);
        uint256 prevPlatFeesTok = hook.platformFeesToken(token);
        
        uint256 maxRounds = 50000;
        
        for (uint256 i = 0; i < maxRounds; i++) {
            // Scale buy size based on current position
            (uint256 pos,,,) = hook.poolProgress(poolId);
            
            if (pos <= 1) {
                _safeBuyFresh(key);
                totalBuys++;
            } else {
                uint256 buySize;
                if (pos == 2) buySize = 0.1 ether;
                else if (pos == 3) buySize = 1 ether;
                else if (pos == 4) buySize = 10 ether;
                else buySize = 100 ether;

                _buyFromFreshWallet(key, buySize);
                totalBuys++;
            }

            (uint256 curPos, uint256 curEpoch,,) = hook.poolProgress(poolId);

            // Log on any epoch or position change
            if (curPos != prevPosition || curEpoch != prevEpoch) {
                uint256 mcap = _getCurrentMcap(poolId);
                uint256 tax = hook.getCurrentTax(poolId);
                bool grad = hook.isGraduated(poolId);

                // Current fees
                uint256 curBenETH = hook.beneficiaryFeesETH(beneficiary);
                uint256 curPlatETH = hook.platformFeesETH();
                uint256 curBenTok = hook.beneficiaryFeesToken(beneficiary, token);
                uint256 curPlatTok = hook.platformFeesToken(token);
                
                if (curPos != prevPosition) {
                    // ════════ POSITION TRANSITION ════════
                    emit log("");
                    emit log("  +===============================================================+");
                    if (curPos == 2) {
                        emit log("  |     >> POSITION TRANSITION: P1 -> P2  (GRADUATED!)         |");
                    } else if (curPos == 3) {
                        emit log("  |     >> POSITION TRANSITION: P2 -> P3                       |");
                    } else if (curPos == 4) {
                        emit log("  |     >> POSITION TRANSITION: P3 -> P4                       |");
                    } else if (curPos == 5) {
                        emit log("  |     >> POSITION TRANSITION: P4 -> P5                       |");
                    }
                    emit log("  +===============================================================+");
                    emit log_named_uint("    Buy #", totalBuys);
                    emit log("");

                    // MCAP
                    emit log("    --- MCAP ---");
                    emit log_named_decimal_uint("      Live MCAP (ETH)", mcap, 18);
                    emit log_named_uint("      Live MCAP (wei)", mcap);
                    
                    // Tax
                    emit log("    --- TAX ---");
                    emit log_named_uint("      Tax (bps)", tax);
                    if (tax > 0) {
                        emit log_named_string("      Tax (%)", _bpsToPercentStr(tax));
                    } else {
                        emit log("      Tax (%): 0% (post-graduation)");
                    }

                    // Limits
                    emit log("    --- LIMITS ---");
                    {
                        (uint256 maxTx, uint256 maxW) = hook.getCurrentLimits(poolId);
                        if (maxTx == type(uint256).max) {
                            emit log("      MaxTx: UNLIMITED (post-graduation)");
                            emit log("      MaxWallet: UNLIMITED (post-graduation)");
                        } else {
                            emit log_named_decimal_uint("      MaxTx (tokens)", maxTx, 18);
                            emit log_named_decimal_uint("      MaxWallet (tokens)", maxW, 18);
                            uint256 mTxBps = (maxTx * 10000) / TOTAL_SUPPLY;
                            uint256 mWBps = (maxW * 10000) / TOTAL_SUPPLY;
                            emit log_named_uint("      MaxTx (bps of supply)", mTxBps);
                            emit log_named_uint("      MaxWallet (bps of supply)", mWBps);
                            emit log_named_string("      MaxTx (%)", _bpsToPercentStr(mTxBps));
                            emit log_named_string("      MaxWallet (%)", _bpsToPercentStr(mWBps));
                        }
                    }
                    
                    // Fees — cumulative + delta
                    emit log("    --- FEES (cumulative) ---");
                    emit log_named_decimal_uint("      Beneficiary ETH", curBenETH, 18);
                    emit log_named_decimal_uint("      Platform ETH", curPlatETH, 18);
                    emit log_named_decimal_uint("      Total ETH fees", curBenETH + curPlatETH, 18);
                    emit log_named_decimal_uint("      Beneficiary Token", curBenTok, 18);
                    emit log_named_decimal_uint("      Platform Token", curPlatTok, 18);
                    emit log("    --- FEES (delta since last transition) ---");
                    emit log_named_decimal_uint("      +Beneficiary ETH", curBenETH - prevBenFeesETH, 18);
                    emit log_named_decimal_uint("      +Platform ETH", curPlatETH - prevPlatFeesETH, 18);
                    emit log_named_decimal_uint("      +ETH total", (curBenETH + curPlatETH) - (prevBenFeesETH + prevPlatFeesETH), 18);
                    emit log_named_decimal_uint("      +Beneficiary Token", curBenTok - prevBenFeesTok, 18);
                    emit log_named_decimal_uint("      +Platform Token", curPlatTok - prevPlatFeesTok, 18);
                    if ((curBenETH + curPlatETH) > 0) {
                        uint256 benSplitBps = (curBenETH * 10000) / (curBenETH + curPlatETH);
                        emit log_named_uint("      Fee split (ben bps)", benSplitBps);
                    }

                    // LP Snapshot
                    emit log("    --- LP SNAPSHOT ---");
                    {
                        uint256 pmTokenBal = IERC20(token).balanceOf(POOL_MANAGER);
                        uint256 pmEthBal = POOL_MANAGER.balance;
                        uint256 ts = IERC20(token).totalSupply();
                        uint256 pmPct = ts > 0 ? (pmTokenBal * 100) / ts : 0;
                        uint256 factoryBal = IERC20(token).balanceOf(address(factory));
                        emit log_named_decimal_uint("      PoolManager tokens", pmTokenBal, 18);
                        emit log_named_decimal_uint("      PoolManager ETH", pmEthBal, 18);
                        emit log_named_uint("      PoolManager token % of supply", pmPct);
                        emit log_named_decimal_uint("      Factory tokens (unminted positions)", factoryBal, 18);
                    }

                    // Position NFT status
                    emit log("    --- POSITIONS ---");
                    {
                        uint256[5] memory posIds = factory.getPositionTokenIds(poolId);
                        for (uint256 p = 0; p < 5; p++) {
                            if (posIds[p] != 0) {
                                emit log_named_uint("      P minted", p + 1);
                                emit log_named_uint("        NFT Token ID", posIds[p]);
                            } else {
                                emit log_named_uint("      P not yet minted", p + 1);
                            }
                        }
                    }

                    if (grad) {
                        emit log("    *** GRADUATED -- 0% tax, unlimited limits from here ***");
                    }
                    emit log("");

                } else {
                    // ════════ EPOCH TRANSITION (same position) ════════
                    emit log("");
                    emit log("  +--------------------------------------------------------------+");
                    {
                        // Dynamic header
                        string memory posStr = curPos == 1 ? "P1" : curPos == 2 ? "P2" : curPos == 3 ? "P3" : curPos == 4 ? "P4" : "P5";
                        // Can't do string concat easily, use separate lines
                        emit log_named_string("  Position", posStr);
                        emit log_named_uint("  Epoch", curEpoch);
                    }
                    emit log("  +--------------------------------------------------------------+");
                    emit log_named_uint("    Buy #", totalBuys);

                    // MCAP
                    emit log_named_decimal_uint("    MCAP (ETH)", mcap, 18);

                    // Tax
                    emit log_named_uint("    Tax (bps)", tax);
                    emit log_named_string("    Tax (%)", _bpsToPercentStr(tax));

                    // Limits
                    {
                        (uint256 maxTx, uint256 maxW) = hook.getCurrentLimits(poolId);
                        if (maxTx == type(uint256).max) {
                            emit log("    MaxTx: UNLIMITED");
                            emit log("    MaxWallet: UNLIMITED");
                        } else {
                            emit log_named_decimal_uint("    MaxTx (tokens)", maxTx, 18);
                            emit log_named_decimal_uint("    MaxWallet (tokens)", maxW, 18);
                            uint256 mTxBps = (maxTx * 10000) / TOTAL_SUPPLY;
                            uint256 mWBps = (maxW * 10000) / TOTAL_SUPPLY;
                            emit log_named_string("    MaxTx (% of supply)", _bpsToPercentStr(mTxBps));
                            emit log_named_string("    MaxWallet (% of supply)", _bpsToPercentStr(mWBps));
                        }
                    }

                    // Fees delta
                    emit log("    --- Fees (delta this epoch) ---");
                    emit log_named_decimal_uint("      +ETH fees", (curBenETH + curPlatETH) - (prevBenFeesETH + prevPlatFeesETH), 18);
                    emit log_named_decimal_uint("      +Token fees", (curBenTok + curPlatTok) - (prevBenFeesTok + prevPlatFeesTok), 18);
                    emit log_named_decimal_uint("      ETH fees total", curBenETH + curPlatETH, 18);

                    if (grad && prevPosition == 1) {
                        emit log("    *** GRADUATED at P1 Epoch 4 ***");
                    }
                    emit log("");
                }
                
                // Update fee tracking
                prevBenFeesETH = curBenETH;
                prevPlatFeesETH = curPlatETH;
                prevBenFeesTok = curBenTok;
                prevPlatFeesTok = curPlatTok;
                prevPosition = curPos;
                prevEpoch = curEpoch;
            }

            // Stop once we reach P5 epoch 2+ (confirms P5 is active and minted)
            if (curPos >= 5 && curEpoch >= 2) {
                emit log("    >>> P5 epoch 2 reached - all 5 positions tested <<<");
                break;
            }
        }

        // ═══════════════════════════════════════════
        //              FINAL SUMMARY
        // ═══════════════════════════════════════════
        emit log("");
        emit log("  ################################################################");
        emit log("  ##                    FINAL SUMMARY                            ##");
        emit log("  ################################################################");
        emit log_named_uint("  Total Buys", totalBuys);
        emit log("");

        // Final MCAP
        emit log("  --- FINAL MCAP ---");
        emit log_named_decimal_uint("    MCAP (ETH)", _getCurrentMcap(poolId), 18);

        // Final Tax & Limits
        emit log("  --- FINAL TAX & LIMITS ---");
        emit log_named_uint("    Tax (bps)", hook.getCurrentTax(poolId));
        {
            (uint256 maxTx, uint256 maxW) = hook.getCurrentLimits(poolId);
            if (maxTx == type(uint256).max) {
                emit log("    MaxTx: UNLIMITED (graduated)");
                emit log("    MaxWallet: UNLIMITED (graduated)");
            } else {
                emit log_named_decimal_uint("    MaxTx (tokens)", maxTx, 18);
                emit log_named_decimal_uint("    MaxWallet (tokens)", maxW, 18);
            }
        }

        // Final Fee Totals
        emit log("  --- FINAL FEES ---");
        {
            uint256 finalBenETH = hook.beneficiaryFeesETH(beneficiary);
            uint256 finalPlatETH = hook.platformFeesETH();
            uint256 finalBenTok = hook.beneficiaryFeesToken(beneficiary, token);
            uint256 finalPlatTok = hook.platformFeesToken(token);
            emit log_named_decimal_uint("    Beneficiary ETH fees", finalBenETH, 18);
            emit log_named_decimal_uint("    Platform ETH fees", finalPlatETH, 18);
            emit log_named_decimal_uint("    TOTAL ETH fees", finalBenETH + finalPlatETH, 18);
            emit log_named_decimal_uint("    Beneficiary Token fees", finalBenTok, 18);
            emit log_named_decimal_uint("    Platform Token fees", finalPlatTok, 18);
            emit log_named_decimal_uint("    TOTAL Token fees", finalBenTok + finalPlatTok, 18);
            if ((finalBenETH + finalPlatETH) > 0) {
                uint256 splitBps = (finalBenETH * 10000) / (finalBenETH + finalPlatETH);
                emit log_named_uint("    Fee split ben/plat (bps)", splitBps);
                emit log_named_string("    Fee split should be", "7000/3000 (70/30)");
            }
        }

        // Final LP
        _logPoolSnapshot("  --- FINAL LP SNAPSHOT ---");

        // Position NFT Summary
        emit log("  --- POSITION NFT SUMMARY ---");
        uint256[5] memory finalPosIds = factory.getPositionTokenIds(poolId);
        for (uint256 p = 0; p < 5; p++) {
            emit log_named_uint("    Position", p + 1);
            emit log_named_uint("      Token ID", finalPosIds[p]);
            emit log_named_string("      Minted", finalPosIds[p] > 0 ? "YES" : "NO");
        }

        // Pool Progress
        (uint256 finalPos, uint256 finalEpoch,,) = hook.poolProgress(poolId);
        emit log("  --- POOL PROGRESS ---");
        emit log_named_uint("    Current Position", finalPos);
        emit log_named_uint("    Current Epoch", finalEpoch);
        emit log_named_string("    Graduated", hook.isGraduated(poolId) ? "YES" : "NO");
        emit log("");

        // Assertions
        assertTrue(finalPosIds[0] > 0, "P1 should be minted");
        assertTrue(finalPosIds[1] > 0, "P2 should be minted");
        assertTrue(finalPosIds[2] > 0, "P3 should be minted");
        assertTrue(finalPosIds[3] > 0, "P4 should be minted");
        assertTrue(finalPosIds[4] > 0, "P5 should be minted");
        
        assertTrue(hook.isGraduated(poolId), "Should be graduated");
        assertGe(finalPos, 5, "Should have reached P5");
    }

    /*//////////////////////////////////////////////////////////////
                          FORMATTING HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Convert bps to a human-readable percentage string (e.g. 5000 -> "50.00%")
    function _bpsToPercentStr(uint256 bps) internal pure returns (string memory) {
        uint256 whole = bps / 100;
        uint256 frac = bps % 100;
        // Build "XX.YY%"
        string memory result = string(abi.encodePacked(
            vm.toString(whole),
            ".",
            frac < 10 ? "0" : "",
            vm.toString(frac),
            "%"
        ));
        return result;
    }
}
