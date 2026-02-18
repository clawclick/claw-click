// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTest.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Currency} from "v4-core/src/types/Currency.sol";

/**
 * @title TestPostGradStress
 * @notice Graduation stress tests across multiple MCAP tiers.
 *         For each tier:
 *           1. Trade through all epochs to graduation (keeper-assisted)
 *           2. Reposition to full range
 *           3. Check PoolManager token + ETH balances
 *           4. Hammer post-graduation with many buys and sells to verify
 *              the pool never runs out of supply
 */
contract TestPostGradStress is BaseTest {
    using PoolIdLibrary for PoolKey;

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
                         INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Keeper check: reposition if near LP boundary or graduated
    function _keeperCheck(PoolId poolId, PoolKey memory key) internal returns (bool) {
        (bool needed,,) = factory.needsReposition(poolId);
        if (needed) {
            vm.prank(deployer);
            factory.repositionByEpoch(key);
            return true;
        }
        return false;
    }

    /// @notice Drive a pool from activation to graduation with keeper
    function _driveToGraduation(
        PoolId poolId,
        PoolKey memory key,
        uint256 buySize
    ) internal returns (uint256 totalBuys, uint256 totalRepos) {
        uint256 traderIdx = 0;
        uint256 prevEpoch = 0;

        emit log_named_uint("Start MCAP", _getCurrentMcap(poolId));

        for (uint256 i = 0; i < 10000; i++) {
            if (_keeperCheck(poolId, key)) {
                totalRepos++;
                emit log_named_uint("  [KEEPER] Repositioned at MCAP", _getCurrentMcap(poolId));
            }

            address trader = traders[traderIdx % NUM_TRADERS];
            vm.prank(trader);
            _buy(key, buySize);
            totalBuys++;
            traderIdx++;

            uint256 epoch = hook.getCurrentEpoch(poolId);
            bool grad = hook.isGraduated(poolId);

            if (epoch != prevEpoch || grad) {
                emit log("  ----------------------------------------");
                emit log_named_uint("    Buy #", totalBuys);
                emit log_named_uint("    MCAP", _getCurrentMcap(poolId));
                emit log_named_uint("    Epoch", epoch);
                emit log_named_uint("    Tax bps", hook.getCurrentTax(poolId));
                if (grad) {
                    emit log("    ** GRADUATED **");
                }
                prevEpoch = epoch;
            }

            if (grad) break;
        }
        require(hook.isGraduated(poolId), "Failed to graduate");

        emit log("  ========================================");
        emit log_named_uint("  MCAP at graduation", _getCurrentMcap(poolId));
        emit log_named_uint("  Total Buys", totalBuys);
        emit log_named_uint("  Total Repositions", totalRepos);

        // Log fees
        uint256 bFees = hook.beneficiaryFeesETH(beneficiary);
        uint256 pFees = hook.platformFeesETH();
        emit log_named_uint("  Beneficiary ETH fees", bFees);
        emit log_named_uint("  Platform ETH fees", pFees);
    }

    /// @notice Log pool state: MCAP, PoolManager balances, token supply info
    function _logPoolState(
        string memory label,
        PoolId poolId,
        address token
    ) internal {
        uint256 mcap = _getCurrentMcap(poolId);
        uint256 pmTokenBal = IERC20(token).balanceOf(POOL_MANAGER);
        uint256 pmEthBal = POOL_MANAGER.balance;
        uint256 totalSupply = IERC20(token).totalSupply();

        emit log(label);
        emit log_named_uint("  MCAP (wei)", mcap);
        emit log_named_decimal_uint("  MCAP (ETH)", mcap, 18);
        emit log_named_decimal_uint("  PM token balance", pmTokenBal, 18);
        emit log_named_decimal_uint("  PM ETH balance", pmEthBal, 18);
        emit log_named_decimal_uint("  Total supply", totalSupply, 18);
        emit log_named_uint("  PM token % of supply", (pmTokenBal * 100) / totalSupply);
    }

    /// @notice Post-graduation stress: many buys, then sell all, then buy again
    function _postGradStress(
        PoolId poolId,
        PoolKey memory key,
        address token,
        uint256 buySize,
        uint256 numRounds
    ) internal {
        emit log("--- Post-Graduation Stress Trading ---");

        // PHASE 1: Heavy buying
        uint256 buysFailed = 0;
        for (uint256 i = 0; i < numRounds; i++) {
            address trader = traders[i % NUM_TRADERS];
            vm.prank(trader);
            try router.buy{value: buySize}(key, buySize) {
                // success
            } catch {
                buysFailed++;
                emit log_named_uint("  Buy FAILED at round", i);
            }
        }
        emit log_named_uint("  Buys completed", numRounds - buysFailed);
        emit log_named_uint("  Buys failed", buysFailed);
        assertEq(buysFailed, 0, "No buys should fail post-graduation");

        _logPoolState("  After heavy buying:", poolId, token);

        // PHASE 2: Every trader sells 80% of their holdings
        uint256 sellsFailed = 0;
        for (uint256 i = 0; i < NUM_TRADERS; i++) {
            address trader = traders[i];
            uint256 bal = IERC20(token).balanceOf(trader);
            if (bal == 0) continue;

            uint256 sellAmt = (bal * 80) / 100;
            vm.startPrank(trader);
            IERC20(token).approve(address(router), sellAmt);
            try router.sell(key, sellAmt) {
                // success
            } catch {
                sellsFailed++;
                emit log_named_uint("  Sell FAILED for trader", i);
            }
            vm.stopPrank();
        }
        emit log_named_uint("  Sells failed", sellsFailed);
        assertEq(sellsFailed, 0, "No sells should fail post-graduation");

        _logPoolState("  After heavy selling:", poolId, token);

        // PHASE 3: Buy again after heavy sell — pool must still work
        uint256 rebuysFailed = 0;
        for (uint256 i = 0; i < numRounds / 2; i++) {
            address trader = traders[i % NUM_TRADERS];
            vm.prank(trader);
            try router.buy{value: buySize}(key, buySize) {
                // success
            } catch {
                rebuysFailed++;
                emit log_named_uint("  Re-buy FAILED at round", i);
            }
        }
        emit log_named_uint("  Re-buys completed", numRounds / 2 - rebuysFailed);
        emit log_named_uint("  Re-buys failed", rebuysFailed);
        assertEq(rebuysFailed, 0, "Re-buys should work after sells");

        _logPoolState("  After re-buying:", poolId, token);

        // PHASE 4: Verify tax is still 0
        assertEq(hook.getCurrentTax(poolId), 0, "Tax remains 0% post-grad");
        assertTrue(hook.isGraduated(poolId), "Still graduated");
    }

    /*//////////////////////////////////////////////////////////////
                              TESTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice 1 ETH MCAP tier: graduate, full-range reposition, stress trade
     */
    function test_postGrad_1ETH() public {
        vm.startPrank(deployer);
        (address token, PoolId poolId, PoolKey memory key) = _createLaunch(1 ether, beneficiary);
        vm.stopPrank();

        vm.prank(deployer);
        _activatePool(key, 1 ether);

        _logPoolState("=== 1 ETH Tier - After Activation ===", poolId, token);

        // Drive to graduation
        (uint256 buys, uint256 repos) = _driveToGraduation(poolId, key, 0.01 ether);
        emit log_named_uint("Buys to graduate", buys);
        emit log_named_uint("Repositions", repos);

        _logPoolState("=== At Graduation ===", poolId, token);

        // Full-range reposition
        vm.prank(deployer);
        factory.repositionByEpoch(key);

        _logPoolState("=== After Full-Range Reposition ===", poolId, token);

        // Stress test: 50 buys of 0.01 ETH, sells, re-buys
        _postGradStress(poolId, key, token, 0.01 ether, 50);
    }

    /**
     * @notice 3 ETH MCAP tier: graduate, full-range reposition, stress trade
     */
    function test_postGrad_3ETH() public {
        vm.startPrank(deployer);
        (address token, PoolId poolId, PoolKey memory key) = _createLaunch(3 ether, beneficiary);
        vm.stopPrank();

        vm.prank(deployer);
        _activatePool(key, 3 ether);

        _logPoolState("=== 3 ETH Tier - After Activation ===", poolId, token);

        (uint256 buys, uint256 repos) = _driveToGraduation(poolId, key, 0.01 ether);
        emit log_named_uint("Buys to graduate", buys);
        emit log_named_uint("Repositions", repos);

        _logPoolState("=== At Graduation ===", poolId, token);

        vm.prank(deployer);
        factory.repositionByEpoch(key);

        _logPoolState("=== After Full-Range Reposition ===", poolId, token);

        _postGradStress(poolId, key, token, 0.01 ether, 40);
    }

    /**
     * @notice 5 ETH MCAP tier: graduate, full-range reposition, stress trade
     */
    function test_postGrad_5ETH() public {
        vm.startPrank(deployer);
        (address token, PoolId poolId, PoolKey memory key) = _createLaunch(5 ether, beneficiary);
        vm.stopPrank();

        vm.prank(deployer);
        _activatePool(key, 5 ether);

        _logPoolState("=== 5 ETH Tier - After Activation ===", poolId, token);

        (uint256 buys, uint256 repos) = _driveToGraduation(poolId, key, 0.01 ether);
        emit log_named_uint("Buys to graduate", buys);
        emit log_named_uint("Repositions", repos);

        _logPoolState("=== At Graduation ===", poolId, token);

        vm.prank(deployer);
        factory.repositionByEpoch(key);

        _logPoolState("=== After Full-Range Reposition ===", poolId, token);

        _postGradStress(poolId, key, token, 0.01 ether, 30);
    }

    /**
     * @notice 8 ETH MCAP tier: graduate, full-range reposition, stress trade
     */
    function test_postGrad_8ETH() public {
        vm.startPrank(deployer);
        (address token, PoolId poolId, PoolKey memory key) = _createLaunch(8 ether, beneficiary);
        vm.stopPrank();

        vm.prank(deployer);
        _activatePool(key, 8 ether);

        _logPoolState("=== 8 ETH Tier - After Activation ===", poolId, token);

        (uint256 buys, uint256 repos) = _driveToGraduation(poolId, key, 0.01 ether);
        emit log_named_uint("Buys to graduate", buys);
        emit log_named_uint("Repositions", repos);

        _logPoolState("=== At Graduation ===", poolId, token);

        vm.prank(deployer);
        factory.repositionByEpoch(key);

        _logPoolState("=== After Full-Range Reposition ===", poolId, token);

        _postGradStress(poolId, key, token, 0.01 ether, 30);
    }

    /**
     * @notice 10 ETH MCAP tier: graduate, full-range reposition, stress trade
     */
    function test_postGrad_10ETH() public {
        vm.startPrank(deployer);
        (address token, PoolId poolId, PoolKey memory key) = _createLaunch(10 ether, beneficiary);
        vm.stopPrank();

        vm.prank(deployer);
        _activatePool(key, 10 ether);

        _logPoolState("=== 10 ETH Tier - After Activation ===", poolId, token);

        (uint256 buys, uint256 repos) = _driveToGraduation(poolId, key, 0.01 ether);
        emit log_named_uint("Buys to graduate", buys);
        emit log_named_uint("Repositions", repos);

        _logPoolState("=== At Graduation ===", poolId, token);

        vm.prank(deployer);
        factory.repositionByEpoch(key);

        _logPoolState("=== After Full-Range Reposition ===", poolId, token);

        _postGradStress(poolId, key, token, 0.01 ether, 30);
    }
}
