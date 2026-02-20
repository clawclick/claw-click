// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickHook_V4.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/utils/BootstrapETH.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

contract QuickDeploy is Script {
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POSITION_MANAGER = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("Deployer:", deployer);
        console2.log("Balance:", deployer.balance / 1e18, "ETH");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy Config
        console2.log("\n1/3 Deploying Config...");
        ClawclickConfig config = new ClawclickConfig(deployer, deployer);
        console2.log("CONFIG:", address(config));
        
        // Deploy Hook with simple salt
        console2.log("\n2/3 Deploying Hook...");
        bytes32 salt = bytes32(uint256(0x1234));
        ClawclickHook hook = new ClawclickHook{salt: salt}(
            IPoolManager(POOL_MANAGER),
            config
        );
        console2.log("HOOK:", address(hook));
        
        // Deploy Factory
        console2.log("\n3/3 Deploying Factory...");
        ClawclickFactory factory = new ClawclickFactory(
            config,
            IPoolManager(POOL_MANAGER),
            hook,
            POSITION_MANAGER,
            BootstrapETH(payable(address(0))), // No bootstrap
            deployer
        );
        console2.log("FACTORY:", address(factory));
        
        // Wire together
        config.setFactory(address(factory));
        
        vm.stopBroadcast();
        
        console2.log("\n=== DEPLOYED ===");
        console2.log("CONFIG=", address(config));
        console2.log("HOOK=", address(hook));
        console2.log("FACTORY=", address(factory));
    }
}
