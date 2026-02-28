// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";

contract DeployPoolSwapTest is Script {
    // Sepolia PoolManager
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    
    function run() external {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(privateKey);
        
        PoolSwapTest router = new PoolSwapTest(IPoolManager(POOL_MANAGER));
        
        console.log("=== POOLSWAPTEST DEPLOYED ===");
        console.log("Address:", address(router));
        console.log("PoolManager:", POOL_MANAGER);
        
        vm.stopBroadcast();
    }
}
