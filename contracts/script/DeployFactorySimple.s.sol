// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickConfig.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/utils/BootstrapETH.sol";

contract DeployFactorySimple is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        address config = vm.envAddress("CONFIG_ADDRESS");
        address hook = vm.envAddress("HOOK_ADDRESS");
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        address positionManager = vm.envAddress("POSITION_MANAGER_ADDRESS");

        console2.log("=== DEPLOYING FACTORY (SIMPLE) ===");
        console2.log("Deployer:", deployer);
        console2.log("Config:", config);
        console2.log("Hook:", hook);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Factory first (with null BootstrapETH)
        ClawclickFactory factory = new ClawclickFactory(
            ClawclickConfig(config),
            IPoolManager(poolManager),
            ClawclickHook(payable(hook)),
            positionManager,
            BootstrapETH(payable(address(0))),  // Temporary
            deployer
        );

        // Deploy BootstrapETH with actual Factory address
        BootstrapETH bootstrapETH = new BootstrapETH(address(factory));

        vm.stopBroadcast();

        console2.log("=== DEPLOYMENT COMPLETE ===");
        console2.log("Factory:", address(factory));
        console2.log("BootstrapETH:", address(bootstrapETH));
        console2.log("");
        console2.log("[OK] Contracts deployed!");
        console2.log("[NEXT] Update .env with addresses");
    }
}
