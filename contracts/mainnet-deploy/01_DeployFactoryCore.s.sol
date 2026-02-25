// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactoryCore.sol";
import "../src/core/ClawclickConfig.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/utils/BootstrapETH.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

contract DeployFactoryCore is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        address config = vm.envAddress("CONFIG_ADDRESS");
        address hook = vm.envAddress("HOOK_ADDRESS");
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        address positionManager = vm.envAddress("POSITION_MANAGER_ADDRESS");
        
        console2.log("=== DEPLOYING FACTORY CORE ===");
        console2.log("Deployer:", deployer);
        console2.log("Config:", config);
        console2.log("Hook:", hook);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        ClawclickFactoryCore factoryCore = new ClawclickFactoryCore(
            ClawclickConfig(config),
            IPoolManager(poolManager),
            ClawclickHook(payable(hook)),
            positionManager,
            BootstrapETH(payable(address(0))),
            deployer
        );

        vm.stopBroadcast();

        console2.log("FactoryCore deployed:", address(factoryCore));
        console2.log("");
        console2.log("Update .env:");
        console2.log("FACTORY_CORE_ADDRESS=", address(factoryCore));
    }
}
