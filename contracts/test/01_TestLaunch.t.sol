// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./BaseTest.sol";

/**
 * @title TestLaunch
 * @notice Tests launch creation invariants
 *
 * NEW SYSTEM:
 * - Pools activate at launch with bootstrap ETH (no separate activation)
 * - Factory creates token, initializes pool, mints P1 position in one tx
 * - Tax scales by MCAP tier: 1 ETH=50%, 5 ETH=30%, 10 ETH=5%
 * - tickSpacing = 60
 *
 * Covers:
 * - createLaunch with valid params
 * - Fails below minimum MCAP (1 ETH)
 * - Fails above maximum MCAP (10 ETH)
 * - TOTAL_SUPPLY minted correctly
 * - Pool initialized and activated at launch
 * - LP NFT position exists
 * - Hook registered correctly
 * - All MCAP tiers (1-10 ETH) create valid launches
 */
contract TestLaunch is BaseTest {

    /*//////////////////////////////////////////////////////////////
                    TEST 1: VALID LAUNCH (1 ETH MCAP)
    //////////////////////////////////////////////////////////////*/

    function test_validLaunch_1ETH() public {
        vm.startPrank(deployer);

        (address token, PoolId poolId,) = _createLaunch(1 ether, beneficiary);

        // Token deployed
        assertTrue(token != address(0), "Token not deployed");

        // Total supply == 1B
        assertEq(ClawclickToken(token).totalSupply(), TOTAL_SUPPLY, "TotalSupply mismatch");

        // Pool IS activated at launch (new system)
        assertTrue(factory.poolActivated(poolId), "Pool should be activated at launch");

        // LP position exists
        assertTrue(factory.positionTokenId(poolId) > 0, "LP position should exist after launch");

        // Hook registered
        (address hookToken,,uint256 startMcap,,,,, ) = hook.launches(poolId);
        assertEq(hookToken, token, "Hook token mismatch");
        assertEq(startMcap, 1 ether, "Hook startMcap mismatch");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                 TEST 2: VALID LAUNCH (5 ETH MCAP)
    //////////////////////////////////////////////////////////////*/

    function test_validLaunch_5ETH() public {
        vm.startPrank(deployer);

        (address token, PoolId poolId,) = _createLaunch(5 ether, beneficiary);

        assertTrue(token != address(0));
        assertTrue(factory.poolActivated(poolId), "Pool should be activated");

        (address hookToken,,uint256 startMcap, uint256 baseTax,,,, ) = hook.launches(poolId);
        assertEq(hookToken, token);
        assertEq(startMcap, 5 ether);
        // Tax scales: 55% - (5% * mcapInETH) → 5 ETH = 30%
        assertEq(baseTax, 3000, "5 ETH tier should have 30% base tax");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
               TEST 3: VALID LAUNCH (10 ETH MCAP)
    //////////////////////////////////////////////////////////////*/

    function test_validLaunch_10ETH() public {
        vm.startPrank(deployer);

        (address token, PoolId poolId,) = _createLaunch(10 ether, beneficiary);

        assertTrue(token != address(0));

        (,,uint256 startMcap, uint256 baseTax,,,, ) = hook.launches(poolId);
        assertEq(startMcap, 10 ether);
        // Tax scales: 55% - (5% * mcapInETH) → 10 ETH = 5%
        assertEq(baseTax, 500, "10 ETH tier should have 5% base tax");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
               TEST 4: BELOW MINIMUM MCAP (REVERTS)
    //////////////////////////////////////////////////////////////*/

    function test_revert_belowMinMcap() public {
        vm.startPrank(deployer);

        uint256 bootstrap = config.MIN_BOOTSTRAP_ETH();
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Fail Token",
            symbol: "FAIL",
            beneficiary: beneficiary,
            agentWallet: beneficiary,
            targetMcapETH: 0.5 ether,
            feeSplit: _defaultFeeSplit()
        });

        vm.expectRevert();
        factory.createLaunch{value: bootstrap}(params);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
               TEST 5: ABOVE MAXIMUM MCAP (REVERTS)
    //////////////////////////////////////////////////////////////*/

    function test_revert_aboveMaxMcap() public {
        vm.startPrank(deployer);

        uint256 bootstrap = config.MIN_BOOTSTRAP_ETH();
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Fail Token",
            symbol: "FAIL",
            beneficiary: beneficiary,
            agentWallet: beneficiary,
            targetMcapETH: 11 ether,
            feeSplit: _defaultFeeSplit()
        });

        vm.expectRevert();
        factory.createLaunch{value: bootstrap}(params);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
               TEST 6: INSUFFICIENT FEE (REVERTS)
    //////////////////////////////////////////////////////////////*/

    function test_revert_insufficientFee() public {
        vm.startPrank(deployer);

        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Fail Token",
            symbol: "FAIL",
            beneficiary: beneficiary,
            agentWallet: beneficiary,
            targetMcapETH: 1 ether,
            feeSplit: _defaultFeeSplit()
        });

        vm.expectRevert();
        factory.createLaunch{value: 0}(params);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
           TEST 7: EMPTY NAME / SYMBOL (REVERTS)
    //////////////////////////////////////////////////////////////*/

    function test_revert_emptyName() public {
        vm.startPrank(deployer);

        uint256 bootstrap = config.MIN_BOOTSTRAP_ETH();
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "",
            symbol: "TEST",
            beneficiary: beneficiary,
            agentWallet: beneficiary,
            targetMcapETH: 1 ether,
            feeSplit: _defaultFeeSplit()
        });

        vm.expectRevert();
        factory.createLaunch{value: bootstrap}(params);

        vm.stopPrank();
    }

    function test_revert_emptySymbol() public {
        vm.startPrank(deployer);

        uint256 bootstrap = config.MIN_BOOTSTRAP_ETH();
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test",
            symbol: "",
            beneficiary: beneficiary,
            agentWallet: beneficiary,
            targetMcapETH: 1 ether,
            feeSplit: _defaultFeeSplit()
        });

        vm.expectRevert();
        factory.createLaunch{value: bootstrap}(params);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
            TEST 8: ZERO BENEFICIARY (REVERTS)
    //////////////////////////////////////////////////////////////*/

    function test_revert_zeroBeneficiary() public {
        vm.startPrank(deployer);

        uint256 bootstrap = config.MIN_BOOTSTRAP_ETH();
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test",
            symbol: "TEST",
            beneficiary: address(0),
            agentWallet: deployer,
            targetMcapETH: 1 ether,
            feeSplit: _defaultFeeSplit()
        });

        vm.expectRevert();
        factory.createLaunch{value: bootstrap}(params);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
          TEST 9: SQRTPRICE PREVIEW MATCHES
    //////////////////////////////////////////////////////////////*/

    function test_sqrtPricePreview() public view {
        uint160 preview1 = factory.previewSqrtPrice(1 ether);
        uint160 preview5 = factory.previewSqrtPrice(5 ether);
        uint160 preview10 = factory.previewSqrtPrice(10 ether);

        // Higher MCAP → lower token/ETH price → lower sqrtPrice
        assertTrue(preview1 > preview5, "1 ETH sqrtPrice should be > 5 ETH");
        assertTrue(preview5 > preview10, "5 ETH sqrtPrice should be > 10 ETH");
        assertTrue(preview10 > 0, "10 ETH sqrtPrice should be positive");
    }

    /*//////////////////////////////////////////////////////////////
       TEST 10: ALL MCAP TIERS DEPLOY SUCCESSFULLY
    //////////////////////////////////////////////////////////////*/

    function test_allMcapTiers() public {
        vm.startPrank(deployer);

        for (uint256 mcap = 1 ether; mcap <= 10 ether; mcap += 1 ether) {
            string memory name = string(abi.encodePacked("Tier ", vm.toString(mcap / 1 ether)));
            string memory symbol = string(abi.encodePacked("T", vm.toString(mcap / 1 ether)));

            (address token, PoolId poolId,) = _createLaunchNamed(
                name, symbol, mcap, beneficiary
            );

            assertTrue(token != address(0), "Token should deploy");
            // New system: pool is activated at launch
            assertTrue(factory.poolActivated(poolId), "Pool should be activated at launch");

            (,,uint256 startMcap,,,,, ) = hook.launches(poolId);
            assertEq(startMcap, mcap, "MCAP mismatch");
        }

        assertEq(factory.totalLaunches(), 10, "Should have 10 launches");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
        TEST 11: BOOTSTRAP-ONLY LAUNCH (NO PREMIUM TIER)
    //////////////////////////////////////////////////////////////*/

    function test_bootstrapOnlyLaunch() public {
        vm.startPrank(deployer);

        uint256 bootstrap = config.MIN_BOOTSTRAP_ETH();

        // New system: single tier, just bootstrap ETH
        (address token, PoolId poolId,) = _createLaunch(1 ether, beneficiary);

        assertTrue(token != address(0), "Launch should work with bootstrap");
        assertTrue(factory.poolActivated(poolId), "Pool should activate at launch");
        assertTrue(factory.positionTokenId(poolId) > 0, "LP should be minted");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
       TEST 12: LAUNCH COUNT INCREMENTS
    //////////////////////////////////////////////////////////////*/

    function test_launchCountIncrements() public {
        vm.startPrank(deployer);

        assertEq(factory.totalLaunches(), 0);

        _createLaunchNamed("A", "A", 1 ether, beneficiary);
        assertEq(factory.totalLaunches(), 1);

        _createLaunchNamed("B", "B", 2 ether, beneficiary);
        assertEq(factory.totalLaunches(), 2);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
     TEST 13: TOKEN PROPERTIES CORRECT
    //////////////////////////////////////////////////////////////*/

    function test_tokenProperties() public {
        vm.startPrank(deployer);

        (address token,,) = _createLaunchNamed("My Token", "MTK", 3 ether, beneficiary);

        ClawclickToken t = ClawclickToken(token);
        assertEq(t.name(), "My Token");
        assertEq(t.symbol(), "MTK");
        assertEq(t.beneficiary(), beneficiary);
        assertEq(t.totalSupply(), TOTAL_SUPPLY);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
     TEST 14: CLEAR DEV OVERRIDE TAKES POOLID
    //////////////////////////////////////////////////////////////*/

    function test_clearDevOverrideAcceptsPoolId() public {
        vm.startPrank(deployer);
        (address token, PoolId poolId,) = _createLaunch(1 ether, deployer);
        vm.stopPrank();

        // clearDevOverride takes PoolId (not PoolKey) and requires 1 min elapsed
        // Just verify it exists and doesn't revert with wrong error
        vm.startPrank(deployer);
        // Warp forward 61 seconds so the time lock passes
        vm.warp(block.timestamp + 61);
        // Should not revert (pool already activated, override already cleared)
        factory.clearDevOverride(poolId);
        vm.stopPrank();
    }
}
