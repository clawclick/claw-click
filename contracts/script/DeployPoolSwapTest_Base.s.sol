// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";

contract DeployPoolSwapTest_Base is Script {
    // BASE PoolManager
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    
    function run() external {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        
        vm.startBroadcast(privateKey);
        
        PoolSwapTest router = new PoolSwapTest(IPoolManager(POOL_MANAGER));
        
        console.log("=== POOLSWAPTEST DEPLOYED ON BASE ===");
        console.log("Address:", address(router));
        console.log("PoolManager:", POOL_MANAGER);
        
        vm.stopBroadcast();
    }
}
