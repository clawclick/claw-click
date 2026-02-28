// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {ClawclickHook} from "../src/core/ClawclickHook_V4.sol";
import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {ClawclickConfig} from "../src/core/ClawclickConfig.sol";
import {AgentLaunchBundler} from "../src/bundler/AgentLaunchBundler.sol";
import {BootstrapETH} from "../src/utils/BootstrapETH.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title DeployNewHook_Sepolia
 * @notice Deploy new hook with correct permissions + new factory + new bundler
 * @dev Keeps existing: Config, BirthCert, MemoryStorage, BootstrapETH
 */
contract DeployNewHook_Sepolia is Script {
    // Uniswap V4 addresses on Sepolia
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POSITION_MANAGER = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;
    
    // Existing contracts (keep these)
    address constant CONFIG = 0xf01514F68Df33689046F6Dd4184edCaA54fF4492;
    address constant BOOTSTRAP_ETH = 0xC52b027928AfAa54f1f0FeC0e4D7b6397026f660;
    address constant BIRTH_CERT = 0xE13532b0bD16E87088383f9F909EaCB03009a2e9;
    
    // Correct salt for deployer 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7
    uint256 constant HOOK_SALT = 424;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("SEPOLIA_DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("====================================");
        console2.log("DEPLOYING NEW HOOK + FACTORY (SEPOLIA)");
        console2.log("====================================");
        console2.log("Deployer:", deployer);
        console2.log("Hook Salt:", HOOK_SALT);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy Hook with correct CREATE2 salt
        console2.log("[1/3] Deploying ClawclickHook with correct permissions...");
        ClawclickHook hook = new ClawclickHook{salt: bytes32(uint256(HOOK_SALT))}(
            IPoolManager(POOL_MANAGER),
            ClawclickConfig(CONFIG)
        );
        console2.log("  Hook:", address(hook));
        
        // Check permissions
        uint160 permissions = uint160(address(hook)) & 0x3FFF;
        console2.log("  Permissions:", permissions, "(expected: 234)");
        if (permissions != 234) {
            console2.log("  WARNING: Permissions mismatch! Need to find different salt.");
            console2.log("  Aborting deployment...");
            revert("Wrong permissions - try different salt");
        }
        console2.log("  Permissions OK!");

        // Step 2: Deploy Factory with new hook
        console2.log("[2/3] Deploying ClawclickFactory...");
        ClawclickFactory factory = new ClawclickFactory(
            ClawclickConfig(CONFIG),
            IPoolManager(POOL_MANAGER),
            hook,
            POSITION_MANAGER,
            BootstrapETH(payable(BOOTSTRAP_ETH)),
            deployer
        );
        console2.log("  Factory:", address(factory));

        // Step 3: Deploy new AgentLaunchBundler
        console2.log("[3/3] Deploying AgentLaunchBundler...");
        AgentLaunchBundler bundler = new AgentLaunchBundler(
            address(factory),
            BIRTH_CERT
        );
        console2.log("  Bundler:", address(bundler));

        vm.stopBroadcast();

        console2.log("");
        console2.log("====================================");
        console2.log("DEPLOYMENT COMPLETE!");
        console2.log("====================================");
        console2.log("Hook:    ", address(hook));
        console2.log("Factory: ", address(factory));
        console2.log("Bundler: ", address(bundler));
        console2.log("====================================");
        console2.log("");
        console2.log("Update these addresses in your codebase:");
        console2.log("  OLD Hook: 0xf537a9356f6909df0A633C8BC48e504D2a30B111");
        console2.log("  NEW Hook:", address(hook));
        console2.log("  OLD Factory: 0x3f4bFd32362D058157A5F43d7861aCdC0484C415");
        console2.log("  NEW Factory:", address(factory));
        console2.log("  OLD Bundler: 0x579F512FA05CFd66033B06d8816915bA2Be971CE");
        console2.log("  NEW Bundler:", address(bundler));
    }
}
