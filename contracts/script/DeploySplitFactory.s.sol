// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactoryCore.sol";
import "../src/core/ClawclickFactoryHelper.sol";
import "../src/core/ClawclickConfig.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/utils/BootstrapETH.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

contract DeploySplitFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        address config = vm.envAddress("CONFIG_ADDRESS");
        address hook = vm.envAddress("HOOK_ADDRESS");
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        address positionManager = vm.envAddress("POSITION_MANAGER_ADDRESS");
        
        console2.log("=== DEPLOYING SPLIT FACTORY SYSTEM ===");
        console2.log("Deployer:", deployer);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Core
        ClawclickFactoryCore factoryCore = new ClawclickFactoryCore(
            ClawclickConfig(config),
            IPoolManager(poolManager),
            ClawclickHook(payable(hook)),
            positionManager,
            BootstrapETH(payable(address(0))),
            deployer
        );
        console2.log("FactoryCore:", address(factoryCore));
        
        // Deploy Helper
        ClawclickFactoryHelper factoryHelper = new ClawclickFactoryHelper(
            address(factoryCore),
            ClawclickConfig(config),
            IPoolManager(poolManager),
            ClawclickHook(payable(hook)),
            positionManager
        );
        console2.log("FactoryHelper:", address(factoryHelper));
        
        // Wire them together
        factoryCore.setHelper(address(factoryHelper));
        console2.log("[OK] Helper wired");
        
        // Deploy BootstrapETH
        BootstrapETH bootstrapETH = new BootstrapETH(address(factoryCore));
        console2.log("BootstrapETH:", address(bootstrapETH));
        
        vm.stopBroadcast();

        console2.log("");
        console2.log("=== DEPLOYMENT COMPLETE ===");
        console2.log("Update .env:");
        console2.log("FACTORY_CORE_ADDRESS=", address(factoryCore));
        console2.log("FACTORY_HELPER_ADDRESS=", address(factoryHelper));
        console2.log("BOOTSTRAP_ETH_ADDRESS=", address(bootstrapETH));
    }
}
