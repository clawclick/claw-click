// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";

contract DeployAndTestSwaps is Script {
    using PoolIdLibrary for PoolKey;

    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant TOKEN = 0x46c051378512A5CE572470773f98D7085e818344;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("=== DEPLOYING SWAP ROUTER ===");
        console2.log("Deployer:", deployer);
        console2.log("Pool Manager:", POOL_MANAGER);
        console2.log("Token:", TOKEN);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy PoolSwapTest
        PoolSwapTest swapRouter = new PoolSwapTest(IPoolManager(POOL_MANAGER));
        console2.log("Swap Router deployed:", address(swapRouter));

        // Create pool key
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(TOKEN),
            fee: 100,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        // Test buy (ETH -> Token)
        console2.log("\n=== EXECUTING BUY ===");
        console2.log("Swap router balance:", address(swapRouter).balance);
        console2.log("Deployer balance:", deployer.balance);
        
        // For now just deploy the router, actual swaps will be tested via TypeScript
        console2.log("Router deployed successfully for testing");

        vm.stopBroadcast();

        console2.log("\n=== DEPLOYMENT COMPLETE ===");
        console2.log("Swap Router:", address(swapRouter));
        console2.log("\nUse this address to execute trades from test wallets");
    }
}
