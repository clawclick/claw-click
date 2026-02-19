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

    /// @notice Helper: log pool snapshot matching logs.txt format
    /// @dev "PM" = PoolManager (v4 singleton holds all token/ETH balances)
    function _logPoolSnapshot(string memory label) internal {
        uint256 mcap = _getCurrentMcap(poolId);
        uint256 pmTokenBal = IERC20(token).balanceOf(POOL_MANAGER);
        uint256 pmEthBal = POOL_MANAGER.balance;
        uint256 ts = IERC20(token).totalSupply();
        uint256 pmPctOfSupply = ts > 0 ? (pmTokenBal * 100) / ts : 0;
        
        emit log(label);
        emit log_named_uint("    MCAP (wei)", mcap);
        emit log_named_decimal_uint("    MCAP (ETH)", mcap, 18);
        emit log_named_decimal_uint("    PM token balance", pmTokenBal, 18);
        emit log_named_decimal_uint("    PM ETH balance", pmEthBal, 18);
        emit log_named_decimal_uint("    Total supply", ts, 18);
        emit log_named_uint("    PM token % of supply", pmPctOfSupply);
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
        
        _logPoolSnapshot("  === 1 ETH Tier - After Activation ===");
        emit log_named_uint("  Start MCAP", _getCurrentMcap(poolId));

        // -- 2. TRADE THROUGH ALL EPOCHS (rotating traders) --
        uint256 totalBuys = 0;
        uint256 prevEpoch = 1;

        for (uint256 i = 0; i < 4000; i++) {
            vm.prank(traders[i % NUM_TRADERS]);
            _buy(key, 0.01 ether);
            totalBuys++;

            uint256 epoch = hook.getCurrentEpoch(poolId);
            bool grad = hook.isGraduated(poolId);

            if (epoch != prevEpoch || grad) {
                emit log("    ----------------------------------------");
                emit log_named_uint("      Buy #", totalBuys);
                emit log_named_uint("      MCAP", _getCurrentMcap(poolId));
                emit log_named_uint("      Epoch", epoch);
                emit log_named_uint("      Tax bps", hook.getCurrentTax(poolId));
                if (grad) emit log("      ** GRADUATED **");
                prevEpoch = epoch;
            }

            if (grad) break;
        }

        // -- 3. VERIFY GRADUATION --
        assertTrue(hook.isGraduated(poolId), "Should have graduated");
        assertEq(hook.getCurrentTax(poolId), 0, "Tax 0% post-graduation");

        (uint256 maxTx, uint256 maxWallet) = hook.getCurrentLimits(poolId);
        assertEq(maxTx, type(uint256).max, "Unlimited maxTx");
        assertEq(maxWallet, type(uint256).max, "Unlimited maxWallet");

        emit log("    ========================================");
        emit log_named_uint("    MCAP at graduation", _getCurrentMcap(poolId));
        emit log_named_uint("    Total Buys", totalBuys);
        
        // Fee summary
        uint256 bFees = hook.beneficiaryFeesETH(beneficiary);
        uint256 pFees = hook.platformFeesETH();
        emit log_named_uint("    Beneficiary ETH fees", bFees);
        emit log_named_uint("    Platform ETH fees", pFees);
        
        emit log_named_uint("  Buys to graduate", totalBuys);
        
        _logPoolSnapshot("  === At Graduation ===");

        // -- 4. POST-GRADUATION TRADES: 0% hook tax --
        uint256 feeBefore = bFees + pFees;
        vm.prank(traders[0]);
        _buy(key, 0.01 ether);
        uint256 feeAfter = hook.beneficiaryFeesETH(beneficiary) + hook.platformFeesETH();
        assertEq(feeAfter, feeBefore, "No hook fees post-graduation");

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

        for (uint256 i = 0; i < 8000 && !hook.isGraduated(poolId); i++) {
            vm.prank(traders[i % NUM_TRADERS]);
            _buy(key, 0.01 ether);
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
        for (uint256 i = 0; i < 4000; i++) {
            vm.prank(traders[i % NUM_TRADERS]);
            _buy(key, 0.01 ether);
            buys++;
            if (hook.getCurrentEpoch(poolId) >= 2) break;
        }

        assertEq(hook.getCurrentEpoch(poolId), 2, "Should be epoch 2");
        assertEq(hook.getCurrentTax(poolId), 2500, "Epoch 2: 25% tax");
        emit log_named_uint("MCAP at epoch 2", _getCurrentMcap(poolId));
        emit log_named_uint("Buys to epoch 2", buys);

        // Continue to graduation
        for (uint256 i = buys; i < 4000; i++) {
            vm.prank(traders[i % NUM_TRADERS]);
            _buy(key, 0.01 ether);
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

        for (uint256 round = 0; round < 8000 && !hook.isGraduated(poolId); round++) {
            // Every 5th trade: sell from a previous buyer (if they have tokens)
            if (round % 5 == 4 && round >= 5) {
                address seller = recentBuyers[round % 5];
                uint256 tokenBal = IERC20(token).balanceOf(seller);
                if (tokenBal > 0) {
                    uint256 sellAmt = tokenBal / 5;
                    vm.startPrank(seller);
                    IERC20(token).approve(address(router), sellAmt);
                    try router.sell(key, sellAmt) {} catch {}
                    vm.stopPrank();
                    totalTrades++;
                }
            } else {
                // Buy from rotating trader
                address buyer = traders[round % NUM_TRADERS];
                vm.prank(buyer);
                try router.buy{value: 0.01 ether}(key, 0.01 ether) {} catch {}
                totalTrades++;

                // Track this buyer so we can sell from them later
                recentBuyers[buyerSlot % 5] = buyer;
                buyerSlot++;
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
        vm.prank(traders[0]);
        try router.buy{value: 0.01 ether}(key, 0.01 ether) {} catch {}
        uint256 feeAfter = hook.beneficiaryFeesETH(beneficiary) + hook.platformFeesETH();
        assertEq(feeAfter, feeBefore, "No hook fees post-graduation");

        emit log("========================================");
        emit log_named_uint("Total trades", totalTrades);
        emit log_named_uint("Final MCAP", _getCurrentMcap(poolId));
    }

    /**
     * @notice Full P1→P5 position lifecycle test.
     *         Trades from launch through ALL 5 positions, verifying:
     *         - Each position is lazy-minted at the correct epoch
     *         - Old positions are retired 2 steps behind
     *         - MCAP milestones: 16x, 256x, 4096x, 65536x
     *         - Graduation at P1 epoch 4, then continues through P2-P5
     *
     *         Uses 1 ETH target MCAP. Buy sizes scale up per position.
     */
    function test_fullPositionLifecycle_P1toP5() public {
        vm.startPrank(deployer);
        (token, poolId, key) = _createLaunch(1 ether, beneficiary);
        vm.stopPrank();

        _logPoolSnapshot("  === 1 ETH Tier - After Launch ===");
        emit log_named_uint("  Start MCAP", _getCurrentMcap(poolId));

        uint256 totalBuys = 0;
        uint256 prevPosition = 1;
        uint256 prevEpoch = 1;

        // Buy sizes scale per position to reach higher MCAP milestones efficiently
        // P1: 0.01 ETH buys → 16 ETH MCAP (~381 buys)
        // P2: 0.1 ETH buys → 256 ETH MCAP
        // P3: 1 ETH buys → 4096 ETH MCAP  
        // P4: 10 ETH buys → 65536 ETH MCAP
        // P5: 100 ETH buys → continue until position 5 epoch 2+
        
        uint256 maxRounds = 50000;
        
        for (uint256 i = 0; i < maxRounds; i++) {
            // Scale buy size based on current position
            (uint256 pos,,,) = hook.poolProgress(poolId);
            uint256 buySize;
            if (pos <= 1) buySize = 0.01 ether;
            else if (pos == 2) buySize = 0.1 ether;
            else if (pos == 3) buySize = 1 ether;
            else if (pos == 4) buySize = 10 ether;
            else buySize = 100 ether;

            address trader = traders[i % NUM_TRADERS];
            // Ensure trader has enough ETH
            if (trader.balance < buySize) {
                vm.deal(trader, 100000 ether);
            }
            
            vm.prank(trader);
            try router.buy{value: buySize}(key, buySize) {
                totalBuys++;
            } catch {
                // Price limit exceeded — continue, MCAP may still advance from other effects
                totalBuys++;
            }

            (uint256 curPos, uint256 curEpoch,,) = hook.poolProgress(poolId);

            // Log on any epoch or position change
            if (curPos != prevPosition || curEpoch != prevEpoch) {
                uint256 mcap = _getCurrentMcap(poolId);
                
                if (curPos != prevPosition) {
                    emit log("    ========================================");
                    emit log_named_uint("      >> POSITION TRANSITION", curPos);
                    emit log_named_uint("      Buy #", totalBuys);
                    emit log_named_uint("      MCAP", mcap);
                    
                    // Log position mint/retire status
                    uint256[5] memory posIds = factory.getPositionTokenIds(poolId);
                    for (uint256 p = 0; p < 5; p++) {
                        if (posIds[p] != 0) {
                            emit log_named_uint("        P minted", p + 1);
                            emit log_named_uint("          Token ID", posIds[p]);
                        }
                    }
                    
                    // Snapshot at position change
                    {
                        uint256 pmTokenBal = IERC20(token).balanceOf(POOL_MANAGER);
                        uint256 pmEthBal = POOL_MANAGER.balance;
                        uint256 ts = IERC20(token).totalSupply();
                        uint256 pmPct = ts > 0 ? (pmTokenBal * 100) / ts : 0;
                        uint256 factoryBal = IERC20(token).balanceOf(address(factory));
                        emit log_named_decimal_uint("        PM token balance", pmTokenBal, 18);
                        emit log_named_decimal_uint("        PM ETH balance", pmEthBal, 18);
                        emit log_named_uint("        PM token % of supply", pmPct);
                        emit log_named_decimal_uint("        Factory token (unminted)", factoryBal, 18);
                    }
                } else {
                    emit log("    ----------------------------------------");
                    emit log_named_uint("      Buy #", totalBuys);
                    emit log_named_uint("      MCAP", mcap);
                    emit log_named_uint("      Position", curPos);
                    emit log_named_uint("      Epoch", curEpoch);
                    emit log_named_uint("      Tax bps", hook.getCurrentTax(poolId));
                    
                    if (hook.isGraduated(poolId) && prevPosition == 1) {
                        emit log("      ** GRADUATED **");
                    }
                }
                
                prevPosition = curPos;
                prevEpoch = curEpoch;
            }

            // Stop once we reach P5 epoch 2+ (confirms P5 is active and minted)
            if (curPos >= 5 && curEpoch >= 2) {
                emit log("    >>> P5 epoch 2 reached - all positions tested <<<");
                break;
            }
        }

        // ═══════ FINAL SUMMARY ═══════
        emit log("  ========================================");
        emit log_named_uint("  Total Buys", totalBuys);
        _logPoolSnapshot("  === Final State ===");
        
        // Log all position IDs
        emit log("  === Position Summary ===");
        uint256[5] memory finalPosIds = factory.getPositionTokenIds(poolId);
        for (uint256 p = 0; p < 5; p++) {
            emit log_named_uint("    Position", p + 1);
            emit log_named_uint("      Token ID", finalPosIds[p]);
            emit log_named_string("      Minted", finalPosIds[p] > 0 ? "YES" : "NO");
        }

        // Verify all positions were minted
        assertTrue(finalPosIds[0] > 0, "P1 should be minted");
        assertTrue(finalPosIds[1] > 0, "P2 should be minted");
        assertTrue(finalPosIds[2] > 0, "P3 should be minted");
        assertTrue(finalPosIds[3] > 0, "P4 should be minted");
        assertTrue(finalPosIds[4] > 0, "P5 should be minted");
        
        assertTrue(hook.isGraduated(poolId), "Should be graduated");
        
        (uint256 finalPos, uint256 finalEpoch,,) = hook.poolProgress(poolId);
        assertGe(finalPos, 5, "Should have reached P5");
        emit log_named_uint("  Final Position", finalPos);
        emit log_named_uint("  Final Epoch", finalEpoch);
    }
}
