// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickConfig.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickToken.sol";
import "../src/utils/HookMiner.sol";
import "../src/utils/BootstrapETH.sol";
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
 * @title LiveTest
 * @notice Deploys the full Clawclick stack to ETH Sepolia and runs real
 *         on-chain transactions: launch, activation, buys, sells, fee claims.
 *
 *  Usage:
 *    source .env
 *    forge script script/LiveTest.s.sol \
 *      --rpc-url $ETH_SEPOLIA_RPC_URL \
 *      --broadcast \
 *      --via-ir \
 *      -vvvv
 */
contract LiveTest is Script {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    // ── ETH Sepolia v4 addresses ──────────────────────────────
    address constant POOL_MANAGER      = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POSITION_MANAGER  = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;
    uint256 constant TOTAL_SUPPLY      = 1_000_000_000 * 1e18;

    // ── deployed addresses (filled during run) ────────────────
    ClawclickConfig   config;
    ClawclickHook     hook;
    ClawclickFactory  factory;
    TestSwapRouter    router;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("");
        console2.log("==========================================================");
        console2.log("  CLAWCLICK LIVE TEST  -  ETH Sepolia");
        console2.log("==========================================================");
        console2.log("Deployer:", deployer);
        console2.log("Balance :", deployer.balance);
        console2.log("");

        vm.startBroadcast(pk);

        // ═══════════════════════════════════════════════════════
        // PHASE 1  —  DEPLOY ENTIRE STACK
        // ═══════════════════════════════════════════════════════

        console2.log("--- Phase 1: Deploy ---");

        // 1a. Config
        config = new ClawclickConfig(deployer, deployer);
        console2.log("[1] Config     :", address(config));

        // 1b. Mine + deploy Hook with correct permission flags
        _deployHook();
        console2.log("[2] Hook       :", address(hook));

        // 1c. Factory
        factory = new ClawclickFactory(
            config,
            IPoolManager(POOL_MANAGER),
            hook,
            POSITION_MANAGER,  // address
            BootstrapETH(payable(address(0))),  // No bootstrap for testing
            deployer  // owner
        );
        config.setFactory(address(factory));
        console2.log("[3] Factory    :", address(factory));

        // 1d. Swap router  (utility for buy/sell calls)
        router = new TestSwapRouter(IPoolManager(POOL_MANAGER));
        console2.log("[4] SwapRouter :", address(router));

        console2.log("");

        // ═══════════════════════════════════════════════════════
        // PHASE 2  —  CREATE LAUNCH
        // ═══════════════════════════════════════════════════════

        console2.log("--- Phase 2: Create Launch (1 ETH MCAP) ---");

        uint256 bootstrap = 0.001 ether;  // $2 bootstrap
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name:          "DeepSea Test",
            symbol:        "DST",
            beneficiary:   deployer,
            agentWallet:   deployer,
            targetMcapETH: 1 ether,
            feeSplit: ClawclickFactory.FeeSplit({
                wallets: [address(0), address(0), address(0), address(0), address(0)],
                percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                count: 0
            })
        });

        (address token, PoolId poolId) = factory.createLaunch{value: bootstrap}(params);
        PoolKey memory key = _buildPoolKey(token);

        console2.log("[5] Token      :", token);
        console2.log("    PoolId     :");
        console2.logBytes32(PoolId.unwrap(poolId));

        // Verify pool starts unactivated
        bool activated = factory.poolActivated(poolId);
        console2.log("    Activated? :", activated);
        console2.log("");

        // ═══════════════════════════════════════════════════════
        // PHASE 3  —  ACTIVATE POOL
        // ═══════════════════════════════════════════════════════

        console2.log("--- Phase 3: Pool Activated (bootstrap) ---");

        // Pool automatically activated with bootstrap liquidity

        activated = factory.poolActivated(poolId);
        console2.log("[6] Activated? :", activated);

        uint256 posTokenId = factory.positionTokenId(poolId);
        console2.log("    LP NFT Id  :", posTokenId);

        // Read current MCAP
        (uint160 sqrtP,,,) = IPoolManager(POOL_MANAGER).getSlot0(poolId);
        uint256 mcap = _mcap(sqrtP);
        console2.log("    MCAP       :", mcap, "(wei)");
        console2.log("    MCAP (ETH) :", mcap / 1e18);

        // Check initial tax
        uint256 tax = hook.getCurrentTax(poolId);
        console2.log("    Tax (bps)  :", tax);

        // Check initial limits
        (uint256 maxTx, uint256 maxWallet) = hook.getCurrentLimits(poolId);
        console2.log("    MaxTx      :", maxTx);
        console2.log("    MaxWallet  :", maxWallet);
        console2.log("");

        // ═══════════════════════════════════════════════════════
        // PHASE 4  —  BUY (ETH → TOKEN)
        // ═══════════════════════════════════════════════════════

        console2.log("--- Phase 4: Buy 0.001 ETH worth of tokens ---");

        uint256 tokenBefore = IERC20(token).balanceOf(deployer);

        // Fund router with ETH for the swap
        (bool ok,) = address(router).call{value: 0.01 ether}("");
        require(ok, "Router fund failed");

        BalanceDelta buyDelta = router.buy{value: 0.001 ether}(key, 0.001 ether);

        uint256 tokenAfter = IERC20(token).balanceOf(deployer);
        uint256 tokensReceived = tokenAfter - tokenBefore;

        console2.log("[7] Tokens received:", tokensReceived);

        // Check fees accrued
        uint256 beneficiaryFees = hook.beneficiaryFeesETH(deployer);
        uint256 platformFees    = hook.platformFeesETH();
        console2.log("    BeneficiaryFees:", beneficiaryFees);
        console2.log("    PlatformFees   :", platformFees);
        console2.log("");

        // ═══════════════════════════════════════════════════════
        // PHASE 5  —  SELL (TOKEN → ETH)
        // ═══════════════════════════════════════════════════════

        console2.log("--- Phase 5: Sell half the tokens ---");

        // Need to sell at least MIN_SWAP_AMOUNT worth
        uint256 sellAmount = tokensReceived / 2;
        if (sellAmount > 1e14) {
            IERC20(token).approve(address(router), sellAmount);
            BalanceDelta sellDelta = router.sell(key, sellAmount);

            uint256 tokenAfterSell = IERC20(token).balanceOf(deployer);
            console2.log("[8] Token balance after sell:", tokenAfterSell);

            // Token fees from sell
            uint256 beneficiaryTokenFees = hook.beneficiaryFeesToken(deployer, token);
            uint256 platformTokenFees    = hook.platformFeesToken(token);
            console2.log("    BeneficiaryTokenFees:", beneficiaryTokenFees);
            console2.log("    PlatformTokenFees   :", platformTokenFees);
        } else {
            console2.log("[8] Skipping sell (insufficient tokens)");
        }
        console2.log("");

        // ═══════════════════════════════════════════════════════
        // PHASE 6  —  CLAIM FEES
        // ═══════════════════════════════════════════════════════

        console2.log("--- Phase 6: Claim fees ---");

        // Claim beneficiary ETH fees
        uint256 claimable = hook.beneficiaryFeesETH(deployer);
        if (claimable > 0) {
            uint256 ethBefore = deployer.balance;
            hook.claimBeneficiaryFeesETH(deployer);
            uint256 ethAfter = deployer.balance;
            console2.log("[9] Claimed beneficiary ETH:", ethAfter - ethBefore);
        } else {
            console2.log("[9] No beneficiary ETH fees to claim");
        }

        // Claim platform ETH fees (deployer is treasury)
        uint256 platformClaimable = hook.platformFeesETH();
        if (platformClaimable > 0) {
            uint256 ethBefore2 = deployer.balance;
            hook.claimPlatformFeesETH();
            uint256 ethAfter2 = deployer.balance;
            console2.log("[10] Claimed platform ETH:", ethAfter2 - ethBefore2);
        } else {
            console2.log("[10] No platform ETH fees to claim");
        }

        // Claim beneficiary token fees
        uint256 tokenClaimable = hook.beneficiaryFeesToken(deployer, token);
        if (tokenClaimable > 0) {
            uint256 tBefore = IERC20(token).balanceOf(deployer);
            hook.claimBeneficiaryFeesToken(deployer, token);
            uint256 tAfter = IERC20(token).balanceOf(deployer);
            console2.log("[11] Claimed beneficiary tokens:", tAfter - tBefore);
        } else {
            console2.log("[11] No beneficiary token fees to claim");
        }

        // Claim platform token fees
        uint256 platformTokenClaimable = hook.platformFeesToken(token);
        if (platformTokenClaimable > 0) {
            uint256 tBefore2 = IERC20(token).balanceOf(deployer);
            hook.claimPlatformFeesToken(token);
            uint256 tAfter2 = IERC20(token).balanceOf(deployer);
            console2.log("[12] Claimed platform tokens:", tAfter2 - tBefore2);
        } else {
            console2.log("[12] No platform token fees to claim");
        }
        console2.log("");

        // ═══════════════════════════════════════════════════════
        // PHASE 7  —  SECOND LAUNCH (5 ETH MCAP)
        // ═══════════════════════════════════════════════════════

        console2.log("--- Phase 7: Second Launch (5 ETH MCAP) ---");

        ClawclickFactory.CreateParams memory params2 = ClawclickFactory.CreateParams({
            name:          "Claw Alpha",
            symbol:        "CLAW",
            beneficiary:   deployer,
            agentWallet:   deployer,
            targetMcapETH: 5 ether,
            feeSplit: ClawclickFactory.FeeSplit({
                wallets: [address(0), address(0), address(0), address(0), address(0)],
                percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                count: 0
            })
        });

        uint256 bootstrap2 = 0.005 ether;  // $10 bootstrap for 5 ETH MCAP
        (address token2, PoolId poolId2) = factory.createLaunch{value: bootstrap2}(params2);
        PoolKey memory key2 = _buildPoolKey(token2);

        console2.log("[13] Token2    :", token2);

        // Pool automatically activated
        console2.log("[14] Activated :", factory.poolActivated(poolId2));

        // Buy
        BalanceDelta buyDelta2 = router.buy{value: 0.001 ether}(key2, 0.001 ether);
        uint256 t2bal = IERC20(token2).balanceOf(deployer);
        console2.log("[15] Balance   :", t2bal);
        console2.log("");

        // ═══════════════════════════════════════════════════════
        // SUMMARY
        // ═══════════════════════════════════════════════════════

        console2.log("==========================================================");
        console2.log("  DEPLOYMENT SUMMARY");
        console2.log("==========================================================");
        console2.log("Config         :", address(config));
        console2.log("Hook           :", address(hook));
        console2.log("Factory        :", address(factory));
        console2.log("SwapRouter     :", address(router));
        console2.log("Token 1 (DST)  :", token);
        console2.log("Token 2 (CLAW) :", token2);
        console2.log("Total launches :", factory.totalLaunches());
        console2.log("Deployer bal   :", deployer.balance);
        console2.log("==========================================================");
        console2.log("");
        console2.log("View on Etherscan Sepolia:");
        console2.log("  Config:  https://sepolia.etherscan.io/address/", address(config));
        console2.log("  Hook:    https://sepolia.etherscan.io/address/", address(hook));
        console2.log("  Factory: https://sepolia.etherscan.io/address/", address(factory));
        console2.log("  Token 1: https://sepolia.etherscan.io/address/", token);
        console2.log("  Token 2: https://sepolia.etherscan.io/address/", token2);
        console2.log("==========================================================");

        vm.stopBroadcast();
    }

    // ── INTERNAL HELPERS ──────────────────────────────────────

    function _deployHook() internal {
        Hooks.Permissions memory perms = Hooks.Permissions({
            beforeInitialize:              true,
            afterInitialize:               false,
            beforeAddLiquidity:            true,
            afterAddLiquidity:             false,
            beforeRemoveLiquidity:         true,
            afterRemoveLiquidity:          false,
            beforeSwap:                    true,
            afterSwap:                     true,
            beforeDonate:                  false,
            afterDonate:                   false,
            beforeSwapReturnDelta:         true,
            afterSwapReturnDelta:          false,
            afterAddLiquidityReturnDelta:  false,
            afterRemoveLiquidityReturnDelta: false
        });

        uint160 requiredFlags = _encodePermissions(perms);

        bytes memory creationCode = type(ClawclickHook).creationCode;
        bytes memory constructorArgs = abi.encode(POOL_MANAGER, address(config));

        // When forge broadcasts `new{salt:}`, the deployer is the
        // deterministic CREATE2 factory at 0x4e59...956C.
        address create2Deployer = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

        (address predicted, bytes32 salt) = HookMiner.find(
            create2Deployer,
            requiredFlags,
            creationCode,
            constructorArgs
        );

        hook = new ClawclickHook{salt: salt}(
            IPoolManager(POOL_MANAGER),
            config
        );

        require(address(hook) == predicted, "Hook address mismatch");
    }

    function _buildPoolKey(address token) internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee:       0x800000,
            tickSpacing: 200,
            hooks:     IHooks(address(hook))
        });
    }

    function _encodePermissions(Hooks.Permissions memory p) internal pure returns (uint160) {
        return uint160(
            (p.beforeInitialize              ? 1 << 13 : 0) |
            (p.afterInitialize               ? 1 << 12 : 0) |
            (p.beforeAddLiquidity            ? 1 << 11 : 0) |
            (p.afterAddLiquidity             ? 1 << 10 : 0) |
            (p.beforeRemoveLiquidity         ? 1 << 9  : 0) |
            (p.afterRemoveLiquidity          ? 1 << 8  : 0) |
            (p.beforeSwap                    ? 1 << 7  : 0) |
            (p.afterSwap                     ? 1 << 6  : 0) |
            (p.beforeDonate                  ? 1 << 5  : 0) |
            (p.afterDonate                   ? 1 << 4  : 0) |
            (p.beforeSwapReturnDelta         ? 1 << 3  : 0) |
            (p.afterSwapReturnDelta          ? 1 << 2  : 0) |
            (p.afterAddLiquidityReturnDelta  ? 1 << 1  : 0) |
            (p.afterRemoveLiquidityReturnDelta ? 1 << 0  : 0)
        );
    }

    function _mcap(uint160 sqrtPriceX96) internal pure returns (uint256) {
        uint256 intermediate = (TOTAL_SUPPLY * (1 << 96)) / uint256(sqrtPriceX96);
        return (intermediate * (1 << 96)) / uint256(sqrtPriceX96);
    }
}
