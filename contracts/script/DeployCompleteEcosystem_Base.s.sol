// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {ClawclickConfig} from "../src/core/ClawclickConfig.sol";
import {ClawclickHook} from "../src/core/ClawclickHook_V4.sol";
import {BootstrapETH} from "../src/utils/BootstrapETH.sol";
import {HookMiner} from "../src/utils/HookMiner.sol";
import {AgentBirthCertificateNFT} from "../src/identity/AgentBirthCertificateNFT.sol";
import {MemoryStorage} from "../src/identity/MemoryStorage.sol";
import {AgentLaunchBundler} from "../src/bundler/AgentLaunchBundler.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";

/**
 * @title DeployCompleteEcosystem_Base
 * @notice Deploy ALL 7 contracts to Base mainnet
 */
contract DeployCompleteEcosystem_Base is Script {
    // Uniswap V4 on Base mainnet
    address constant POOL_MANAGER     = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;

    // Treasury (SAFE multisig)
    address constant TREASURY = 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b;

    // CREATE2 deployer
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
        console2.log("  COMPLETE ECOSYSTEM DEPLOY - BASE MAINNET");
        console2.log("============================================");
        console2.log("Deployer:", deployer);
        console2.log("Treasury:", TREASURY);
        console2.log("");

        // Predict addresses
        uint64 nonce = vm.getNonce(deployer);
        console2.log("Current nonce:", nonce);

        // Config = nonce N
        address predictedConfig = vm.computeCreateAddress(deployer, nonce);
        console2.log("Predicted Config (nonce N):", predictedConfig);

        // Hook = nonce N+1 (CREATE2)
        // BootstrapETH = nonce N+2
        address predictedBootstrap = vm.computeCreateAddress(deployer, nonce + 2);
        console2.log("Predicted Bootstrap (nonce N+2):", predictedBootstrap);

        // Factory = nonce N+3
        address predictedFactory = vm.computeCreateAddress(deployer, nonce + 3);
        console2.log("Predicted Factory (nonce N+3):", predictedFactory);

        // BirthCert = nonce N+5 (after config.setFactory at N+4)
        address predictedBirthCert = vm.computeCreateAddress(deployer, nonce + 5);

        // MemoryStorage = nonce N+6
        address predictedMemory = vm.computeCreateAddress(deployer, nonce + 6);

        // Bundler = nonce N+7
        address predictedBundler = vm.computeCreateAddress(deployer, nonce + 7);

        console2.log("");

        // Mine Hook salt
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
        console2.log("Required hook flags:", requiredFlags);

        console2.log("Mining hook CREATE2 salt...");
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
        // BROADCAST
        // ═══════════════════════════════════════════════
        vm.startBroadcast(deployerPk);

        // TX 1: Config (nonce N)
        ClawclickConfig config = new ClawclickConfig(TREASURY, deployer);
        require(address(config) == predictedConfig, "Config address mismatch!");
        console2.log("[1/8] Config:", address(config));

        // TX 2: Hook via CREATE2 (nonce N+1)
        ClawclickHook hook = new ClawclickHook{salt: hookSalt}(
            IPoolManager(POOL_MANAGER),
            config
        );
        require(address(hook) == predictedHook, "Hook address mismatch!");
        console2.log("[2/8] Hook:", address(hook));

        // TX 3: BootstrapETH (nonce N+2)
        BootstrapETH bootstrapETH = new BootstrapETH(predictedFactory);
        require(address(bootstrapETH) == predictedBootstrap, "BootstrapETH address mismatch!");
        console2.log("[3/8] BootstrapETH:", address(bootstrapETH));

        // TX 4: Factory (nonce N+3)
        ClawclickFactory factory = new ClawclickFactory(
            config,
            IPoolManager(POOL_MANAGER),
            hook,
            POSITION_MANAGER,
            bootstrapETH,
            deployer
        );
        require(address(factory) == predictedFactory, "Factory address mismatch!");
        console2.log("[4/8] Factory:", address(factory));

        // TX 5: Wire config → factory (nonce N+4)
        config.setFactory(address(factory));
        console2.log("[5/8] config.setFactory() done");

        // TX 6: BirthCert (nonce N+5)
        AgentBirthCertificateNFT birthCert = new AgentBirthCertificateNFT(
            "https://api.claw.click/metadata/",
            TREASURY
        );
        require(address(birthCert) == predictedBirthCert, "BirthCert address mismatch!");
        console2.log("[6/8] BirthCert:", address(birthCert));

        // TX 7: MemoryStorage (nonce N+6)
        MemoryStorage memoryStorage = new MemoryStorage();
        require(address(memoryStorage) == predictedMemory, "MemoryStorage address mismatch!");
        console2.log("[7/8] MemoryStorage:", address(memoryStorage));

        // TX 8: Bundler (nonce N+7)
        AgentLaunchBundler bundler = new AgentLaunchBundler(
            address(factory),
            address(birthCert)
        );
        require(address(bundler) == predictedBundler, "Bundler address mismatch!");
        console2.log("[8/8] Bundler:", address(bundler));

        vm.stopBroadcast();

        // ═══════════════════════════════════════════════
        // SUMMARY
        // ═══════════════════════════════════════════════
        console2.log("");
        console2.log("============================================");
        console2.log("  BASE MAINNET DEPLOYMENT COMPLETE!");
        console2.log("============================================");
        console2.log("Config:        ", address(config));
        console2.log("Hook:          ", address(hook));
        console2.log("Factory:       ", address(factory));
        console2.log("BootstrapETH:  ", address(bootstrapETH));
        console2.log("BirthCert:     ", address(birthCert));
        console2.log("MemoryStorage: ", address(memoryStorage));
        console2.log("LaunchBundler: ", address(bundler));
        console2.log("============================================");
    }
}
