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
 * - Universal 50% base tax for all MCAPs
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
        // New system: universal 50% base tax for ALL tiers
        assertEq(baseTax, 5000, "All tiers should have 50% base tax");

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
        // New system: universal 50% base tax for ALL tiers
        assertEq(baseTax, 5000, "All tiers should have 50% base tax");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
               TEST 4: BELOW MINIMUM MCAP (REVERTS)
    //////////////////////////////////////////////////////////////*/

    function test_revert_belowMinMcap() public {
        vm.startPrank(deployer);

        uint256 fee = 0.001 ether /* bootstrap */;
        uint256 bootstrap = config.MIN_BOOTSTRAP_ETH();
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Fail Token",
            symbol: "FAIL",
            beneficiary: beneficiary,
            agentWallet: beneficiary,
            targetMcapETH: 0.5 ether,
            feeSplit: ClawclickFactory.FeeSplit({
                wallets: [address(0), address(0), address(0), address(0), address(0)],
                percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                count: 0
            })
        });

        vm.expectRevert();
        factory.createLaunch{value: fee + bootstrap}(params);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
               TEST 5: ABOVE MAXIMUM MCAP (REVERTS)
    //////////////////////////////////////////////////////////////*/

    function test_revert_aboveMaxMcap() public {
        vm.startPrank(deployer);

        uint256 fee = 0.001 ether /* bootstrap */;
        uint256 bootstrap = config.MIN_BOOTSTRAP_ETH();
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Fail Token",
            symbol: "FAIL",
            beneficiary: beneficiary,
            agentWallet: beneficiary,
            targetMcapETH: 11 ether,
            feeSplit: ClawclickFactory.FeeSplit({
                wallets: [address(0), address(0), address(0), address(0), address(0)],
                percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                count: 0
            })
        });

        vm.expectRevert();
        factory.createLaunch{value: fee + bootstrap}(params);

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
            feeSplit: ClawclickFactory.FeeSplit({
                wallets: [address(0), address(0), address(0), address(0), address(0)],
                percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                count: 0
            })
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

        uint256 fee = 0.001 ether /* bootstrap */;
        uint256 bootstrap = config.MIN_BOOTSTRAP_ETH();
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "",
            symbol: "TEST",
            beneficiary: beneficiary,
            agentWallet: beneficiary,
            targetMcapETH: 1 ether,
            feeSplit: ClawclickFactory.FeeSplit({
                wallets: [address(0), address(0), address(0), address(0), address(0)],
                percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                count: 0
            })
        });

        vm.expectRevert();
        factory.createLaunch{value: fee + bootstrap}(params);

        vm.stopPrank();
    }

    function test_revert_emptySymbol() public {
        vm.startPrank(deployer);

        uint256 fee = 0.001 ether /* bootstrap */;
        uint256 bootstrap = config.MIN_BOOTSTRAP_ETH();
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test",
            symbol: "",
            beneficiary: beneficiary,
            agentWallet: beneficiary,
            targetMcapETH: 1 ether,
            feeSplit: ClawclickFactory.FeeSplit({
                wallets: [address(0), address(0), address(0), address(0), address(0)],
                percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                count: 0
            })
        });

        vm.expectRevert();
        factory.createLaunch{value: fee + bootstrap}(params);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
            TEST 8: ZERO BENEFICIARY (REVERTS)
    //////////////////////////////////////////////////////////////*/

    function test_revert_zeroBeneficiary() public {
        vm.startPrank(deployer);

        uint256 fee = 0.001 ether /* bootstrap */;
        uint256 bootstrap = config.MIN_BOOTSTRAP_ETH();
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test",
            symbol: "TEST",
            beneficiary: address(0),
            agentWallet: deployer,
            targetMcapETH: 1 ether,
            feeSplit: ClawclickFactory.FeeSplit({
                wallets: [address(0), address(0), address(0), address(0), address(0)],
                percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                count: 0
            })
        });

        vm.expectRevert();
        factory.createLaunch{value: fee + bootstrap}(params);

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
        TEST 11: PREMIUM VS MICRO FEE
    //////////////////////////////////////////////////////////////*/

    function test_premiumFee() public {
        vm.startPrank(deployer);

        uint256 premiumFee = 0.001 ether /* bootstrap */;
        uint256 microFee = 0.001 ether /* bootstrap */;
        uint256 bootstrap = config.MIN_BOOTSTRAP_ETH();
        assertTrue(premiumFee > microFee, "Premium should cost more");

        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Premium Token",
            symbol: "PREM",
            beneficiary: beneficiary,
            agentWallet: beneficiary,
            targetMcapETH: 1 ether,
            feeSplit: ClawclickFactory.FeeSplit({
                wallets: [address(0), address(0), address(0), address(0), address(0)],
                percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                count: 0
            })
        });

        (address token,) = factory.createLaunch{value: premiumFee + bootstrap}(params);
        assertTrue(token != address(0), "Premium launch should work");

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
     TEST 14: DEPRECATED FUNCTIONS REVERT (COMMENTED OUT - FUNCTIONS REMOVED)
    //////////////////////////////////////////////////////////////*/

    // function test_revert_activatePoolDeprecated() public {
    //     vm.startPrank(deployer);
    //     (,, PoolKey memory key) = _createLaunch(1 ether, beneficiary);
    //     vm.stopPrank();

    //     vm.startPrank(alice);
    //     vm.expectRevert("Pools activated at launch");
    //     factory.activatePool{value: 0.5 ether}(key);
    //     vm.stopPrank();
    // }

    // function test_revert_activateAndSwapDevDeprecated() public {
    //     vm.startPrank(deployer);
    //     (,, PoolKey memory key) = _createLaunch(1 ether, deployer);
    //     vm.stopPrank();

    //     vm.startPrank(deployer);
    //     vm.expectRevert("Use regular launch flow");
    //     factory.activateAndSwapDev{value: 0.1 ether}(key);
    //     vm.stopPrank();
    // }

    function test_revert_clearDevOverrideDeprecated() public {
        vm.startPrank(deployer);
        (, PoolId poolId, PoolKey memory key) = _createLaunch(1 ether, deployer);
        vm.stopPrank();

        vm.startPrank(deployer);
        vm.expectRevert("First-buy window still active");
        factory.clearDevOverride(poolId);
        vm.stopPrank();
    }
}
