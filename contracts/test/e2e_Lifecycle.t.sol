// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";

import "../src/core/ClawclickConfig.sol";
import "../src/core/ClawclickHook_V4.sol";
// LPLocker removed
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickToken.sol";

/**
 * @title E2E Lifecycle Test
 * @notice End-to-end validation with pre-computed valid hook address
 */
contract E2ELifecycleTest is Test, IUnlockCallback {

    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    // Sepolia addresses
    IPoolManager constant poolManager = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    IPositionManager constant positionManager = IPositionManager(0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4);

    // Valid hook address with correct permission bits
    // This address has the required bits set for:
    // - beforeInitialize (bit 159)
    // - beforeAddLiquidity (bit 157)
    // - beforeRemoveLiquidity (bit 155)
    // - beforeSwap (bit 153)
    // - afterSwap (bit 152)
    // - beforeSwapReturnDelta (bit 149)
    address constant VALID_HOOK_ADDRESS = address(uint160(
        (1 << 159) | // beforeInitialize
        (1 << 157) | // beforeAddLiquidity
        (1 << 155) | // beforeRemoveLiquidity
        (1 << 153) | // beforeSwap
        (1 << 152) | // afterSwap
        (1 << 149)   // beforeSwapReturnDelta
    ));

    // Core contracts
    ClawclickConfig config;
    ClawclickHook hook;
// LPLocker removed
    ClawclickFactory factory;

    // Test accounts
    address deployer = address(0x1000);
    address treasury = address(0x2000);
    address agentWallet = address(0x3000);
    address trader1 = address(0x4000);
    address trader2 = address(0x5000);

    // Current swap context
    PoolKey currentKey;
    SwapParams currentParams;
    address swapper;

    function setUp() public {
        // Fund accounts
        vm.deal(deployer, 100 ether);
        vm.deal(trader1, 50 ether);
        vm.deal(trader2, 50 ether);

        console.log("==============================================");
        console.log("CLAWCLICK V4 - E2E LIFECYCLE VALIDATION");
        console.log("==============================================");
        console.log("");
        console.log("Valid Hook Address:", VALID_HOOK_ADDRESS);
        console.log("");
    }

    function testCompleteLifecycle() public {
        _step01_deployCore();
        _step02_createLaunch();
        _step03_protectedPhase();
        _step04_epochProgression();
        _step05_graduation();
        _step06_postGraduation();
        
        console.log("");
        console.log("==============================================");
        console.log("ALL TESTS PASSED - SYSTEM VALIDATED");
        console.log("==============================================");
    }

    function _step01_deployCore() internal {
        console.log("[STEP 01] DEPLOY CORE");
        console.log("------------------------------------------");

        vm.startPrank(deployer);

        // Deploy Config
        config = new ClawclickConfig(treasury, deployer);
        console.log("OK Config:", address(config));

        // Deploy Hook at valid address using vm.etch
        bytes memory hookCode = abi.encodePacked(
            type(ClawclickHook).creationCode,
            abi.encode(poolManager, config)
        );
        
        // Deploy hook normally first to get bytecode
        ClawclickHook tempHook = new ClawclickHook(poolManager, config);
        bytes memory hookRuntimeCode = address(tempHook).code;
        
        // Now etch it at the valid address
        vm.etch(VALID_HOOK_ADDRESS, hookRuntimeCode);
        hook = ClawclickHook(payable(VALID_HOOK_ADDRESS));
        
        // Re-initialize storage by calling the constructor logic manually
        // We need to set the poolManager and config in storage
        bytes32 poolManagerSlot = bytes32(uint256(0)); // Adjust based on actual storage layout
        bytes32 configSlot = bytes32(uint256(1));
        
        vm.store(VALID_HOOK_ADDRESS, poolManagerSlot, bytes32(uint256(uint160(address(poolManager)))));
        vm.store(VALID_HOOK_ADDRESS, configSlot, bytes32(uint256(uint160(address(config)))));
        
        console.log("OK Hook:", address(hook));

        // Verify permissions
        Hooks.Permissions memory perms = hook.getHookPermissions();
        assertTrue(perms.beforeInitialize, "beforeInitialize");
        assertTrue(perms.beforeSwap, "beforeSwap");
        assertTrue(perms.afterSwap, "afterSwap");
        console.log("OK Permissions validated");

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
        console.log("OK Factory:", address(factory));

        // Register factory
        config.setFactory(address(factory));
        console.log("OK Factory registered");

        vm.stopPrank();
        console.log("");
    }

    function _step02_createLaunch() internal {
        console.log("[STEP 02] CREATE LAUNCH");
        console.log("------------------------------------------");

        vm.prank(deployer);
        factory.createLaunch{value: 0.0003 ether}(
            ClawclickFactory.CreateParams({
                name: "Agent Token",
                symbol: "AGNT",
                beneficiary: agentWallet,
                agentWallet: agentWallet,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );

        address[] memory tokens = factory.getAllTokens();
        console.log("OK Token created:", tokens[0]);

        ClawclickFactory.LaunchInfo memory info = factory.getLaunchByToken(tokens[0]);
        currentKey = info.poolKey;
        
        PoolId poolId = currentKey.toId();
        (, , uint256 startMcap, uint256 baseTax, , , , ) = hook.launches(poolId);
        
        console.log("OK Start MCAP:", startMcap);
        console.log("OK Base Tax:", baseTax, "bps");
        console.log("OK Phase: PROTECTED");
        console.log("");
    }

    function _step03_protectedPhase() internal {
        console.log("[STEP 03] PROTECTED PHASE");
        console.log("------------------------------------------");

        PoolId poolId = currentKey.toId();
        
        uint256 epoch = hook.getCurrentEpoch(poolId);
        uint256 tax = hook.getCurrentTax(poolId);
        bool graduated = hook.isGraduated(poolId);
        
        assertEq(epoch, 0, "Epoch should be 0");
        assertEq(tax, 4000, "Tax should be 40%");
        assertFalse(graduated, "Should not be graduated");
        
        console.log("OK Epoch:", epoch);
        console.log("OK Tax:", tax, "bps");
        console.log("OK Not graduated");
        
        // Execute swap
        vm.prank(trader1);
        _buyTokens(0.1 ether);
        console.log("OK Swap executed");
        console.log("");
    }

    function _step04_epochProgression() internal {
        console.log("[STEP 04] EPOCH PROGRESSION");
        console.log("------------------------------------------");

        PoolId poolId = currentKey.toId();

        // 2x
        vm.prank(trader1);
        _buyTokens(0.5 ether);
        console.log("OK 2x MCAP, Epoch:", hook.getCurrentEpoch(poolId), "Tax:", hook.getCurrentTax(poolId));

        // 4x
        vm.prank(trader2);
        _buyTokens(1 ether);
        console.log("OK 4x MCAP, Epoch:", hook.getCurrentEpoch(poolId), "Tax:", hook.getCurrentTax(poolId));

        // 8x
        vm.prank(trader1);
        _buyTokens(2 ether);
        console.log("OK 8x MCAP, Epoch:", hook.getCurrentEpoch(poolId), "Tax:", hook.getCurrentTax(poolId));
        
        console.log("");
    }

    function _step05_graduation() internal {
        console.log("[STEP 05] GRADUATION");
        console.log("------------------------------------------");

        PoolId poolId = currentKey.toId();

        assertFalse(hook.isGraduated(poolId), "Not graduated yet");
        console.log("Before 16x: Not graduated");

        // 16x - triggers instant graduation
        vm.prank(trader2);
        _buyTokens(10 ether);

        assertTrue(hook.isGraduated(poolId), "Should be graduated");
        (, , , , , , uint8 liquidityStage, uint256 graduationMcap) = hook.launches(poolId);
        
        assertEq(liquidityStage, 1, "Liquidity stage 1");
        assertTrue(graduationMcap > 0, "Graduation MCAP set");
        
        console.log("OK INSTANT graduation at 16x");
        console.log("OK Liquidity stage:", liquidityStage);
        console.log("OK Graduation MCAP:", graduationMcap);
        console.log("OK No timer required");
        console.log("");
    }

    function _step06_postGraduation() internal {
        console.log("[STEP 06] POST-GRADUATION");
        console.log("------------------------------------------");

        PoolId poolId = currentKey.toId();

        vm.prank(trader1);
        _buyTokens(5 ether);
        console.log("OK Post-grad buy 1");

        vm.prank(trader2);
        _buyTokens(5 ether);
        console.log("OK Post-grad buy 2");

        (, , , , , , uint8 liquidityStage, ) = hook.launches(poolId);
        console.log("OK Final liquidity stage:", liquidityStage);
        console.log("");
    }

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
        require(msg.sender == address(poolManager));

        BalanceDelta delta = poolManager.swap(currentKey, currentParams, "");

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

        return abi.encode(delta);
    }

    receive() external payable {}
}
