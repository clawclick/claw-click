// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {SafeCast} from "v4-core/src/libraries/SafeCast.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ClawclickRouter
 * @notice Production router for Clawclick token swaps on Uniswap V4
 * @dev Handles proper settlement with hook delta injection
 */
contract ClawclickRouter is IUnlockCallback {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;
    using SafeCast for uint256;
    using SafeCast for int256;
    
    IPoolManager public immutable poolManager;
    
    struct SwapCallbackData {
        address sender;
        PoolKey key;
        IPoolManager.SwapParams params;
    }
    
    SwapCallbackData private swapData;
    
    error InsufficientOutput();
    error InsufficientETHSent();
    error SlippageExceeded();
    error InvalidPool();
    
    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }
    
    /**
     * @notice Buy tokens with exact ETH input
     * @param key Pool key
     * @param minTokensOut Minimum tokens to receive (slippage protection)
     * @return tokensOut Amount of tokens received
     */
    function buyExactIn(
        PoolKey memory key,
        uint256 minTokensOut
    ) external payable returns (uint256 tokensOut) {
        if (msg.value == 0) revert InsufficientETHSent();
        
        // ETH is currency0, token is currency1
        // zeroForOne = true (ETH -> Token)
        swapData = SwapCallbackData({
            sender: msg.sender,
            key: key,
            params: IPoolManager.SwapParams({
                zeroForOne: true,
                amountSpecified: -int256(msg.value), // Exact input (negative)
                sqrtPriceLimitX96: 4295128740 // MIN_SQRT_PRICE + 1
            })
        });
        
        bytes memory result = poolManager.unlock(abi.encode(msg.value));
        BalanceDelta delta = abi.decode(result, (BalanceDelta));
        
        // amount1() is token output (positive = received)
        tokensOut = uint256(uint128(delta.amount1()));
        
        if (tokensOut < minTokensOut) revert SlippageExceeded();
        
        return tokensOut;
    }
    
    /**
     * @notice Sell tokens for ETH
     * @param key Pool key
     * @param tokensIn Amount of tokens to sell
     * @param minETHOut Minimum ETH to receive (slippage protection)
     * @return ethOut Amount of ETH received
     */
    function sellExactIn(
        PoolKey memory key,
        uint256 tokensIn,
        uint256 minETHOut
    ) external returns (uint256 ethOut) {
        // Transfer tokens from sender
        address token = Currency.unwrap(key.currency1);
        IERC20(token).transferFrom(msg.sender, address(this), tokensIn);
        IERC20(token).approve(address(poolManager), tokensIn);
        
        // Token is currency1, ETH is currency0
        // zeroForOne = false (Token -> ETH)
        swapData = SwapCallbackData({
            sender: msg.sender,
            key: key,
            params: IPoolManager.SwapParams({
                zeroForOne: false,
                amountSpecified: -int256(tokensIn), // Exact input (negative)
                sqrtPriceLimitX96: 1461446703485210103287273052203988822378723970341 // MAX_SQRT_PRICE - 1
            })
        });
        
        bytes memory result = poolManager.unlock("");
        BalanceDelta delta = abi.decode(result, (BalanceDelta));
        
        // amount0() is ETH output (positive = received)
        ethOut = uint256(uint128(delta.amount0()));
        
        if (ethOut < minETHOut) revert SlippageExceeded();
        
        return ethOut;
    }
    
    /**
     * @notice Unlock callback - executes the swap and settles
     */
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager");
        
        SwapCallbackData memory swap = swapData;
        uint256 ethValue = data.length > 0 ? abi.decode(data, (uint256)) : 0;
        
        // Execute swap
        BalanceDelta delta = poolManager.swap(swap.key, swap.params, "");
        
        // Settle based on swap direction
        if (swap.params.zeroForOne) {
            // Buying token with ETH
            _settleBuy(swap.key, delta, ethValue);
        } else {
            // Selling token for ETH
            _settleSell(swap.key, delta);
        }
        
        return abi.encode(delta);
    }
    
    /**
     * @notice Settle a buy (ETH -> Token)
     */
    function _settleBuy(PoolKey memory key, BalanceDelta delta, uint256 ethValue) internal {
        // amount0() is ETH we owe (negative)
        // amount1() is tokens we receive (positive)
        
        int128 ethOwed = delta.amount0();
        int128 tokensReceived = delta.amount1();
        
        // Settle ETH (we owe negative, so we pay positive)
        if (ethOwed < 0) {
            uint256 ethToSettle = uint256(uint128(-ethOwed));
            poolManager.settle{value: ethToSettle}();
            
            // Refund excess ETH
            if (ethValue > ethToSettle) {
                uint256 refund = ethValue - ethToSettle;
                (bool success, ) = swapData.sender.call{value: refund}("");
                require(success, "ETH refund failed");
            }
        }
        
        // Take tokens (we receive positive)
        if (tokensReceived > 0) {
            poolManager.take(key.currency1, swapData.sender, uint256(uint128(tokensReceived)));
        }
    }
    
    /**
     * @notice Settle a sell (Token -> ETH)
     */
    function _settleSell(PoolKey memory key, BalanceDelta delta) internal {
        // amount1() is tokens we owe (negative)
        // amount0() is ETH we receive (positive)
        
        int128 tokensOwed = delta.amount1();
        int128 ethReceived = delta.amount0();
        
        // Settle tokens (we owe negative, so we pay positive)
        if (tokensOwed < 0) {
            uint256 tokensToSettle = uint256(uint128(-tokensOwed));
            
            // Transfer tokens to PoolManager
            address token = Currency.unwrap(key.currency1);
            IERC20(token).transfer(address(poolManager), tokensToSettle);
            
            // Settle
            poolManager.settle();
        }
        
        // Take ETH (we receive positive)
        if (ethReceived > 0) {
            poolManager.take(key.currency0, swapData.sender, uint256(uint128(ethReceived)));
        }
    }
    
    receive() external payable {}
}
