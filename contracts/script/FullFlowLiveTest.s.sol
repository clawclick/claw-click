// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickConfig.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickToken.sol";
import "../src/utils/HookMiner.sol";
import "../test/TestSwapRouter.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title FullFlowLiveTest
 * @notice Deploys Clawclick to ETH Sepolia and runs real trades through
 *         every lifecycle stage: tax decay across 4 epochs, limit scaling,
 *         graduation, post-graduation 0-tax trades, repositionByEpoch, and
 *         fee claiming.
 *
 *  Usage:
 *    cd contracts
 *    source ../.env
 *    export $(grep -v '^#' ../.env | xargs)
 *    forge script script/FullFlowLiveTest.s.sol \
 *      --rpc-url $ETH_SEPOLIA_RPC_URL --broadcast --via-ir -vvv
 */
contract FullFlowLiveTest is Script {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    address constant POOL_MANAGER     = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POSITION_MANAGER = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;
    uint256 constant TOTAL_SUPPLY     = 1_000_000_000 * 1e18;

    ClawclickConfig  config;
    ClawclickHook    hook;
    ClawclickFactory factory;
    TestSwapRouter   router;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("");
        console2.log("================================================================");
        console2.log("  CLAWCLICK FULL-FLOW LIVE TEST  -  ETH Sepolia");
        console2.log("================================================================");
        console2.log("Deployer :", deployer);
        console2.log("Balance  :", deployer.balance);
        console2.log("");

        vm.startBroadcast(pk);

        // ════════════════════════════════════════════════════════════
        //  1. DEPLOY STACK
        // ════════════════════════════════════════════════════════════
        console2.log("=== 1. DEPLOY STACK ===");

        config = new ClawclickConfig(deployer, deployer);
        console2.log("Config  :", address(config));

        _deployHook();
        console2.log("Hook    :", address(hook));

        factory = new ClawclickFactory(
            config, 
            IPoolManager(POOL_MANAGER), 
            hook,
            POSITION_MANAGER,
            BootstrapETH(payable(address(0))),  // No bootstrap for testing
            deployer
        );
        config.setFactory(address(factory));
        console2.log("Factory :", address(factory));

        router = new TestSwapRouter(IPoolManager(POOL_MANAGER));
        console2.log("Router  :", address(router));
        console2.log("");

        // ════════════════════════════════════════════════════════════
        //  2. CREATE LAUNCH  (1 ETH MCAP → 50% starting tax)
        // ════════════════════════════════════════════════════════════
        console2.log("=== 2. CREATE LAUNCH (1 ETH MCAP = 50% tax) ===");

        uint256 bootstrap = 0.001 ether;  // $2 bootstrap
        (address token, PoolId poolId) = factory.createLaunch{value: bootstrap}(
            ClawclickFactory.CreateParams({
                name: "Graduation Token",
                symbol: "GRAD",
                beneficiary: deployer,
                agentWallet: deployer,
                targetMcapETH: 1 ether,
                feeSplit: ClawclickFactory.FeeSplit({
                    wallets: [address(0), address(0), address(0), address(0), address(0)],
                    percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                    count: 0
                })
            })
        );
        PoolKey memory key = _buildPoolKey(token);
        console2.log("Token        :", token);
        console2.log("");

        // ════════════════════════════════════════════════════════════
        //  3. POOL ACTIVATED  (automatically with bootstrap liquidity)
        // ════════════════════════════════════════════════════════════
        console2.log("=== 3. POOL ACTIVATED (bootstrap) ===");
        _logState(poolId, "Post-activation");

        // ════════════════════════════════════════════════════════════
        //  4. EPOCH 0: Tax = 50%.  Show fee accounting.
        // ════════════════════════════════════════════════════════════
        console2.log("=== 4. EPOCH 0 BUYS (tax ~50%) ===");

        uint256 totalFeesBefore = hook.beneficiaryFeesETH(deployer)
                                + hook.platformFeesETH();

        // Two small buys so we can see fees accumulate
        router.buy{value: 0.002 ether}(key, 0.002 ether);
        console2.log("Buy #1: 0.002 ETH");

        router.buy{value: 0.002 ether}(key, 0.002 ether);
        console2.log("Buy #2: 0.002 ETH");

        uint256 totalFeesAfter = hook.beneficiaryFeesETH(deployer)
                               + hook.platformFeesETH();
        console2.log("  ETH fees accumulated :", totalFeesAfter - totalFeesBefore);
        _logState(poolId, "After epoch-0 buys");

        // ════════════════════════════════════════════════════════════
        //  5. PUSH through EPOCH 1  (MCAP >= 2 ETH, tax drops to 25%)
        // ════════════════════════════════════════════════════════════
        console2.log("=== 5. PUSH TO EPOCH 1 ===");
        router.buy{value: 0.5 ether}(key, 0.5 ether);
        _logState(poolId, "After 0.5 ETH buy");

        // ════════════════════════════════════════════════════════════
        //  6. PUSH through EPOCH 2  (MCAP >= 4 ETH, tax drops to 12.5%)
        // ════════════════════════════════════════════════════════════
        console2.log("=== 6. PUSH TO EPOCH 2 ===");
        router.buy{value: 0.6 ether}(key, 0.6 ether);
        _logState(poolId, "After 0.6 ETH buy");

        // ════════════════════════════════════════════════════════════
        //  7. PUSH through EPOCH 3  (MCAP >= 8 ETH, tax drops to 6.25%)
        // ════════════════════════════════════════════════════════════
        console2.log("=== 7. PUSH TO EPOCH 3 ===");
        router.buy{value: 0.8 ether}(key, 0.8 ether);
        _logState(poolId, "After 0.8 ETH buy");

        // ════════════════════════════════════════════════════════════
        //  8. PUSH to GRADUATION  (MCAP >= 16 ETH, epoch 4)
        // ════════════════════════════════════════════════════════════
        console2.log("=== 8. PUSH TO GRADUATION ===");
        router.buy{value: 1.5 ether}(key, 1.5 ether);
        _logState(poolId, "After 1.5 ETH buy");

        // Safety: keep pushing until graduated
        if (!hook.isGraduated(poolId)) {
            console2.log("  Extra push 1.0 ETH ...");
            router.buy{value: 1.0 ether}(key, 1.0 ether);
            _logState(poolId, "After extra push");
        }
        if (!hook.isGraduated(poolId)) {
            console2.log("  Extra push 0.8 ETH ...");
            router.buy{value: 0.8 ether}(key, 0.8 ether);
            _logState(poolId, "After extra push 2");
        }

        // ════════════════════════════════════════════════════════════
        //  9. POST-GRADUATION TRADE  (tax = 0, no limits)
        // ════════════════════════════════════════════════════════════
        console2.log("=== 9. POST-GRADUATION TRADE ===");
        bool graduated = hook.isGraduated(poolId);
        console2.log("  Graduated:", graduated);

        if (graduated) {
            uint256 fb = hook.beneficiaryFeesETH(deployer) + hook.platformFeesETH();
            router.buy{value: 0.01 ether}(key, 0.01 ether);
            uint256 fa = hook.beneficiaryFeesETH(deployer) + hook.platformFeesETH();
            console2.log("  Post-grad buy 0.01 ETH");
            console2.log("  New fees (should be 0):", fa - fb);
        }
        console2.log("");

        // ════════════════════════════════════════════════════════════
        //  10. SELL TOKENS (shows sell path works)
        // ════════════════════════════════════════════════════════════
        console2.log("=== 10. SELL TOKENS ===");
        uint256 tokenBal = IERC20(token).balanceOf(deployer);
        console2.log("  Token balance:", tokenBal);
        if (tokenBal > 1e18) {
            uint256 sellAmt = tokenBal / 4;
            IERC20(token).approve(address(router), sellAmt);
            router.sell(key, sellAmt);
            console2.log("  Sold tokens :", sellAmt);
            console2.log("  Remaining   :", IERC20(token).balanceOf(deployer));
        }
        console2.log("");

        // ════════════════════════════════════════════════════════════
        //  11. REPOSITION BY EPOCH (removed – repositionByEpoch no longer exists)
        // ════════════════════════════════════════════════════════════
        console2.log("=== 11. REPOSITION BY EPOCH (skipped) ===");
        console2.log("  Current epoch:", hook.getCurrentEpoch(poolId));
        console2.log("");

        // ════════════════════════════════════════════════════════════
        //  12. CLAIM ALL ACCUMULATED FEES
        // ════════════════════════════════════════════════════════════
        console2.log("=== 12. CLAIM FEES ===");

        uint256 bFeeETH = hook.beneficiaryFeesETH(deployer);
        if (bFeeETH > 0) {
            hook.claimBeneficiaryFeesETH(deployer);
            console2.log("  Beneficiary ETH :", bFeeETH);
        }

        uint256 pFeeETH = hook.platformFeesETH();
        if (pFeeETH > 0) {
            hook.claimPlatformFeesETH();
            console2.log("  Platform ETH    :", pFeeETH);
        }

        uint256 bFeeTok = hook.beneficiaryFeesToken(deployer, token);
        if (bFeeTok > 0) {
            hook.claimBeneficiaryFeesToken(deployer, token);
            console2.log("  Beneficiary Tok :", bFeeTok);
        }

        uint256 pFeeTok = hook.platformFeesToken(token);
        if (pFeeTok > 0) {
            hook.claimPlatformFeesToken(token);
            console2.log("  Platform Tok    :", pFeeTok);
        }
        console2.log("");

        // ════════════════════════════════════════════════════════════
        //  FINAL SUMMARY
        // ════════════════════════════════════════════════════════════
        console2.log("================================================================");
        console2.log("  FINAL SUMMARY");
        console2.log("================================================================");
        console2.log("Config    :", address(config));
        console2.log("Hook      :", address(hook));
        console2.log("Factory   :", address(factory));
        console2.log("Router    :", address(router));
        console2.log("Token     :", token);
        console2.log("Graduated :", hook.isGraduated(poolId));
        console2.log("ETH left  :", deployer.balance);
        console2.log("================================================================");

        vm.stopBroadcast();
    }

    // ─── Log pool state (epoch, tax, limits, MCAP) ──────────────
    function _logState(PoolId poolId, string memory label) internal view {
        (uint160 sqrtP,,,) = IPoolManager(POOL_MANAGER).getSlot0(poolId);
        uint256 mcap  = _mcap(sqrtP);
        uint256 epoch = hook.getCurrentEpoch(poolId);
        uint256 tax   = hook.getCurrentTax(poolId);
        (uint256 maxTx, uint256 maxW) = hook.getCurrentLimits(poolId);
        bool    grad  = hook.isGraduated(poolId);

        console2.log("---", label, "---");
        console2.log("  MCAP (ETH):", mcap / 1e18);
        console2.log("  MCAP (wei):", mcap);
        console2.log("  Epoch     :", epoch);
        console2.log("  Tax (bps) :", tax);
        console2.log("  MaxTx     :", maxTx);
        console2.log("  MaxWallet :", maxW);
        console2.log("  Graduated :", grad);
        console2.log("");
    }

    // ─── Hook deploy via CREATE2 + HookMiner ────────────────────
    function _deployHook() internal {
        Hooks.Permissions memory perms = Hooks.Permissions({
            beforeInitialize: true, afterInitialize: false,
            beforeAddLiquidity: true, afterAddLiquidity: false,
            beforeRemoveLiquidity: true, afterRemoveLiquidity: false,
            beforeSwap: true, afterSwap: true,
            beforeDonate: false, afterDonate: false,
            beforeSwapReturnDelta: true, afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false, afterRemoveLiquidityReturnDelta: false
        });
        uint160 flags = _encodePerms(perms);
        address create2 = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
        (address predicted, bytes32 salt) = HookMiner.find(
            create2, flags,
            type(ClawclickHook).creationCode,
            abi.encode(POOL_MANAGER, address(config))
        );
        hook = new ClawclickHook{salt: salt}(IPoolManager(POOL_MANAGER), config);
        require(address(hook) == predicted, "Hook addr mismatch");
    }

    function _buildPoolKey(address token) internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: 0x800000, tickSpacing: 200,
            hooks: IHooks(address(hook))
        });
    }

    function _encodePerms(Hooks.Permissions memory p) internal pure returns (uint160) {
        return uint160(
            (p.beforeInitialize ? 1 << 13 : 0) | (p.afterInitialize ? 1 << 12 : 0) |
            (p.beforeAddLiquidity ? 1 << 11 : 0) | (p.afterAddLiquidity ? 1 << 10 : 0) |
            (p.beforeRemoveLiquidity ? 1 << 9 : 0) | (p.afterRemoveLiquidity ? 1 << 8 : 0) |
            (p.beforeSwap ? 1 << 7 : 0) | (p.afterSwap ? 1 << 6 : 0) |
            (p.beforeDonate ? 1 << 5 : 0) | (p.afterDonate ? 1 << 4 : 0) |
            (p.beforeSwapReturnDelta ? 1 << 3 : 0) | (p.afterSwapReturnDelta ? 1 << 2 : 0) |
            (p.afterAddLiquidityReturnDelta ? 1 << 1 : 0) | (p.afterRemoveLiquidityReturnDelta ? 1 << 0 : 0)
        );
    }

    /// @dev Same formula as hook's _getCurrentMcap
    function _mcap(uint160 sqrtPriceX96) internal pure returns (uint256) {
        uint256 a = (TOTAL_SUPPLY * (1 << 96)) / uint256(sqrtPriceX96);
        return (a * (1 << 96)) / uint256(sqrtPriceX96);
    }
}
