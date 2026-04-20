// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickConfig.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/utils/BootstrapETH.sol";
import "../src/utils/HookMiner.sol";
import "v4-core/src/libraries/Hooks.sol";

/**
 * @title DeployFullEcosystem
 * @notice Deploy the COMPLETE Claw.Click ecosystem on Base mainnet:
 *         Config → Hook (CREATE2 mined) → BootstrapETH → Factory → wire
 *
 * Deploys 4 contracts + 1 wiring tx = 5 total transactions:
 *   1. ClawclickConfig     (CREATE,  nonce N)
 *   2. ClawclickHook       (CREATE2, nonce N+1 — tx to CREATE2 deployer)
 *   3. BootstrapETH        (CREATE,  nonce N+2 — uses predicted Factory addr)
 *   4. ClawclickFactory    (CREATE,  nonce N+3 — uses actual BootstrapETH addr)
 *   5. config.setFactory() (CALL,    nonce N+4)
 *
 * The circular dependency (Factory needs BootstrapETH, BootstrapETH needs Factory)
 * is resolved by predicting the Factory's CREATE address from (deployer, nonce N+3).
 *
 * Usage:
 *   cd contracts && DEPLOYER_PRIVATE_KEY=0x... forge script \
 *     script/DeployFullEcosystem.s.sol \
 *     --rpc-url https://base-mainnet.g.alchemy.com/v2/YOUR_KEY \
 *     --broadcast --legacy
 */
contract DeployFullEcosystem is Script {
    // ── Uniswap V4 on Base mainnet (not ours, never changes) ──
    address constant POOL_MANAGER     = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;

    // ── Treasury (receives platform fees) ──
    address constant TREASURY = 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b;

    // ── Foundry deterministic CREATE2 deployer ──
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;

    function _encodePermissions(Hooks.Permissions memory p) internal pure returns (uint160) {
        return uint160(
            (p.beforeInitialize            ? 1 << 13 : 0) |
            (p.afterInitialize             ? 1 << 12 : 0) |
            (p.beforeAddLiquidity          ? 1 << 11 : 0) |
            (p.afterAddLiquidity           ? 1 << 10 : 0) |
            (p.beforeRemoveLiquidity       ? 1 <<  9 : 0) |
            (p.afterRemoveLiquidity        ? 1 <<  8 : 0) |
            (p.beforeSwap                  ? 1 <<  7 : 0) |
            (p.afterSwap                   ? 1 <<  6 : 0) |
            (p.beforeDonate                ? 1 <<  5 : 0) |
            (p.afterDonate                 ? 1 <<  4 : 0) |
            (p.beforeSwapReturnDelta       ? 1 <<  3 : 0) |
            (p.afterSwapReturnDelta        ? 1 <<  2 : 0) |
            (p.afterAddLiquidityReturnDelta    ? 1 << 1 : 0) |
            (p.afterRemoveLiquidityReturnDelta ? 1 << 0 : 0)
        );
    }

    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer   = vm.addr(deployerPk);

        console2.log("============================================");
        console2.log("  CLAW.CLICK FULL ECOSYSTEM DEPLOY (Base)");
        console2.log("============================================");
        console2.log("Deployer:", deployer);
        console2.log("Treasury:", TREASURY);
        console2.log("");

        // ═══════════════════════════════════════════════
        // PRE-FLIGHT: Predict addresses & mine hook salt
        // ═══════════════════════════════════════════════
        uint64 nonce = vm.getNonce(deployer);
        console2.log("Current nonce:", nonce);

        // Config = CREATE at nonce N
        address predictedConfig = vm.computeCreateAddress(deployer, nonce);
        console2.log("Predicted Config  (nonce N):", predictedConfig);

        // Hook = CREATE2 at nonce N+1 (tx to CREATE2_DEPLOYER, address from salt)
        // BootstrapETH = CREATE at nonce N+2
        address predictedBootstrap = vm.computeCreateAddress(deployer, nonce + 2);
        console2.log("Predicted Bootstrap (nonce N+2):", predictedBootstrap);

        // Factory = CREATE at nonce N+3
        address predictedFactory = vm.computeCreateAddress(deployer, nonce + 3);
        console2.log("Predicted Factory (nonce N+3):", predictedFactory);
        console2.log("");

        // ── Mine Hook salt ──
        Hooks.Permissions memory perms = Hooks.Permissions({
            beforeInitialize:                true,
            afterInitialize:                 false,
            beforeAddLiquidity:              true,
            afterAddLiquidity:               false,
            beforeRemoveLiquidity:           true,
            afterRemoveLiquidity:            false,
            beforeSwap:                      true,
            afterSwap:                       true,
            beforeDonate:                    false,
            afterDonate:                     false,
            beforeSwapReturnDelta:           true,
            afterSwapReturnDelta:            false,
            afterAddLiquidityReturnDelta:    false,
            afterRemoveLiquidityReturnDelta: false
        });
        uint160 requiredFlags = _encodePermissions(perms);
        console2.log("Required hook flags (decimal):", requiredFlags);
        console2.log("Required hook flags (hex):", uint256(requiredFlags));

        console2.log("Mining hook CREATE2 salt... (may take up to 60s)");
        (address predictedHook, bytes32 hookSalt) = HookMiner.find(
            CREATE2_DEPLOYER,
            requiredFlags,
            type(ClawclickHook).creationCode,
            abi.encode(POOL_MANAGER, predictedConfig)
        );
        console2.log("Hook salt found!");
        console2.log("Predicted Hook:", predictedHook);
        console2.logBytes32(hookSalt);
        console2.log("");

        // ═══════════════════════════════════════════════
        // BROADCAST — 5 transactions
        // ═══════════════════════════════════════════════
        vm.startBroadcast(deployerPk);

        // ── TX 1: Config (nonce N) ──
        ClawclickConfig config = new ClawclickConfig(
            TREASURY,
            deployer
        );
        require(address(config) == predictedConfig, "Config address mismatch!");
        console2.log("[1/5] Config:", address(config));

        // ── TX 2: Hook via CREATE2 (nonce N+1) ──
        ClawclickHook hook = new ClawclickHook{salt: hookSalt}(
            IPoolManager(POOL_MANAGER),
            config
        );
        require(address(hook) == predictedHook, "Hook address mismatch!");
        require(
            (uint160(address(hook)) & requiredFlags) == requiredFlags,
            "Hook permission bits invalid!"
        );
        console2.log("[2/5] Hook:", address(hook));

        // ── TX 3: BootstrapETH (nonce N+2) — uses PREDICTED factory ──
        BootstrapETH bootstrapETH = new BootstrapETH(predictedFactory);
        require(address(bootstrapETH) == predictedBootstrap, "BootstrapETH address mismatch!");
        console2.log("[3/5] BootstrapETH:", address(bootstrapETH));

        // ── TX 4: Factory (nonce N+3) — uses ACTUAL bootstrapETH ──
        ClawclickFactory factory = new ClawclickFactory(
            config,
            IPoolManager(POOL_MANAGER),
            hook,
            POSITION_MANAGER,
            bootstrapETH,
            deployer
        );
        require(address(factory) == predictedFactory, "Factory address mismatch!");
        console2.log("[4/5] Factory:", address(factory));

        // ── TX 5: Wire config → factory ──
        config.setFactory(address(factory));
        console2.log("[5/5] config.setFactory() done");

        vm.stopBroadcast();

        // ═══════════════════════════════════════════════
        // SUMMARY
        // ═══════════════════════════════════════════════
        console2.log("");
        console2.log("============================================");
        console2.log("  DEPLOYMENT COMPLETE!");
        console2.log("============================================");
        console2.log("Config:       ", address(config));
        console2.log("Hook:         ", address(hook));
        console2.log("Factory:      ", address(factory));
        console2.log("BootstrapETH: ", address(bootstrapETH));
        console2.log("--------------------------------------------");
        console2.log("PoolManager:  ", POOL_MANAGER);
        console2.log("PositionMgr:  ", POSITION_MANAGER);
        console2.log("Treasury:     ", TREASURY);
        console2.log("============================================");
        console2.log("");
        console2.log("VERIFICATION:");
        console2.log("  config.factory()        =", address(factory));
        console2.log("  factory.hook()          =", address(hook));
        console2.log("  factory.bootstrapETH()  =", address(bootstrapETH));
        console2.log("  bootstrapETH.factory()  =", address(factory));
        console2.log("");
        console2.log("NEXT STEPS:");
        console2.log("1. Fund BootstrapETH with ETH for free bootstraps:");
        console2.log("   cast send <BootstrapETH> --value 0.1ether --rpc-url ...");
        console2.log("2. Update app/lib/contracts-base.ts + contracts.ts");
        console2.log("3. Update backend .env (FACTORY_ADDRESS, HOOK_ADDRESS)");
        console2.log("4. Update cli/.env");
        console2.log("5. Test DIRECT + AGENT launches");
    }
}
