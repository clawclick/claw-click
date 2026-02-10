// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";

/**
 * @title SimpleSwapRouter
 * @notice Minimal router for executing swaps on ClawClick pools
 */
contract SimpleSwapRouter is IUnlockCallback {
    IPoolManager public immutable poolManager;
    
    constructor(address _poolManager) {
        poolManager = IPoolManager(_poolManager);
    }
    
    function swap(
        PoolKey memory key,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96
    ) external payable returns (BalanceDelta delta) {
        bytes memory data = abi.encode(key, zeroForOne, amountSpecified, sqrtPriceLimitX96, msg.sender);
        delta = abi.decode(poolManager.unlock(data), (BalanceDelta));
        return delta;
    }
    
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager");
        
        (PoolKey memory key, bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96, address swapper) = 
            abi.decode(data, (PoolKey, bool, int256, uint160, address));
        
        // Execute swap
        BalanceDelta delta = poolManager.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: amountSpecified,
                sqrtPriceLimitX96: sqrtPriceLimitX96
            }),
            ""
        );
        
        // Settle currency in (negative delta = we owe)
        if (delta.amount0() < 0) {
            uint256 amount = uint256(-int256(delta.amount0()));
            if (Currency.unwrap(key.currency0) == address(0)) {
                // Native ETH
                poolManager.settle{value: amount}();
            } else {
                // ERC20 - transfer from swapper
                Currency.wrap(Currency.unwrap(key.currency0)).transfer(address(poolManager), amount);
                poolManager.settle();
            }
        }
        
        if (delta.amount1() < 0) {
            uint256 amount = uint256(-int256(delta.amount1()));
            if (Currency.unwrap(key.currency1) == address(0)) {
                // Native ETH
                poolManager.settle{value: amount}();
            } else {
                // ERC20 - transfer from swapper
                Currency.wrap(Currency.unwrap(key.currency1)).transfer(address(poolManager), amount);
                poolManager.settle();
            }
        }
        
        // Take currency out (positive delta = we receive)
        if (delta.amount0() > 0) {
            poolManager.take(key.currency0, swapper, uint256(int256(delta.amount0())));
        }
        
        if (delta.amount1() > 0) {
            poolManager.take(key.currency1, swapper, uint256(int256(delta.amount1())));
        }
        
        return abi.encode(delta);
    }
    
    receive() external payable {}
}
