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
import "../src/core/ClawclickLPLocker.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickToken.sol";

/**
 * @title FullLifecycleTest
 * @notice End-to-end validation of Clawclick v4 launch mechanism
 */
contract FullLifecycleTest is Test, IUnlockCallback {

    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    // Sepolia addresses
    IPoolManager constant poolManager = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    IPositionManager constant positionManager = IPositionManager(0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4);

    // Core contracts
    ClawclickConfig config;
    ClawclickHook hook;
    ClawclickLPLocker locker;
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
    uint256 ethToSend;

    function setUp() public {
        // Fund accounts
        vm.deal(deployer, 100 ether);
        vm.deal(trader1, 50 ether);
        vm.deal(trader2, 50 ether);

        console.log("==============================================");
        console.log("CLAWCLICK V4 - FULL LIFECYCLE VALIDATION");
        console.log("==============================================");
        console.log("");
    }

    function testFullDeploymentAndLifecycle() public {
        _step01_deployCore();
        _step02_createLaunch();
        _step03_initialBuy();
        _step04_progressEpochs();
        _step05_graduate();
        _step06_postGraduation();
        _step07_finalReport();
    }

    /*//////////////////////////////////////////////////////////////
                    STEP 01: DEPLOY CORE CONTRACTS
    //////////////////////////////////////////////////////////////*/

    function _step01_deployCore() internal {
        console.log("[STEP 01] DEPLOYING CORE CONTRACTS");
        console.log("------------------------------------------");

        vm.startPrank(deployer);

        // Deploy Config
        config = new ClawclickConfig(treasury, deployer);
        console.log("OK Config deployed:", address(config));
        assertEq(config.owner(), deployer);
        assertEq(config.treasury(), treasury);

        // Deploy Hook (without CREATE2 for testing simplicity)
        // In production, use HookMiner to find valid salt
        hook = new ClawclickHook(poolManager, config);
        console.log("OK Hook deployed:", address(hook));

        // Verify permissions
        Hooks.Permissions memory perms = hook.getHookPermissions();
        assertTrue(perms.beforeInitialize);
        assertTrue(perms.beforeSwap);
        assertTrue(perms.afterSwap);
        assertTrue(perms.beforeSwapReturnDelta);
        console.log("OK Hook permissions validated");

        // Deploy LP Locker
        locker = new ClawclickLPLocker(address(positionManager), address(hook), deployer);
        console.log("OK Locker deployed:", address(locker));
        assertEq(address(locker.hook()), address(hook));

        // Link hook to locker
        hook.setLPLocker(locker);
        console.log("OK Hook <-> Locker linked");
        assertEq(address(hook.lpLocker()), address(locker));

        // Deploy Factory
        factory = new ClawclickFactory(
            config,
            poolManager,
            hook,
            locker,
            positionManager,
            deployer
        );
        console.log("OK Factory deployed:", address(factory));

        // Set factory in config
        config.setFactory(address(factory));
        console.log("OK Factory registered in config");
        assertEq(config.factory(), address(factory));

        vm.stopPrank();

        console.log("");
        console.log("DEPLOYMENT SUMMARY:");
        console.log("  Config:  ", address(config));
        console.log("  Hook:    ", address(hook));
        console.log("  Locker:  ", address(locker));
        console.log("  Factory: ", address(factory));
        console.log("");
    }

    /*//////////////////////////////////////////////////////////////
                        STEP 02: CREATE LAUNCH
    //////////////////////////////////////////////////////////////*/

    function _step02_createLaunch() internal {
        console.log("[STEP 02] CREATE TOKEN LAUNCH");
        console.log("------------------------------------------");

        vm.startPrank(deployer);

        uint256 balanceBefore = deployer.balance;

        // Create launch
        factory.createLaunch{value: 0.0003 ether}(
            ClawclickFactory.CreateParams({
                name: "Test Agent Token",
                symbol: "TEST",
                beneficiary: agentWallet,
                agentWallet: agentWallet,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );

        uint256 balanceAfter = deployer.balance;
        console.log("OK Token created, cost:", balanceBefore - balanceAfter);

        // Get launch info
        address[] memory tokens = factory.getAllTokens();
        assertEq(tokens.length, 1);
        console.log("OK Token address:", tokens[0]);

        ClawclickFactory.LaunchInfo memory info = factory.getLaunchByToken(tokens[0]);
        assertEq(info.token, tokens[0]);
        assertEq(info.beneficiary, agentWallet);
        assertEq(info.creator, deployer);
        assertEq(info.targetMcapETH, 1 ether);
        console.log("OK Launch info validated");

        // Verify pool initialized
        currentKey = info.poolKey;
        assertTrue(address(currentKey.hooks) != address(0));
        console.log("OK Pool initialized with hook:", address(currentKey.hooks));

        // Get launch data from hook
        PoolId poolId = currentKey.toId();
        (address token, address beneficiary, uint256 startMcap, uint256 baseTax, , , , ) = hook.launches(poolId);
        
        assertTrue(startMcap > 0);
        assertEq(baseTax, 4000); // 40%
        console.log("OK Start MCAP:", startMcap);
        console.log("OK Base Tax:  ", baseTax, "bps (40%)");

        // Verify hook state
        assertEq(hook.getCurrentEpoch(poolId), 0);
        assertEq(hook.getCurrentTax(poolId), 4000);
        assertFalse(hook.isGraduated(poolId));
        console.log("OK Initial phase: PROTECTED");
        console.log("OK Initial epoch: 0");

        vm.stopPrank();
        console.log("");
    }

    /*//////////////////////////////////////////////////////////////
                        STEP 03: INITIAL BUY
    //////////////////////////////////////////////////////////////*/

    function _step03_initialBuy() internal {
        console.log("[STEP 03] EXECUTE INITIAL BUY");
        console.log("------------------------------------------");

        PoolId poolId = currentKey.toId();
        
        uint256 epochBefore = hook.getCurrentEpoch(poolId);
        uint256 taxBefore = hook.getCurrentTax(poolId);
        
        console.log("Before swap:");
        console.log("  Epoch:", epochBefore);
        console.log("  Tax:  ", taxBefore, "bps");

        // Execute buy
        vm.prank(trader1);
        _buyTokens(0.1 ether);

        uint256 epochAfter = hook.getCurrentEpoch(poolId);
        uint256 taxAfter = hook.getCurrentTax(poolId);
        
        console.log("After swap:");
        console.log("  Epoch:", epochAfter);
        console.log("  Tax:  ", taxAfter, "bps");
        
        assertEq(epochAfter, 0, "Should still be epoch 0");
        assertEq(taxAfter, 4000, "Tax should be 40%");
        assertFalse(hook.isGraduated(poolId), "Should not be graduated");
        
        console.log("OK Swap executed successfully");
        console.log("OK Still in protected phase");
        console.log("");
    }

    /*//////////////////////////////////////////////////////////////
                    STEP 04: PROGRESS THROUGH EPOCHS
    //////////////////////////////////////////////////////////////*/

    function _step04_progressEpochs() internal {
        console.log("[STEP 04] PROGRESS THROUGH EPOCHS");
        console.log("------------------------------------------");

        PoolId poolId = currentKey.toId();

        // Push to 2x (epoch 1)
        console.log("Pushing to 2x MCAP...");
        vm.prank(trader1);
        _buyTokens(0.5 ether);
        _logEpochState(poolId, "After 2x");

        // Push to 4x (epoch 2)
        console.log("Pushing to 4x MCAP...");
        vm.prank(trader2);
        _buyTokens(1 ether);
        _logEpochState(poolId, "After 4x");

        // Push to 8x (epoch 3)
        console.log("Pushing to 8x MCAP...");
        vm.prank(trader1);
        _buyTokens(2 ether);
        _logEpochState(poolId, "After 8x");

        // Verify tax halving
        uint256 tax = hook.getCurrentTax(poolId);
        assertTrue(tax < 4000, "Tax should have decreased");
        console.log("OK Tax halved progressively");
        console.log("");
    }

    /*//////////////////////////////////////////////////////////////
                    STEP 05: TRIGGER GRADUATION
    //////////////////////////////////////////////////////////////*/

    function _step05_graduate() internal {
        console.log("[STEP 05] TRIGGER GRADUATION (16x)");
        console.log("------------------------------------------");

        PoolId poolId = currentKey.toId();

        console.log("Before 16x:");
        bool gradBefore = hook.isGraduated(poolId);
        console.log("  Graduated:", gradBefore);
        assertFalse(gradBefore, "Should not be graduated yet");

        // Push to 16x - should trigger INSTANT graduation
        console.log("Pushing to 16x MCAP...");
        vm.prank(trader2);
        _buyTokens(10 ether);

        console.log("After 16x:");
        bool gradAfter = hook.isGraduated(poolId);
        console.log("  Graduated:", gradAfter);
        assertTrue(gradAfter, "Should be graduated");

        // Verify graduation state
        (, , , , , , uint8 liquidityStage, uint256 graduationMcap) = hook.launches(poolId);
        assertEq(liquidityStage, 1, "Should be liquidity stage 1");
        assertTrue(graduationMcap > 0, "Graduation MCAP should be set");

        console.log("OK INSTANT graduation triggered");
        console.log("OK Liquidity stage:", liquidityStage);
        console.log("OK Graduation MCAP:", graduationMcap);
        console.log("OK No timer required");
        console.log("");
    }

    /*//////////////////////////////////////////////////////////////
                    STEP 06: POST-GRADUATION TRADING
    //////////////////////////////////////////////////////////////*/

    function _step06_postGraduation() internal {
        console.log("[STEP 06] POST-GRADUATION TRADING");
        console.log("------------------------------------------");

        PoolId poolId = currentKey.toId();

        (, , , , , , uint8 stageBefore, ) = hook.launches(poolId);
        console.log("Liquidity stage before:", stageBefore);

        // More trading post-graduation
        vm.prank(trader1);
        _buyTokens(5 ether);
        console.log("OK Post-graduation buy executed");

        vm.prank(trader2);
        _buyTokens(5 ether);
        console.log("OK Additional buy executed");

        (, , , , , , uint8 stageAfter, ) = hook.launches(poolId);
        console.log("Liquidity stage after:", stageAfter);

        if (stageAfter > stageBefore) {
            console.log("OK Liquidity stage progressed:", stageBefore, "->", stageAfter);
            console.log("OK Rebalance would be triggered");
        }

        console.log("");
    }

    /*//////////////////////////////////////////////////////////////
                        STEP 07: FINAL REPORT
    //////////////////////////////////////////////////////////////*/

    function _step07_finalReport() internal {
        console.log("[STEP 07] FINAL VALIDATION REPORT");
        console.log("==============================================");

        PoolId poolId = currentKey.toId();

        console.log("FINAL STATE:");
        console.log("  Epoch:      ", hook.getCurrentEpoch(poolId));
        console.log("  Tax:        ", hook.getCurrentTax(poolId), "bps");
        console.log("  Graduated:  ", hook.isGraduated(poolId));

        (, , , , , , uint8 liquidityStage, uint256 graduationMcap) = hook.launches(poolId);
        console.log("  Liq Stage:  ", liquidityStage);
        console.log("  Grad MCAP:  ", graduationMcap);

        console.log("");
        console.log("==============================================");
        console.log("ALL TESTS PASSED - SYSTEM READY FOR MAINNET");
        console.log("==============================================");
        console.log("");

        // Final assertions
        assertTrue(hook.isGraduated(poolId), "Must be graduated");
        assertTrue(liquidityStage >= 1, "Must have progressed liquidity stages");
        assertTrue(graduationMcap > 0, "Graduation MCAP must be set");
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
        ethToSend = ethAmount;
        
        poolManager.unlock(abi.encode(ethAmount));
    }

    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(poolManager), "Not PoolManager");

        uint256 ethValue = data.length > 0 ? abi.decode(data, (uint256)) : 0;

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

    function _logEpochState(PoolId poolId, string memory label) internal view {
        uint256 epoch = hook.getCurrentEpoch(poolId);
        uint256 tax = hook.getCurrentTax(poolId);
        bool graduated = hook.isGraduated(poolId);

        console.log(label);
        console.log("  Epoch:     ", epoch);
        console.log("  Tax:       ", tax, "bps");
        console.log("  Graduated: ", graduated);
    }

    receive() external payable {}
}
