// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";

/**
 * @title SwapRouter
 * @notice Simple router for executing swaps on Uniswap V4 (testnet validation)
 */
contract SwapRouter is IUnlockCallback {
    IPoolManager public immutable poolManager;
    
    struct SwapParams {
        PoolKey key;
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }
    
    SwapParams private _pendingSwap;
    address private _swapSender;
    
    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }
    
    /**
     * @notice Execute a swap (buy tokens with ETH)
     */
    function swap(
        PoolKey memory key,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96
    ) external payable returns (BalanceDelta delta) {
        _pendingSwap = SwapParams({
            key: key,
            zeroForOne: zeroForOne,
            amountSpecified: amountSpecified,
            sqrtPriceLimitX96: sqrtPriceLimitX96
        });
        _swapSender = msg.sender;
        
        // Execute via unlock callback
        bytes memory result = poolManager.unlock(abi.encode(msg.value));
        return abi.decode(result, (BalanceDelta));
    }
    
    /**
     * @notice Unlock callback - executes the swap
     */
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager");
        
        uint256 ethAmount = abi.decode(data, (uint256));
        SwapParams memory params = _pendingSwap;
        
        // Execute swap
        BalanceDelta delta = poolManager.swap(
            params.key,
            IPoolManager.SwapParams({
                zeroForOne: params.zeroForOne,
                amountSpecified: params.amountSpecified,
                sqrtPriceLimitX96: params.sqrtPriceLimitX96
            }),
            ""
        );
        
        // Settle currencies
        if (params.zeroForOne) {
            // Selling currency0 for currency1
            _settle(params.key.currency0, uint256(int256(-delta.amount0())));
            _take(params.key.currency1, uint256(uint128(delta.amount1())));
        } else {
            // Selling currency1 for currency0 (buying tokens with ETH)
            _settle(params.key.currency1, ethAmount);
            _take(params.key.currency0, uint256(uint128(delta.amount0())));
        }
        
        return abi.encode(delta);
    }
    
    /**
     * @notice Settle currency with PoolManager
     */
    function _settle(Currency currency, uint256 amount) internal {
        if (Currency.unwrap(currency) == address(0)) {
            // Native ETH
            poolManager.settle{value: amount}();
        } else {
            // ERC20 token - transfer to PM then settle
            IERC20(Currency.unwrap(currency)).transfer(address(poolManager), amount);
            poolManager.settle();
        }
    }
    
    /**
     * @notice Take currency from PoolManager
     */
    function _take(Currency currency, uint256 amount) internal {
        poolManager.take(currency, _swapSender, amount);
    }
    
    receive() external payable {}
}

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
}
