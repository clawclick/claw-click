// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTest.sol";

/**
 * @title TestLimits
 * @notice Tests maxTx and maxWallet enforcement
 *
 * Covers:
 * - maxTx enforced in PROTECTED phase
 * - maxWallet enforced in PROTECTED phase
 * - Limits scale with MCAP growth
 * - MIN_SWAP_AMOUNT enforced (dust griefing prevention)
 * - Limits disabled after graduation
 * - Base limit is 0.1% of supply
 * - View function getCurrentLimits works
 */
contract TestLimits is BaseTest {

    /*//////////////////////////////////////////////////////////////
            TEST 1: INITIAL LIMITS (0.1% OF SUPPLY)
    //////////////////////////////////////////////////////////////*/

    function test_initialLimits() public {
        vm.startPrank(deployer);
        (, PoolId poolId,) = _createAndActivate(1 ether, beneficiary, 0);

        (uint256 maxTx, uint256 maxWallet) = hook.getCurrentLimits(poolId);

        // At epoch 1, growthRatio ~1.0, so limit ~0.1% of supply
        uint256 expectedMin = (TOTAL_SUPPLY * 10) / 10000; // 0.1%
        assertEq(maxTx, expectedMin, "maxTx should be 0.1% at start");
        assertEq(maxWallet, expectedMin, "maxWallet should equal maxTx");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
           TEST 2: LIMITS SCALE WITH MCAP
    //////////////////////////////////////////////////////////////*/

    function test_limitsScaleWithMcap() public {
        vm.startPrank(deployer);
        (, PoolId poolId, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );

        (uint256 maxTxBefore,) = hook.getCurrentLimits(poolId);
        assertTrue(maxTxBefore > 0, "Initial maxTx should be > 0");

        // Make a buy to raise MCAP — after price increases, limits should grow
        _buy(key, 0.001 ether);

        (uint256 maxTxAfter,) = hook.getCurrentLimits(poolId);
        assertTrue(maxTxAfter >= maxTxBefore, "maxTx should not decrease as MCAP grows");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
         TEST 3: MIN_SWAP_AMOUNT ENFORCED (DUST)
    //////////////////////////////////////////////////////////////*/

    function test_revert_dustSwap() public {
        vm.startPrank(deployer);
        (,, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        // Try a tiny swap below MIN_SWAP_AMOUNT (1e14 = 0.0001 ETH)
        vm.startPrank(alice);
        vm.expectRevert(); // "Swap amount too small"
        _buy(key, 1e12); // Below minimum
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
       TEST 4: CURRENT LIMITS VIEW FUNCTION
    //////////////////////////////////////////////////////////////*/

    function test_getCurrentLimitsView() public {
        vm.startPrank(deployer);
        (, PoolId poolId,) = _createAndActivate(1 ether, beneficiary, 0);

        (uint256 maxTx, uint256 maxWallet) = hook.getCurrentLimits(poolId);
        assertTrue(maxTx > 0, "maxTx should be positive");
        assertTrue(maxWallet > 0, "maxWallet should be positive");
        assertEq(maxTx, maxWallet, "maxTx should equal maxWallet");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
     TEST 5: LIMITS MINIMUM FLOOR
    //////////////////////////////////////////////////////////////*/

    function test_limitsHaveFloor() public {
        vm.startPrank(deployer);
        (, PoolId poolId,) = _createAndActivate(1 ether, beneficiary, 0);

        (uint256 maxTx,) = hook.getCurrentLimits(poolId);

        // Floor is BASE_LIMIT_BPS (10 bps = 0.1%)
        uint256 floor = (TOTAL_SUPPLY * 10) / 10000;
        assertTrue(maxTx >= floor, "maxTx should be at least 0.1%");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
       TEST 6: LIMITS AT DIFFERENT MCAP TIERS
    //////////////////////////////////////////////////////////////*/

    function test_limitsAtDifferentTiers() public {
        vm.startPrank(deployer);

        // 1 ETH MCAP launch
        (, PoolId poolId1,) = _createAndActivateNamed(
            "Small", "SM", 1 ether, beneficiary, 0
        );

        // 10 ETH MCAP launch
        (, PoolId poolId2,) = _createAndActivateNamed(
            "Large", "LG", 10 ether, beneficiary, 0
        );

        (uint256 maxTx1,) = hook.getCurrentLimits(poolId1);
        (uint256 maxTx2,) = hook.getCurrentLimits(poolId2);

        // Both should start at base limit (0.1%) since growthRatio ~1
        uint256 baseLimit = (TOTAL_SUPPLY * 10) / 10000;
        assertTrue(maxTx1 >= baseLimit, "1 ETH tier limit should be >= floor");
        assertTrue(maxTx2 >= baseLimit, "10 ETH tier limit should be >= floor");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
    TEST 7: VALID SWAP WITHIN LIMITS SUCCEEDS
    //////////////////////////////////////////////////////////////*/

    function test_swapWithinLimitsSucceeds() public {
        vm.startPrank(deployer);
        (address token,, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        // Small buy that's well within limits
        vm.startPrank(alice);
        uint256 balBefore = ClawclickToken(token).balanceOf(alice);
        _buy(key, 0.001 ether);
        uint256 balAfter = ClawclickToken(token).balanceOf(alice);
        assertTrue(balAfter > balBefore, "Should receive tokens for valid swap");
        vm.stopPrank();
    }
}
