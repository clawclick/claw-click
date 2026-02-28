// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {CREATE2HookDeployer} from "../src/utils/CREATE2HookDeployer.sol";
import {ClawclickHook} from "../src/core/ClawclickHook_V4.sol";
import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {AgentLaunchBundler} from "../src/bundler/AgentLaunchBundler.sol";
import {ClawclickConfig} from "../src/core/ClawclickConfig.sol";
import {BootstrapETH} from "../src/utils/BootstrapETH.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

contract FINAL_Deploy_Base is Script {
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123b519429bDc;
    address constant CONFIG = 0x95fC848677Bd29ad067688F64BE60d5C6C44c2a4;
    address constant BOOTSTRAP_ETH = 0x8dEA9ffca272F0D5F4EF23F9002f974a4995712C;
    address constant BIRTH_CERT = 0x15520eD8CF71383FAF18D68120bC1C8d9eE68B5A;

    function run() external {
        uint256 pk = vm.envUint("MAINNET_DEPLOYER_PK");
        address deployer = vm.addr(pk);
        
        console2.log("BASE MAINNET DEPLOYMENT");
        console2.log("Deployer:", deployer);
        
        vm.startBroadcast(pk);
        
        // Step 1: Deploy CREATE2 deployer
        CREATE2HookDeployer create2Deployer = new CREATE2HookDeployer();
        console2.log("CREATE2Deployer:", address(create2Deployer));
        
        // Step 2: Find correct salt
        uint256 salt = 0;
        address hookAddr;
        for (uint256 i = 0; i < 100000; i++) {
            hookAddr = create2Deployer.computeAddress(
                POOL_MANAGER,
                CONFIG,
                bytes32(i),
                address(create2Deployer)
            );
            if ((uint160(hookAddr) & 0x3FFF) == 234) {
                salt = i;
                break;
            }
        }
        console2.log("Found salt:", salt);
        console2.log("Hook will be:", hookAddr);
        
        // Step 3: Deploy hook
        address hook = create2Deployer.deployHook(POOL_MANAGER, CONFIG, bytes32(salt));
        require(hook == hookAddr, "Address mismatch");
        require((uint160(hook) & 0x3FFF) == 234, "Wrong permissions");
        console2.log("Hook deployed:", hook);
        
        // Step 4: Deploy Factory
        ClawclickFactory factory = new ClawclickFactory(
            ClawclickConfig(CONFIG),
            IPoolManager(POOL_MANAGER),
            ClawclickHook(payable(hook)),
            POSITION_MANAGER,
            BootstrapETH(payable(BOOTSTRAP_ETH)),
            deployer
        );
        console2.log("Factory:", address(factory));
        
        // Step 5: Deploy Bundler
        AgentLaunchBundler bundler = new AgentLaunchBundler(address(factory), BIRTH_CERT);
        console2.log("Bundler:", address(bundler));
        
        vm.stopBroadcast();
        
        console2.log("");
        console2.log("=== BASE MAINNET COMPLETE ===");
        console2.log("Hook:", hook);
        console2.log("Factory:", address(factory));
        console2.log("Bundler:", address(bundler));
    }
}
