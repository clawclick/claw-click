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

contract FINAL_Deploy_Sepolia is Script {
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POSITION_MANAGER = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;
    address constant CONFIG = 0xf01514F68Df33689046F6Dd4184edCaA54fF4492;
    address constant BOOTSTRAP_ETH = 0xC52b027928AfAa54f1f0FeC0e4D7b6397026f660;
    address constant BIRTH_CERT = 0xE13532b0bD16E87088383f9F909EaCB03009a2e9;

    function run() external {
        uint256 pk = vm.envUint("SEPOLIA_DEPLOYER_PK");
        address deployer = vm.addr(pk);
        
        console2.log("SEPOLIA DEPLOYMENT");
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
        console2.log("=== SEPOLIA COMPLETE ===");
        console2.log("Hook:", hook);
        console2.log("Factory:", address(factory));
        console2.log("Bundler:", address(bundler));
    }
}
