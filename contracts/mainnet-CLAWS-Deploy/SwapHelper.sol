// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";

contract SwapHelper is IUnlockCallback {
    using CurrencyLibrary for Currency;
    
    IPoolManager public immutable poolManager;
    
    struct CallbackData {
        address sender;
        PoolKey key;
        bool zeroForOne;
        int256 amountSpecified;
    }
    
    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
    }
    
    function swapETHForTokens(
        PoolKey memory key,
        uint256 amountIn
    ) external payable returns (uint256 amountOut) {
        require(msg.value >= amountIn, "Insufficient ETH");
        
        CallbackData memory data = CallbackData({
            sender: msg.sender,
            key: key,
            zeroForOne: true,
            amountSpecified: -int256(amountIn)
        });
        
        BalanceDelta delta = abi.decode(
            poolManager.unlock(abi.encode(data)),
            (BalanceDelta)
        );
        
        amountOut = uint256(int256(delta.amount1()));
        
        if (msg.value > amountIn) {
            (bool success,) = msg.sender.call{value: msg.value - amountIn}("");
            require(success);
        }
    }
    
    function unlockCallback(bytes calldata rawData) external override returns (bytes memory) {
        require(msg.sender == address(poolManager));
        
        CallbackData memory data = abi.decode(rawData, (CallbackData));
        
        SwapParams memory params = SwapParams({
            zeroForOne: data.zeroForOne,
            amountSpecified: data.amountSpecified,
            sqrtPriceLimitX96: 0
        });
        
        BalanceDelta delta = poolManager.swap(data.key, params, "");
        
        // Settle ETH (currency0) - we owe the pool
        if (delta.amount0() < 0) {
            uint256 amountOwed = uint256(int256(-delta.amount0()));
            // Transfer ETH directly to PoolManager
            (bool success,) = address(poolManager).call{value: amountOwed}("");
            require(success, "ETH transfer failed");
            // Settle the currency
            poolManager.settle(data.key.currency0);
        }
        
        // Take tokens (currency1) - pool owes us
        if (delta.amount1() > 0) {
            uint256 amountToReceive = uint256(int256(delta.amount1()));
            poolManager.take(data.key.currency1, data.sender, amountToReceive);
        }
        
        return abi.encode(delta);
    }
    
    receive() external payable {}
}
