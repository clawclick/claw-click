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
 * @title DeployNewHook_Base
 * @notice Deploy new hook with correct permissions + new factory + new bundler
 * @dev Keeps existing: Config, BirthCert, MemoryStorage, BootstrapETH
 */
contract DeployNewHook_Base is Script {
    // Uniswap V4 addresses on Base mainnet
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123b519429bDc;
    
    // Existing contracts (keep these)
    address constant CONFIG = 0x95fC848677Bd29ad067688F64BE60d5C6C44c2a4;
    address constant BOOTSTRAP_ETH = 0x8dEA9ffca272F0D5F4EF23F9002f974a4995712C;
    address constant BIRTH_CERT = 0x15520eD8CF71383FAF18D68120bC1C8d9eE68B5A;
    
    // Correct salt for deployer 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7
    uint256 constant HOOK_SALT = 701;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("MAINNET_DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("====================================");
        console2.log("DEPLOYING NEW HOOK + FACTORY (BASE MAINNET)");
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
        
        // Verify permissions
        uint160 permissions = uint160(address(hook)) & 0x3FFF;
        require(permissions == 234, "Wrong permissions!");
        console2.log("  Permissions:", permissions, "(should be 234) OK");

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
        console2.log("  OLD Hook: 0xCD7568392159C4860ea4b9b14c5f41e720173404");
        console2.log("  NEW Hook:", address(hook));
        console2.log("  OLD Factory: 0x4b32C39D9608de2D6FCD77715316E539fC90f962");
        console2.log("  NEW Factory:", address(factory));
        console2.log("  OLD Bundler: 0x4bB9811E9bf3384F5Df8B1dcAA4c05C298Fc44dD");
        console2.log("  NEW Bundler:", address(bundler));
    }
}
