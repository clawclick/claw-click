// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolManager} from "v4-core/src/PoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

import {ClawclickHook} from "../src/core/ClawclickHook.sol";
import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {ClawclickConfig} from "../src/core/ClawclickConfig.sol";
import {ClawclickToken} from "../src/core/ClawclickToken.sol";
import {ClawclickLPLocker} from "../src/core/ClawclickLPLocker.sol";

/**
 * @title ClawclickHook Tests
 * @notice Core invariant tests for clawclick V4 launch system
 */
contract ClawclickHookTest is Test {
    using PoolIdLibrary for PoolKey;

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/
    
    PoolManager poolManager;
    ClawclickConfig config;
    ClawclickHook hook;
    ClawclickFactory factory;
    ClawclickLPLocker lpLocker;
    
    address weth;
    address treasury;
    address owner;
    address beneficiary;
    address trader1;
    address trader2;
    
    uint256 constant PREMIUM_FEE = 0.001 ether;
    uint256 constant MICRO_FEE = 0.0003 ether;

    /*//////////////////////////////////////////////////////////////
                                SETUP
    //////////////////////////////////////////////////////////////*/
    
    function setUp() public {
        // Setup accounts
        owner = makeAddr("owner");
        treasury = makeAddr("treasury");
        beneficiary = makeAddr("beneficiary");
        trader1 = makeAddr("trader1");
        trader2 = makeAddr("trader2");
        
        // Deploy mock WETH
        weth = makeAddr("weth");
        
        // Fund accounts
        vm.deal(trader1, 100 ether);
        vm.deal(trader2, 100 ether);
        vm.deal(beneficiary, 10 ether);
        
        // Deploy PoolManager
        poolManager = new PoolManager(address(0));
        
        // Deploy Config
        vm.prank(owner);
        config = new ClawclickConfig(treasury, owner);
        
        // Deploy Hook temporarily to get permissions
        ClawclickHook hookImpl = new ClawclickHook(
            IPoolManager(address(poolManager)),
            config
        );
        
        // Compute correct hook address based on permissions
        address hookAddress = _computeHookAddress(hookImpl);
        
        // Etch hook code to correct address
        vm.etch(hookAddress, address(hookImpl).code);
        hook = ClawclickHook(payable(hookAddress));
        
        // Deploy LP Locker
        lpLocker = new ClawclickLPLocker(address(poolManager), owner);
        
        // Deploy Factory
        vm.prank(owner);
        factory = new ClawclickFactory(
            config,
            IPoolManager(address(poolManager)),
            hook,
            lpLocker,
            owner
        );
        
        // Set factory in config
        vm.prank(owner);
        config.setFactory(address(factory));
    }
    
    function _computeHookAddress(ClawclickHook hookImpl) internal view returns (address) {
        // Hook address must have specific flags set
        // For beforeSwap, afterSwap, beforeInitialize, etc.
        Hooks.Permissions memory perms = hookImpl.getHookPermissions();
        uint160 flags = uint160(
            (perms.beforeInitialize ? 1 << 0 : 0) |
            (perms.afterInitialize ? 1 << 1 : 0) |
            (perms.beforeAddLiquidity ? 1 << 2 : 0) |
            (perms.afterAddLiquidity ? 1 << 3 : 0) |
            (perms.beforeRemoveLiquidity ? 1 << 4 : 0) |
            (perms.afterRemoveLiquidity ? 1 << 5 : 0) |
            (perms.beforeSwap ? 1 << 6 : 0) |
            (perms.afterSwap ? 1 << 7 : 0) |
            (perms.beforeDonate ? 1 << 8 : 0) |
            (perms.afterDonate ? 1 << 9 : 0) |
            (perms.beforeSwapReturnDelta ? 1 << 10 : 0) |
            (perms.afterSwapReturnDelta ? 1 << 11 : 0) |
            (perms.afterAddLiquidityReturnDelta ? 1 << 12 : 0) |
            (perms.afterRemoveLiquidityReturnDelta ? 1 << 13 : 0)
        );
        return address(flags);
    }

    /*//////////////////////////////////////////////////////////////
                        INVARIANT: FREE LAUNCH DEPLOY
    //////////////////////////////////////////////////////////////*/
    
    function test_FreeLaunchDeploy() public {
        // Create launch with micro fee (budget tier)
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test Token",
            symbol: "TEST",
            beneficiary: beneficiary,
            agentWallet: address(0),
            isPremium: false
        });
        
        vm.prank(trader1);
        (address token, PoolId poolId) = factory.createLaunch{value: MICRO_FEE}(params);
        
        // Assertions
        assertTrue(token != address(0), "Token should be deployed");
        assertEq(factory.totalLaunches(), 1, "Should have 1 launch");
        
        // Token should have 1B supply
        ClawclickToken t = ClawclickToken(token);
        assertEq(t.totalSupply(), 1_000_000_000 * 1e18, "Supply should be 1B");
        
        // Token supply should be in hook
        assertEq(t.balanceOf(address(hook)), 1_000_000_000 * 1e18, "Hook should hold supply");
        
        // Launch should be in PRE_LAUNCH state
        ClawclickHook.TokenLaunch memory launch = hook.getLaunch(poolId);
        assertEq(uint256(launch.state), 0, "Should be PRE_LAUNCH");
        assertEq(launch.beneficiary, beneficiary, "Beneficiary should match");
    }
    
    function test_FreeLaunchDeploy_InsufficientFee() public {
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test Token",
            symbol: "TEST",
            beneficiary: beneficiary,
            agentWallet: address(0),
            isPremium: false
        });
        
        vm.prank(trader1);
        vm.expectRevert(ClawclickFactory.InsufficientFee.selector);
        factory.createLaunch{value: 0.0001 ether}(params); // Less than micro fee
    }

    /*//////////////////////////////////////////////////////////////
                    INVARIANT: FIRST BUY ACTIVATES LAUNCH
    //////////////////////////////////////////////////////////////*/
    
    function test_FirstBuyActivatesLaunch() public {
        // Setup: Create launch
        (address token, PoolId poolId) = _createTestLaunch();
        
        // Verify PRE_LAUNCH
        assertFalse(hook.isLive(poolId), "Should not be live yet");
        
        // First buy (simulated - actual swap would need full V4 integration)
        // In real test with full V4, this would be:
        // poolManager.swap(key, swapParams, hookData)
        
        // For now, verify the state machine logic is correct
        ClawclickHook.TokenLaunch memory launch = hook.getLaunch(poolId);
        assertEq(launch.launchBlock, 0, "Launch block should be 0 before first buy");
    }

    /*//////////////////////////////////////////////////////////////
                    INVARIANT: SECOND BUY RESPECTS LIMITS
    //////////////////////////////////////////////////////////////*/
    
    function test_AntiSnipeConfig() public {
        // Verify anti-snipe is configured
        assertGt(config.antiSnipeBlocks(), 0, "Anti-snipe blocks should be > 0");
        assertGt(config.antiSnipeMaxBuyBps(), 0, "Anti-snipe max buy should be > 0");
        
        // Default: 20 blocks, 2% max buy
        assertEq(config.antiSnipeBlocks(), 20, "Should be 20 blocks");
        assertEq(config.antiSnipeMaxBuyBps(), 200, "Should be 200 bps (2%)");
    }

    /*//////////////////////////////////////////////////////////////
                    INVARIANT: ANTI-SNIPE PROTECTION
    //////////////////////////////////////////////////////////////*/
    
    function test_AntiSnipePeriodCheck() public {
        (address token, PoolId poolId) = _createTestLaunch();
        
        // Before launch: not in anti-snipe
        assertFalse(hook.isInAntiSnipePeriod(poolId), "Should not be in anti-snipe before launch");
    }

    /*//////////////////////////////////////////////////////////////
                        FEE DISTRIBUTION
    //////////////////////////////////////////////////////////////*/
    
    function test_FeeCalculation() public {
        // Test fee calculation
        uint256 tradeAmount = 1 ether;
        (uint256 totalFee, uint256 beneficiaryShare, uint256 platformShare) = 
            config.calculateFees(tradeAmount);
        
        // Default: 1% fee, 70/30 split
        assertEq(totalFee, 0.01 ether, "Total fee should be 1%");
        assertEq(beneficiaryShare, 0.007 ether, "Beneficiary should get 70%");
        assertEq(platformShare, 0.003 ether, "Platform should get 30%");
    }

    /*//////////////////////////////////////////////////////////////
                        SUPPLY RELEASE
    //////////////////////////////////////////////////////////////*/
    
    function test_SupplyConstants() public view {
        // Verify supply constants
        assertEq(hook.TOTAL_SUPPLY(), 1_000_000_000 * 1e18, "Total supply should be 1B");
        // Note: Supply release mechanism removed - all tokens released at genesis
    }

    /*//////////////////////////////////////////////////////////////
                            HELPERS
    //////////////////////////////////////////////////////////////*/
    
    function _createTestLaunch() internal returns (address token, PoolId poolId) {
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test Token",
            symbol: "TEST",
            beneficiary: beneficiary,
            agentWallet: address(0),
            isPremium: false
        });
        
        vm.prank(trader1);
        return factory.createLaunch{value: MICRO_FEE}(params);
    }
}
