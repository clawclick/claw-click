// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/utils/SwapExecutor.sol";

contract DeploySwapExecutor is Script {
    
    function run() external {
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        
        vm.startBroadcast(pk);
        
        SwapExecutor swapExecutor = new SwapExecutor();
        
        vm.stopBroadcast();
        
        console2.log("=== SWAPEXECUTOR DEPLOYED ===");
        console2.log("SwapExecutor:", address(swapExecutor));
        console2.log("PoolSwapTest:", swapExecutor.POOL_SWAP_TEST());
    }
}
