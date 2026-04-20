// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactoryCore.sol";
import "../src/core/ClawclickFactoryHelper.sol";
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

        console2.log("=== DEPLOYING SPLIT FACTORY (CORE + HELPER) ===");
        console2.log("Deployer:", deployer);
        console2.log("Config:", config);
        console2.log("Hook:", hook);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy FactoryCore first (with null BootstrapETH)
        ClawclickFactoryCore factoryCore = new ClawclickFactoryCore(
            ClawclickConfig(config),
            IPoolManager(poolManager),
            ClawclickHook(payable(hook)),
            positionManager,
            BootstrapETH(payable(address(0))),  // Temporary
            deployer
        );

        // 2. Deploy Helper
        ClawclickFactoryHelper factoryHelper = new ClawclickFactoryHelper(
            address(factoryCore),
            ClawclickConfig(config),
            IPoolManager(poolManager),
            ClawclickHook(payable(hook)),
            positionManager
        );

        // 3. Set Helper address in Core
        factoryCore.setHelper(address(factoryHelper));

        // 4. Deploy BootstrapETH with actual FactoryCore address
        BootstrapETH bootstrapETH = new BootstrapETH(address(factoryCore));

        vm.stopBroadcast();

        console2.log("=== DEPLOYMENT COMPLETE ===");
        console2.log("FactoryCore:", address(factoryCore));
        console2.log("FactoryHelper:", address(factoryHelper));
        console2.log("BootstrapETH:", address(bootstrapETH));
        console2.log("");
        console2.log("[OK] Split contracts deployed!");
        console2.log("[NEXT] Update .env with FactoryCore address");
    }
}
