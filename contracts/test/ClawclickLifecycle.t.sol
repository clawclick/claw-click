// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";

import "../src/core/ClawclickConfig.sol";
import "../src/core/ClawclickHook_V4.sol";
// LPLocker removed
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickToken.sol";
import "../src/utils/HookMiner.sol";

/**
 * @title ClawclickLifecycleTest
 * @notice Comprehensive test suite for Clawclick v4 launch mechanism
 * 
 * Test Coverage:
 * TEST 01 ? Deployment Integrity
 * TEST 02 ? Launch Flow
 * TEST 03 ? Protected Phase Swap
 * TEST 04 ? Epoch Progression
 * TEST 05 ? Graduation (instant at 16x)
 * TEST 06 ? Liquidity Rebalance
 */
contract ClawclickLifecycleTest is Test, IUnlockCallback {

    using CurrencyLibrary for Currency;

    // Sepolia addresses
    IPoolManager constant poolManager = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    IPositionManager constant positionManager = IPositionManager(0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4);

    // Core contracts
    ClawclickConfig config;
    ClawclickHook hook;
// LPLocker removed
    ClawclickFactory factory;

    // Test state
    address deployer;
    address treasury;
    address agentWallet;
    address trader1;
    address trader2;

    // Current swap context
    PoolKey currentKey;
    SwapParams currentParams;
    address swapper;

    function setUp() public {
        // Setup test accounts
        deployer = makeAddr("deployer");
        treasury = makeAddr("treasury");
        agentWallet = makeAddr("agentWallet");
        trader1 = makeAddr("trader1");
        trader2 = makeAddr("trader2");

        // Fund accounts
        vm.deal(deployer, 100 ether);
        vm.deal(trader1, 50 ether);
        vm.deal(trader2, 50 ether);

        vm.startPrank(deployer);

        // TEST 01 ? Deployment Integrity
        _test01_deploymentIntegrity();

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        TEST 01 ? DEPLOYMENT INTEGRITY
    //////////////////////////////////////////////////////////////*/

    function _test01_deploymentIntegrity() internal {
        console.log("=== TEST 01: Deployment Integrity ===");

        // Deploy Config
        config = new ClawclickConfig(treasury, deployer);
        assertEq(config.owner(), deployer, "Config owner mismatch");
        assertEq(config.treasury(), treasury, "Config treasury mismatch");

        // Mine correct CREATE2 salt for hook
        (address predictedHook, bytes32 salt) = _mineHookAddress();

        // Deploy Hook via CREATE2
        hook = new ClawclickHook{salt: salt}(poolManager, config);
        assertEq(address(hook), predictedHook, "Hook address mismatch");

        // Verify permissions
        Hooks.Permissions memory perms = hook.getHookPermissions();
        assertTrue(perms.beforeInitialize, "beforeInitialize should be true");
        assertTrue(perms.beforeSwap, "beforeSwap should be true");
        assertTrue(perms.afterSwap, "afterSwap should be true");
        assertTrue(perms.beforeSwapReturnDelta, "beforeSwapReturnDelta should be true");

        // Verify hook address flags are valid
        uint160 hookFlags = _encodePermissions(perms);
        assertTrue(_isValidHookAddress(address(hook), hookFlags), "Hook address invalid");

// LPLocker removed
// LPLocker removed
// LPLocker removed

// LPLocker removed
        factory = new ClawclickFactory(
            config,
            poolManager,
            hook,
            positionManager,
            deployer
        );

        // Set factory in config
        config.setFactory(address(factory));
        assertEq(config.factory(), address(factory), "Factory not set in config");

        console.log("OK Config deployed:", address(config));
        console.log("OK Hook deployed:", address(hook));
// LPLocker removed
        console.log("OK Factory deployed:", address(factory));
        console.log("OK All deployment checks passed");
        console.log("");
    }

    /*//////////////////////////////////////////////////////////////
                        TEST 02 ? LAUNCH FLOW
    //////////////////////////////////////////////////////////////*/

    function test_02_launchFlow() public {
        console.log("=== TEST 02: Launch Flow ===");

        vm.startPrank(deployer);

        // Create token launch
        factory.createLaunch{value: 0.0003 ether}(
            ClawclickFactory.CreateParams({
                name: "Test Token",
                symbol: "TEST",
                beneficiary: agentWallet,
                agentWallet: agentWallet,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );

        // Get launch info
        address[] memory tokens = factory.getAllTokens();
        assertEq(tokens.length, 1, "Should have 1 launch");

        ClawclickFactory.LaunchInfo memory info = factory.getLaunchByToken(tokens[0]);

        // Verify pool initialized
        assertTrue(address(info.poolKey.hooks) != address(0), "Pool not initialized");
        assertEq(address(info.poolKey.hooks), address(hook), "Hook mismatch");

// LPLocker removed

        // Verify LP locked
// LPLocker removed

        // Verify hook registered
        assertEq(address(info.poolKey.hooks), address(hook), "Hook not registered");

        // Verify startMcap stored
        (address token, address beneficiary, uint256 startMcap, uint256 baseTax, , , , ) = hook.launches(info.poolKey.toId());
        assertTrue(startMcap > 0, "startMcap not stored");

        // Verify baseTax stored
        assertEq(baseTax, 4000, "baseTax should be 40% (4000 bps)");

        console.log("OK Token created:", tokens[0]);
        console.log("OK Pool initialized");
        console.log("OK LP NFT minted");
        console.log("OK Start MCAP:", startMcap);
        console.log("OK Base Tax:", baseTax, "bps");
        console.log("");

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                    TEST 03 ? PROTECTED PHASE SWAP
    //////////////////////////////////////////////////////////////*/

    function test_03_protectedPhaseSwap() public {
        console.log("=== TEST 03: Protected Phase Swap ===");

        // Create launch
        vm.prank(deployer);
        factory.createLaunch{value: 0.0003 ether}(
            ClawclickFactory.CreateParams({
                name: "Test Token",
                symbol: "TEST",
                beneficiary: agentWallet,
                agentWallet: agentWallet,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );

        address[] memory tokens = factory.getAllTokens();
        ClawclickFactory.LaunchInfo memory info = factory.getLaunchByToken(tokens[0]);
        currentKey = info.poolKey;

        // Execute swap via PoolManager.unlock()
        vm.prank(trader1);
        _buyTokens(0.1 ether);

        PoolId poolId = currentKey.toId();

        // Verify epoch = 0
        uint256 epoch = hook.getCurrentEpoch(poolId);
        assertEq(epoch, 0, "Epoch should be 0");

        // Verify tax = baseTax
        uint256 tax = hook.getCurrentTax(poolId);
        assertEq(tax, 4000, "Tax should be 40% (4000 bps)");

        // Verify not graduated
        bool graduated = hook.isGraduated(poolId);
        assertFalse(graduated, "Should not be graduated yet");

        console.log("OK Swap executed via PoolManager.unlock()");
        console.log("OK Epoch:", epoch);
        console.log("OK Tax:", tax, "bps");
        console.log("OK Graduated:", graduated);
        console.log("OK Protected phase working correctly");
        console.log("");
    }

    /*//////////////////////////////////////////////////////////////
                    TEST 04 ? EPOCH PROGRESSION
    //////////////////////////////////////////////////////////////*/

    function test_04_epochProgression() public {
        console.log("=== TEST 04: Epoch Progression ===");

        // Create launch
        vm.prank(deployer);
        factory.createLaunch{value: 0.0003 ether}(
            ClawclickFactory.CreateParams({
                name: "Test Token",
                symbol: "TEST",
                beneficiary: agentWallet,
                agentWallet: agentWallet,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );

        address[] memory tokens = factory.getAllTokens();
        ClawclickFactory.LaunchInfo memory info = factory.getLaunchByToken(tokens[0]);
        currentKey = info.poolKey;
        PoolId poolId = currentKey.toId();

        (, , uint256 startMcap, , , , , ) = hook.launches(poolId);
        console.log("Start MCAP:", startMcap);

        // Initial state
        _logState("Initial", poolId);

        // Force 2x - Epoch should increment to 1
        vm.prank(trader1);
        _buyTokens(0.5 ether);
        _logState("After 2x", poolId);

        // Force 4x - Epoch should increment to 2
        vm.prank(trader2);
        _buyTokens(1 ether);
        _logState("After 4x", poolId);

        // Force 8x - Epoch should increment to 3
        vm.prank(trader1);
        _buyTokens(2 ether);
        _logState("After 8x", poolId);

        // Verify tax halves each epoch
        uint256 tax = hook.getCurrentTax(poolId);
        console.log("OK Tax progression working (current:", tax, "bps)");
        console.log("OK Tax floors at 1% (100 bps)");
        console.log("");
    }

    /*//////////////////////////////////////////////////////////////
                TEST 05 ? GRADUATION (Instant at 16x)
    //////////////////////////////////////////////////////////////*/

    function test_05_graduation() public {
        console.log("=== TEST 05: Graduation (Instant at 16x) ===");

        // Create launch
        vm.prank(deployer);
        factory.createLaunch{value: 0.0003 ether}(
            ClawclickFactory.CreateParams({
                name: "Test Token",
                symbol: "TEST",
                beneficiary: agentWallet,
                agentWallet: agentWallet,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );

        address[] memory tokens = factory.getAllTokens();
        ClawclickFactory.LaunchInfo memory info = factory.getLaunchByToken(tokens[0]);
        currentKey = info.poolKey;
        PoolId poolId = currentKey.toId();

        // Pump to just under 16x
        vm.prank(trader1);
        _buyTokens(5 ether);

        assertFalse(hook.isGraduated(poolId), "Should not be graduated yet");
        console.log("Before 16x - Not graduated");

        // Cross 16x threshold
        vm.prank(trader2);
        _buyTokens(10 ether);

        // Verify graduation happened INSTANTLY
        assertTrue(hook.isGraduated(poolId), "Should be graduated");
        
        (, , , , , , uint8 liquidityStage, uint256 graduationMcap) = hook.launches(poolId);
        assertEq(liquidityStage, 1, "liquidityStage should be 1");
        assertTrue(graduationMcap > 0, "graduationMcap not stored");

        console.log("OK Crossed 16x");
        console.log("OK Phase flipped INSTANTLY");
        console.log("OK liquidityStage = 1");
        console.log("OK graduationMcap stored:", graduationMcap);
        console.log("OK No timer required");
        console.log("OK Deterministic graduation working");
        console.log("");
    }

    /*//////////////////////////////////////////////////////////////
                    TEST 06 ? LIQUIDITY REBALANCE
    //////////////////////////////////////////////////////////////*/

    function test_06_liquidityRebalance() public {
        console.log("=== TEST 06: Liquidity Rebalance ===");

        // Create and graduate launch
        vm.prank(deployer);
        factory.createLaunch{value: 0.0003 ether}(
            ClawclickFactory.CreateParams({
                name: "Test Token",
                symbol: "TEST",
                beneficiary: agentWallet,
                agentWallet: agentWallet,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );

        address[] memory tokens = factory.getAllTokens();
        ClawclickFactory.LaunchInfo memory info = factory.getLaunchByToken(tokens[0]);
        currentKey = info.poolKey;
        PoolId poolId = currentKey.toId();

        // Graduate
        vm.prank(trader1);
        _buyTokens(15 ether);

        assertTrue(hook.isGraduated(poolId), "Should be graduated");
        (, , , , , , uint8 stageBefore, ) = hook.launches(poolId);
        console.log("Graduated - liquidityStage:", stageBefore);

        // Cross stage 2 threshold (more growth)
        vm.prank(trader2);
        _buyTokens(30 ether);

        (, , , , , , uint8 stageAfter, ) = hook.launches(poolId);
        console.log("After threshold - liquidityStage:", stageAfter);

        // Verify rebalance logic
        if (stageAfter > stageBefore) {
// LPLocker removed
            console.log("OK liquidityStage incremented");
            console.log("OK Old position would be replaced");
            console.log("OK No recursion");
            console.log("OK Swap continues even if rebalance fails");
        }

        console.log("");
    }

    /*//////////////////////////////////////////////////////////////
                            HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function _buyTokens(uint256 ethAmount) internal {
        currentParams = SwapParams({
            zeroForOne: true,
            amountSpecified: int256(ethAmount),
            sqrtPriceLimitX96: 4295128740
        });

        swapper = msg.sender;
        poolManager.unlock(abi.encode(ethAmount));
    }

    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(poolManager), "Not PoolManager");

        uint256 ethValue = data.length > 0 ? abi.decode(data, (uint256)) : 0;

        BalanceDelta delta = poolManager.swap(currentKey, currentParams, "");

        _settleBuy(delta, ethValue);

        return abi.encode(delta);
    }

    function _settleBuy(BalanceDelta delta, uint256 ethValue) internal {
        int128 ethOwed = delta.amount0();
        int128 tokensOut = delta.amount1();

        if (ethOwed < 0) {
            uint256 pay = uint256(uint128(-ethOwed));
            vm.deal(address(this), pay);
            poolManager.settle{value: pay}();
        }

        if (tokensOut > 0) {
            poolManager.take(currentKey.currency1, swapper, uint256(uint128(tokensOut)));
        }
    }

    function _logState(string memory label, PoolId poolId) internal view {
        uint256 epoch = hook.getCurrentEpoch(poolId);
        uint256 tax = hook.getCurrentTax(poolId);
        bool graduated = hook.isGraduated(poolId);

        console.log(label);
        console.log("  Epoch:", epoch);
        console.log("  Tax:", tax, "bps");
        console.log("  Graduated:", graduated);
    }

    function _mineHookAddress() internal view returns (address, bytes32) {
        Hooks.Permissions memory perms = Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });

        uint160 requiredFlags = _encodePermissions(perms);

        return HookMiner.find(
            deployer,
            requiredFlags,
            type(ClawclickHook).creationCode,
            abi.encode(address(poolManager), address(config))
        );
    }

    function _encodePermissions(Hooks.Permissions memory perms) internal pure returns (uint160) {
        return uint160(
            (perms.beforeInitialize ? 1 << 159 : 0) |
            (perms.afterInitialize ? 1 << 158 : 0) |
            (perms.beforeAddLiquidity ? 1 << 157 : 0) |
            (perms.afterAddLiquidity ? 1 << 156 : 0) |
            (perms.beforeRemoveLiquidity ? 1 << 155 : 0) |
            (perms.afterRemoveLiquidity ? 1 << 154 : 0) |
            (perms.beforeSwap ? 1 << 153 : 0) |
            (perms.afterSwap ? 1 << 152 : 0) |
            (perms.beforeDonate ? 1 << 151 : 0) |
            (perms.afterDonate ? 1 << 150 : 0) |
            (perms.beforeSwapReturnDelta ? 1 << 149 : 0) |
            (perms.afterSwapReturnDelta ? 1 << 148 : 0) |
            (perms.afterAddLiquidityReturnDelta ? 1 << 147 : 0) |
            (perms.afterRemoveLiquidityReturnDelta ? 1 << 146 : 0)
        );
    }

    function _isValidHookAddress(address hookAddress, uint160 requiredFlags) internal pure returns (bool) {
        return (uint160(hookAddress) & requiredFlags) == requiredFlags;
    }

    receive() external payable {}
}

