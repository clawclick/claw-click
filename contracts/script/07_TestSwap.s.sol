// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";

contract TestSwap is Script {
    
    IPoolManager poolManager = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    address swapRouter = 0xF8AADC65Bf1Ec1645ef931317fD48ffa734a185c; // v4 SwapRouter on Sepolia
    
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address token = 0x39702408153fF3F389fe7b96A0A710175EFf90A0; // Test token
        address hook = 0xEbe6420f6aA7Bc53A2079160D6f0B116F45B37c0;
        
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)), // ETH
            currency1: Currency.wrap(token),
            fee: 0x800000, // Dynamic fee flag
            tickSpacing: 200,
            hooks: IHooks(hook)
        });
        
        vm.startBroadcast(pk);
        
        // Buy 0.001 ETH worth of tokens (exact input)
        SwapParams memory params = SwapParams({
            zeroForOne: true, // Swap ETH for tokens
            amountSpecified: -0.001 ether, // Negative = exact input
            sqrtPriceLimitX96: 4295128740 // Min price (max slippage)
        });
        
        // Use PoolSwapTest helper to execute swap
        PoolSwapTest(swapRouter).swap{value: 0.001 ether}(key, params, PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        }), "");
        
        vm.stopBroadcast();
        
        console2.log("=== SWAP EXECUTED ===");
        console2.log("Token:", token);
        console2.log("ETH spent: 0.001");
    }
}
