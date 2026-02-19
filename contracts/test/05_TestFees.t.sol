// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTest.sol";

/**
 * @title TestFees
 * @notice Tests fee accounting and claiming
 *
 * Covers:
 * - ETH fee on buy (zeroForOne = true)
 * - Token fee on sell
 * - 70/30 split (beneficiary / platform)
 * - claimBeneficiaryFeesETH
 * - claimPlatformFeesETH (treasury only)
 * - No fees → reverts on claim
 * - Fee accumulation across multiple swaps
 * - Per-beneficiary isolation
 */
contract TestFees is BaseTest {

    /*//////////////////////////////////////////////////////////////
            TEST 1: ETH FEE ON BUY
    //////////////////////////////////////////////////////////////*/

    function test_ethFeeOnBuy() public {
        vm.startPrank(deployer);
        (, PoolId poolId, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        vm.startPrank(alice);
        _buy(key, 0.001 ether);
        vm.stopPrank();

        // Beneficiary should have accumulated ETH fees (70% of tax)
        uint256 benFees = hook.beneficiaryFeesETH(beneficiary);
        uint256 platFees = hook.platformFeesETH();

        assertTrue(benFees > 0, "Beneficiary should have ETH fees");
        assertTrue(platFees > 0, "Platform should have ETH fees");

        // 70/30 split check
        uint256 totalFees = benFees + platFees;
        uint256 expected70 = (totalFees * 7000) / 10000;
        assertApproxEqAbs(benFees, expected70, 1, "Beneficiary should get ~70%");
    }

    /*//////////////////////////////////////////////////////////////
          TEST 2: 70/30 FEE SPLIT
    //////////////////////////////////////////////////////////////*/

    function test_feesSplit70_30() public {
        vm.startPrank(deployer);
        (,, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        vm.startPrank(alice);
        _buy(key, 0.001 ether);
        vm.stopPrank();

        uint256 benFees = hook.beneficiaryFeesETH(beneficiary);
        uint256 platFees = hook.platformFeesETH();
        uint256 total = benFees + platFees;

        // Verify the 70/30 ratio
        assertApproxEqRel(benFees, (total * 7000) / 10000, 0.001e18, "70% to beneficiary");
        assertApproxEqRel(platFees, (total * 3000) / 10000, 0.001e18, "30% to platform");
    }

    /*//////////////////////////////////////////////////////////////
       TEST 3: CLAIM BENEFICIARY FEES ETH
    //////////////////////////////////////////////////////////////*/

    function test_claimBeneficiaryFeesETH() public {
        vm.startPrank(deployer);
        (,, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        // Generate fees
        vm.startPrank(alice);
        _buy(key, 0.001 ether);
        vm.stopPrank();

        uint256 pendingFees = hook.beneficiaryFeesETH(beneficiary);
        assertTrue(pendingFees > 0, "Should have pending fees");

        uint256 balBefore = beneficiary.balance;

        // Anyone can trigger claim (fees go to beneficiary)
        hook.claimBeneficiaryFeesETH(beneficiary);

        uint256 balAfter = beneficiary.balance;
        assertEq(balAfter - balBefore, pendingFees, "Beneficiary should receive ETH fees");
        assertEq(hook.beneficiaryFeesETH(beneficiary), 0, "Pending fees should be zero");
    }

    /*//////////////////////////////////////////////////////////////
     TEST 4: CLAIM PLATFORM FEES (TREASURY)
    //////////////////////////////////////////////////////////////*/

    function test_claimPlatformFeesETH() public {
        vm.startPrank(deployer);
        (,, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        // Generate fees
        vm.startPrank(alice);
        _buy(key, 0.001 ether);
        vm.stopPrank();

        uint256 pendingFees = hook.platformFeesETH();
        assertTrue(pendingFees > 0, "Should have pending platform fees");

        uint256 balBefore = treasury.balance;

        // Only treasury can claim platform fees
        vm.prank(treasury);
        hook.claimPlatformFeesETH();

        uint256 balAfter = treasury.balance;
        assertEq(balAfter - balBefore, pendingFees, "Treasury should receive ETH fees");
        assertEq(hook.platformFeesETH(), 0, "Platform fees should be zero");
    }

    /*//////////////////////////////////////////////////////////////
       TEST 5: NO FEES → REVERT ON CLAIM
    //////////////////////////////////////////////////////////////*/

    function test_revert_noFeesToClaim() public {
        // No trades done, so no fees
        vm.expectRevert(); // NoFeesToClaim
        hook.claimBeneficiaryFeesETH(beneficiary);
    }

    function test_revert_platformNoFees() public {
        vm.prank(treasury);
        vm.expectRevert(); // NoFeesToClaim
        hook.claimPlatformFeesETH();
    }

    /*//////////////////////////////////////////////////////////////
    TEST 6: FEE ACCUMULATION ACROSS SWAPS
    //////////////////////////////////////////////////////////////*/

    function test_feeAccumulation() public {
        vm.startPrank(deployer);
        (,, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        vm.startPrank(alice);
        _buy(key, 0.0005 ether);
        uint256 fees1 = hook.beneficiaryFeesETH(beneficiary);

        _buy(key, 0.0005 ether);
        uint256 fees2 = hook.beneficiaryFeesETH(beneficiary);

        _buy(key, 0.0005 ether);
        uint256 fees3 = hook.beneficiaryFeesETH(beneficiary);
        vm.stopPrank();

        assertTrue(fees2 > fees1, "Fees should accumulate after 2nd swap");
        assertTrue(fees3 > fees2, "Fees should accumulate after 3rd swap");
    }

    /*//////////////////////////////////////////////////////////////
      TEST 7: PER-BENEFICIARY ISOLATION
    //////////////////////////////////////////////////////////////*/

    function test_perBeneficiaryIsolation() public {
        address ben1 = makeAddr("beneficiary1");
        address ben2 = makeAddr("beneficiary2");

        vm.startPrank(deployer);
        (,, PoolKey memory key1) = _createAndActivateNamed(
            "Token1", "T1", 1 ether, ben1, 0
        );
        (,, PoolKey memory key2) = _createAndActivateNamed(
            "Token2", "T2", 1 ether, ben2, 0
        );
        vm.stopPrank();

        // Trade on token1 only
        vm.startPrank(alice);
        _buy(key1, 0.001 ether);
        vm.stopPrank();

        assertTrue(hook.beneficiaryFeesETH(ben1) > 0, "Ben1 should have fees");
        assertEq(hook.beneficiaryFeesETH(ben2), 0, "Ben2 should have no fees");

        // Now trade on token2
        vm.startPrank(alice);
        _buy(key2, 0.001 ether);
        vm.stopPrank();

        assertTrue(hook.beneficiaryFeesETH(ben2) > 0, "Ben2 should now have fees");
    }

    /*//////////////////////////////////////////////////////////////
    TEST 8: TOKEN FEES ON SELL
    //////////////////////////////////////////////////////////////*/

    function test_tokenFeeOnSell() public {
        vm.startPrank(deployer);
        (address token,, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        // First buy tokens
        vm.startPrank(alice);
        _buy(key, 0.001 ether);

        uint256 tokenBal = ClawclickToken(token).balanceOf(alice);
        assertTrue(tokenBal > 0, "Should have tokens after buy");

        // Now sell some tokens
        ClawclickToken(token).approve(address(router), tokenBal);
        _sell(key, token, tokenBal / 2);
        vm.stopPrank();

        // Token fees should accumulate
        uint256 benTokenFees = hook.beneficiaryFeesToken(beneficiary, token);
        uint256 platTokenFees = hook.platformFeesToken(token);

        assertTrue(benTokenFees > 0, "Beneficiary should have token fees from sell");
        assertTrue(platTokenFees > 0, "Platform should have token fees from sell");
    }

    /*//////////////////////////////////////////////////////////////
    TEST 9: PLATFORM CLAIM ONLY BY TREASURY
    //////////////////////////////////////////////////////////////*/

    function test_revert_nonTreasuryClaimPlatformFees() public {
        vm.startPrank(deployer);
        (,, PoolKey memory key) = _createAndActivate(
            1 ether, beneficiary, 0
        );
        vm.stopPrank();

        // Generate fees
        vm.startPrank(alice);
        _buy(key, 0.001 ether);
        vm.stopPrank();

        // Non-treasury tries to claim
        vm.prank(alice);
        vm.expectRevert(); // NotTreasury
        hook.claimPlatformFeesETH();
    }
}
