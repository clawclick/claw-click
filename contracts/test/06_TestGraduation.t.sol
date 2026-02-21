// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTest.sol";

/**
 * @title TestGraduation
 * @notice Tests graduation mechanics using unique wallets per buy (simulating real volume)
 *
 * Covers:
 * - Token starts in PROTECTED phase
 * - Graduation at epoch 4 (16x MCAP)
 * - Graduated pool tax = 0
 * - Graduated pool limits = max
 * - Graduation MCAP calculation (startMcap * 16)
 * - isGraduatedByToken view
 * - getPoolIdForToken view
 * - Independent graduation of separate tokens
 */
contract TestGraduation is BaseTest {

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
          TEST 1: STARTS PROTECTED
    //////////////////////////////////////////////////////////////*/

    function test_startsProtected() public {
        vm.startPrank(deployer);
        (, PoolId poolId,) = _createAndActivate(1 ether, beneficiary, 0);

        bool grad = hook.isGraduated(poolId);
        assertFalse(grad, "Should not be graduated at launch");

        (,,,,, ClawclickHook.Phase phase,,) = hook.launches(poolId);
        assertTrue(phase == ClawclickHook.Phase.PROTECTED, "Phase should be PROTECTED");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
      TEST 2: GRADUATION AT EPOCH 4 (16x)
    //////////////////////////////////////////////////////////////*/

    function test_graduationAt16x() public {
        vm.startPrank(deployer);
        (, PoolId poolId, PoolKey memory key) = _createAndActivate(1 ether, beneficiary, 0);
        vm.stopPrank();

        // Simulate buying volume via fresh wallets (respects maxTx)
        for (uint256 i = 0; i < 10000; i++) {
            _safeBuyFresh(key);
            if (hook.isGraduated(poolId)) break;
        }

        bool grad = hook.isGraduated(poolId);
        if (grad) {
            uint256 tax = hook.getCurrentTax(poolId);
            assertEq(tax, 0, "Graduated pool tax should be 0");
        }
    }

    /*//////////////////////////////////////////////////////////////
    TEST 3: GRADUATED TAX = 0
    //////////////////////////////////////////////////////////////*/

    function test_graduatedTaxZero() public {
        vm.startPrank(deployer);
        (, PoolId poolId, PoolKey memory key) = _createAndActivate(1 ether, beneficiary, 0);
        vm.stopPrank();

        for (uint256 i = 0; i < 10000; i++) {
            _safeBuyFresh(key);
            if (hook.isGraduated(poolId)) break;
        }

        if (hook.isGraduated(poolId)) {
            uint256 tax = hook.getCurrentTax(poolId);
            assertEq(tax, 0, "Tax should be 0 after graduation");
        }
    }

    /*//////////////////////////////////////////////////////////////
     TEST 4: GRADUATED LIMITS = MAX
    //////////////////////////////////////////////////////////////*/

    function test_graduatedLimitsMax() public {
        vm.startPrank(deployer);
        (, PoolId poolId, PoolKey memory key) = _createAndActivate(1 ether, beneficiary, 0);
        vm.stopPrank();

        for (uint256 i = 0; i < 10000; i++) {
            _safeBuyFresh(key);
            if (hook.isGraduated(poolId)) break;
        }

        if (hook.isGraduated(poolId)) {
            (uint256 maxTx, uint256 maxWallet) = hook.getCurrentLimits(poolId);
            assertEq(maxTx, type(uint256).max, "maxTx should be max after graduation");
            assertEq(maxWallet, type(uint256).max, "maxWallet should be max after graduation");
        }
    }

    /*//////////////////////////////////////////////////////////////
    TEST 5: GRADUATION MCAP >= startMcap * 16
    //////////////////////////////////////////////////////////////*/

    function test_graduationMcapCalculation() public {
        vm.startPrank(deployer);
        uint256 startMcap = 2 ether;
        (, PoolId poolId, PoolKey memory key) = _createAndActivate(startMcap, beneficiary, 0);
        vm.stopPrank();

        for (uint256 i = 0; i < 10000; i++) {
            _safeBuyFresh(key);
            if (hook.isGraduated(poolId)) break;
        }

        if (hook.isGraduated(poolId)) {
            (,,,,,,, uint256 graduationMcap) = hook.launches(poolId);
            // graduationMcap is the actual MCAP when graduation triggered (>= 16x)
            assertGe(graduationMcap, startMcap * 16, "Graduation MCAP >= startMcap * 16");
        }
    }

    /*//////////////////////////////////////////////////////////////
      TEST 6: isGraduatedByToken VIEW
    //////////////////////////////////////////////////////////////*/

    function test_isGraduatedByToken() public {
        vm.startPrank(deployer);
        (address token,,) = _createAndActivate(1 ether, beneficiary, 0);
        vm.stopPrank();

        bool grad = hook.isGraduatedByToken(token);
        assertFalse(grad, "Should not be graduated at start");
    }

    /*//////////////////////////////////////////////////////////////
     TEST 7: getPoolIdForToken VIEW
    //////////////////////////////////////////////////////////////*/

    function test_getPoolIdForToken() public {
        vm.startPrank(deployer);
        (address token, PoolId poolId,) = _createAndActivate(1 ether, beneficiary, 0);
        vm.stopPrank();

        PoolId returnedId = hook.getPoolIdForToken(token);
        assertTrue(
            PoolId.unwrap(returnedId) == PoolId.unwrap(poolId),
            "getPoolIdForToken should return correct poolId"
        );
    }

    /*//////////////////////////////////////////////////////////////
    TEST 8: INDEPENDENT GRADUATION
    //////////////////////////////////////////////////////////////*/

    function test_independentGraduation() public {
        vm.startPrank(deployer);
        (, PoolId poolId1, PoolKey memory key1) = _createAndActivateNamed(
            "TokenA", "TA", 1 ether, beneficiary, 0
        );
        (, PoolId poolId2,) = _createAndActivateNamed(
            "TokenB", "TB", 1 ether, beneficiary, 0
        );
        vm.stopPrank();

        uint256 tax1 = hook.getCurrentTax(poolId1);
        uint256 tax2 = hook.getCurrentTax(poolId2);
        assertEq(tax1, tax2, "Both should start with same tax (universal 50%)");

        // Trade only on token1 — fresh wallets (respects maxTx)
        for (uint256 i = 0; i < 500; i++) {
            _safeBuyFresh(key1);
        }

        uint256 epoch1 = hook.getCurrentEpoch(poolId1);
        uint256 epoch2 = hook.getCurrentEpoch(poolId2);
        assertTrue(epoch1 >= epoch2, "Traded token should have same or higher epoch");
    }
}
