// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import {IPoolManager} from "lib/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "lib/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "lib/v4-core/src/types/Currency.sol";
import {PoolId, PoolIdLibrary} from "lib/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "lib/v4-core/src/types/BalanceDelta.sol";
import {IHooks} from "lib/v4-core/src/interfaces/IHooks.sol";

/// @notice Test real buy transaction on Sepolia
contract TestTrade is Script {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    IPoolManager constant poolManager = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address token = vm.envAddress("TOKEN");
        
        // Build pool key
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)), // ETH
            currency1: Currency.wrap(token),
            fee: 0x800000, // Dynamic fee
            tickSpacing: 200,
            hooks: IHooks(0xEbe6420f6aA7Bc53A2079160D6f0B116F45B37c0)
        });
        
        console.log("=== TESTING BUY ===");
        console.log("Token:", token);
        console.log("Pool ID:", uint256(key.toId()));
        
        vm.startBroadcast(deployerKey);
        
        // Buy 0.01 ETH worth of tokens
        IPoolManager.SwapParams memory params = IPoolManager.SwapParams({
            zeroForOne: true, // ETH -> Tokens
            amountSpecified: -0.01 ether, // Exact input
            sqrtPriceLimitX96: 4295128740 // Min price (allow large slippage for test)
        });
        
        // Execute swap via unlock
        bytes memory swapData = abi.encode(key, params);
        poolManager.unlock(swapData);
        
        console.log("Buy executed!");
        
        vm.stopBroadcast();
    }
    
    /// @notice Unlock callback - handle swap settlement
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        (PoolKey memory key, IPoolManager.SwapParams memory params) = abi.decode(data, (PoolKey, IPoolManager.SwapParams));
        
        // Execute swap
        BalanceDelta delta = poolManager.swap(key, params, bytes(""));
        
        // Settle balances
        if (params.zeroForOne) {
            // Buying tokens with ETH
            // Pay ETH
            poolManager.settle{value: uint256(uint128(-delta.amount0()))}(key.currency0);
            // Take tokens
            poolManager.take(key.currency1, msg.sender, uint256(uint128(delta.amount1())));
        } else {
            // Selling tokens for ETH
            // Pay tokens
            // poolManager.settle(key.currency1); // Needs token transfer first
            // Take ETH
            poolManager.take(key.currency0, msg.sender, uint256(uint128(-delta.amount0())));
        }
        
        return bytes("");
    }
}
