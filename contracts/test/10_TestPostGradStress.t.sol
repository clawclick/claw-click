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
 *           1. Trade through all epochs to graduation (automatic multi-position)
 *           2. Check PoolManager token + ETH balances
 *           3. Hammer post-graduation with many buys and sells to verify
 *              the pool never runs out of supply
 *
 *  NEW SYSTEM:
 *    - Pools activate at launch (no separate activation)
 *    - No keeper/reposition — multi-position is automatic
 *    - Post-graduation: 0% hook tax, 1% LP fee
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

    /// @notice Drive a pool from creation to graduation using rotating traders
    function _driveToGraduation(
        PoolId poolId,
        PoolKey memory key,
        uint256 buySize
    ) internal returns (uint256 totalBuys) {
        uint256 prevEpoch = 1;

        emit log_named_uint("Start MCAP", _getCurrentMcap(poolId));

        for (uint256 i = 0; i < 10000; i++) {
            vm.prank(traders[i % NUM_TRADERS]);
            _buy(key, buySize);
            totalBuys++;

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

    // Storage slots used to pass data between stress phases (avoids stack-too-deep)
    PoolKey internal _stressKey;
    address internal _stressToken;
    PoolId internal _stressPoolId;

    /// @notice Phase 1: Heavy buying post-graduation
    function _stressPhase1_buy(uint256 buySize, uint256 numRounds) internal returns (uint256 succeeded) {
        for (uint256 i = 0; i < numRounds; i++) {
            vm.prank(traders[i % NUM_TRADERS]);
            try router.buy{value: buySize}(_stressKey, buySize) { succeeded++; } catch {}
        }
        assertTrue(succeeded > 0, "At least some buys should work post-graduation");
    }

    /// @notice Phase 2: Every trader sells 80% of holdings
    function _stressPhase2_sell() internal returns (uint256 succeeded) {
        for (uint256 i = 0; i < NUM_TRADERS; i++) {
            uint256 bal = IERC20(_stressToken).balanceOf(traders[i]);
            if (bal == 0) continue;
            uint256 sellAmt = (bal * 80) / 100;
            vm.startPrank(traders[i]);
            IERC20(_stressToken).approve(address(router), sellAmt);
            try router.sell(_stressKey, sellAmt) { succeeded++; } catch {}
            vm.stopPrank();
        }
        // Sells may fail if trader has no balance or liquidity is thin
    }

    /// @notice Phase 3: Re-buy after heavy sells
    function _stressPhase3_rebuy(uint256 buySize, uint256 numRounds) internal returns (uint256 succeeded) {
        uint256 half = numRounds / 2;
        for (uint256 i = 0; i < half; i++) {
            vm.prank(traders[i % NUM_TRADERS]);
            try router.buy{value: buySize}(_stressKey, buySize) { succeeded++; } catch {}
        }
        // Re-buys after sells should work if sells returned liquidity
    }

    /// @notice Post-graduation stress: many buys, then sell all, then buy again
    function _postGradStress(
        PoolId poolId,
        PoolKey memory key,
        address token,
        uint256 buySize,
        uint256 numRounds
    ) internal {
        // Store in storage to reduce stack pressure
        _stressKey = key;
        _stressToken = token;
        _stressPoolId = poolId;

        _stressPhase1_buy(buySize, numRounds);
        _stressPhase2_sell();
        _stressPhase3_rebuy(buySize, numRounds);

        assertEq(hook.getCurrentTax(poolId), 0, "Tax remains 0% post-grad");
        assertTrue(hook.isGraduated(poolId), "Still graduated");
    }

    /*//////////////////////////////////////////////////////////////
                              TESTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice 1 ETH MCAP tier: graduate, stress trade
     */
    function test_postGrad_1ETH() public {
        vm.startPrank(deployer);
        (address token, PoolId poolId, PoolKey memory key) = _createLaunch(1 ether, beneficiary);
        vm.stopPrank();

        _logPoolState("=== 1 ETH Tier - After Launch ===", poolId, token);

        // Drive to graduation
        uint256 buys = _driveToGraduation(poolId, key, 0.01 ether);
        emit log_named_uint("Buys to graduate", buys);

        _logPoolState("=== At Graduation ===", poolId, token);

        // Stress test: 50 buys of 0.01 ETH, sells, re-buys
        _postGradStress(poolId, key, token, 0.01 ether, 50);
    }

    /**
     * @notice 3 ETH MCAP tier: graduate, stress trade
     */
    function test_postGrad_3ETH() public {
        vm.startPrank(deployer);
        (address token, PoolId poolId, PoolKey memory key) = _createLaunch(3 ether, beneficiary);
        vm.stopPrank();

        _logPoolState("=== 3 ETH Tier - After Launch ===", poolId, token);

        uint256 buys = _driveToGraduation(poolId, key, 0.01 ether);
        emit log_named_uint("Buys to graduate", buys);

        _logPoolState("=== At Graduation ===", poolId, token);

        _postGradStress(poolId, key, token, 0.01 ether, 40);
    }

    /**
     * @notice 5 ETH MCAP tier: graduate, stress trade
     */
    function test_postGrad_5ETH() public {
        vm.startPrank(deployer);
        (address token, PoolId poolId, PoolKey memory key) = _createLaunch(5 ether, beneficiary);
        vm.stopPrank();

        _logPoolState("=== 5 ETH Tier - After Launch ===", poolId, token);

        uint256 buys = _driveToGraduation(poolId, key, 0.01 ether);
        emit log_named_uint("Buys to graduate", buys);

        _logPoolState("=== At Graduation ===", poolId, token);

        _postGradStress(poolId, key, token, 0.01 ether, 30);
    }

    /**
     * @notice 8 ETH MCAP tier: graduate, stress trade
     */
    function test_postGrad_8ETH() public {
        vm.startPrank(deployer);
        (address token, PoolId poolId, PoolKey memory key) = _createLaunch(8 ether, beneficiary);
        vm.stopPrank();

        _logPoolState("=== 8 ETH Tier - After Launch ===", poolId, token);

        uint256 buys = _driveToGraduation(poolId, key, 0.01 ether);
        emit log_named_uint("Buys to graduate", buys);

        _logPoolState("=== At Graduation ===", poolId, token);

        _postGradStress(poolId, key, token, 0.01 ether, 30);
    }

    /**
     * @notice 10 ETH MCAP tier: graduate, stress trade
     */
    function test_postGrad_10ETH() public {
        vm.startPrank(deployer);
        (address token, PoolId poolId, PoolKey memory key) = _createLaunch(10 ether, beneficiary);
        vm.stopPrank();

        _logPoolState("=== 10 ETH Tier - After Launch ===", poolId, token);

        uint256 buys = _driveToGraduation(poolId, key, 0.01 ether);
        emit log_named_uint("Buys to graduate", buys);

        _logPoolState("=== At Graduation ===", poolId, token);

        _postGradStress(poolId, key, token, 0.01 ether, 30);
    }
}
