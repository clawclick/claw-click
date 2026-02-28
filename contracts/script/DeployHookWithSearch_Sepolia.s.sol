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
 * Deploy hook by searching for correct salt on-the-fly
 */
contract DeployHookWithSearch_Sepolia is Script {
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POSITION_MANAGER = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;
    address constant CONFIG = 0xf01514F68Df33689046F6Dd4184edCaA54fF4492;
    address constant BOOTSTRAP_ETH = 0xC52b027928AfAa54f1f0FeC0e4D7b6397026f660;
    address constant BIRTH_CERT = 0xE13532b0bD16E87088383f9F909EaCB03009a2e9;
    
    uint160 constant REQUIRED_PERMISSIONS = 234;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("SEPOLIA_DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("====================================");
        console2.log("DEPLOYING WITH SALT SEARCH (SEPOLIA)");
        console2.log("====================================");
        console2.log("Deployer:", deployer);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Try salts 0-1000 until we find one with correct permissions
        ClawclickHook hook;
        uint256 workingSalt = 0;
        bool found = false;
        
        console2.log("Searching for salt with correct permissions...");
        
        for (uint256 salt = 0; salt < 10000; salt++) {
            // Deploy with this salt
            hook = new ClawclickHook{salt: bytes32(salt)}(
                IPoolManager(POOL_MANAGER),
                ClawclickConfig(CONFIG)
            );
            
            uint160 permissions = uint160(address(hook)) & 0x3FFF;
            
            if (permissions == REQUIRED_PERMISSIONS) {
                console2.log("");
                console2.log("FOUND WORKING SALT!");
                console2.log("  Salt:", salt);
                console2.log("  Address:", address(hook));
                console2.log("  Permissions:", permissions);
                workingSalt = salt;
                found = true;
                break;
            }
            
            if (salt % 100 == 0) {
                console2.log("  Checked", salt, "salts...");
            }
        }
        
        if (!found) {
            revert("Could not find salt with correct permissions in range 0-10000");
        }
        
        console2.log("");
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
        console2.log("Salt:    ", workingSalt);
        console2.log("====================================");
    }
}
