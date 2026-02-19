// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestSwapRouter
 * @notice Minimal router for fork tests - calls PoolManager.swap via unlock callback
 * @dev Position auto-mint is handled by the hook via modifyLiquiditiesWithoutUnlock.
 *      No auto-mint logic needed in the router.
 */
contract TestSwapRouter is IUnlockCallback {
    using CurrencyLibrary for Currency;
    using PoolIdLibrary for PoolKey;

    IPoolManager public immutable poolManager;

    struct SwapCallbackData {
        PoolKey key;
        bool zeroForOne;
        int256 amountSpecified;
        address sender;
    }

    constructor(IPoolManager _poolManager) {
        poolManager = _poolManager;
    }

    /// @notice Execute a buy (ETH → Token) - exact input
    function buy(PoolKey memory key, uint256 ethAmount) external payable returns (BalanceDelta delta) {
        require(msg.value >= ethAmount, "Insufficient ETH");

        bytes memory result = poolManager.unlock(
            abi.encode(SwapCallbackData({
                key: key,
                zeroForOne: true,
                amountSpecified: -int256(ethAmount),
                sender: msg.sender
            }))
        );
        delta = abi.decode(result, (BalanceDelta));

        // Refund excess ETH
        uint256 excess = address(this).balance;
        if (excess > 0) {
            (bool ok,) = msg.sender.call{value: excess}("");
            require(ok, "ETH refund failed");
        }
    }

    /// @notice Execute a sell (Token → ETH) - exact input
    function sell(PoolKey memory key, uint256 tokenAmount) external returns (BalanceDelta delta) {
        address token = Currency.unwrap(key.currency1);
        IERC20(token).transferFrom(msg.sender, address(this), tokenAmount);

        bytes memory result = poolManager.unlock(
            abi.encode(SwapCallbackData({
                key: key,
                zeroForOne: false,
                amountSpecified: -int256(tokenAmount),
                sender: msg.sender
            }))
        );
        delta = abi.decode(result, (BalanceDelta));

        // Send ETH proceeds to sender
        uint256 ethBalance = address(this).balance;
        if (ethBalance > 0) {
            (bool ok,) = msg.sender.call{value: ethBalance}("");
            require(ok, "ETH send failed");
        }

        // Return unused tokens
        uint256 tokenBalance = IERC20(token).balanceOf(address(this));
        if (tokenBalance > 0) {
            IERC20(token).transfer(msg.sender, tokenBalance);
        }
    }

    /// @notice IUnlockCallback implementation
    function unlockCallback(bytes calldata data) external override returns (bytes memory) {
        require(msg.sender == address(poolManager), "Not PM");

        SwapCallbackData memory cbd = abi.decode(data, (SwapCallbackData));

        BalanceDelta delta = poolManager.swap(
            cbd.key,
            SwapParams({
                zeroForOne: cbd.zeroForOne,
                amountSpecified: cbd.amountSpecified,
                sqrtPriceLimitX96: cbd.zeroForOne
                    ? TickMath.MIN_SQRT_PRICE + 1
                    : TickMath.MAX_SQRT_PRICE - 1
            }),
            abi.encode(cbd.sender)  // Pass trader address as hookData for maxWallet tracking
        );

        // Handle currency0 (ETH)
        int128 delta0 = delta.amount0();
        int128 delta1 = delta.amount1();

        if (delta0 < 0) {
            // We owe the pool ETH → settle with ETH
            uint256 amount = uint256(int256(-delta0));
            poolManager.settle{value: amount}();
        } else if (delta0 > 0) {
            // Pool owes us ETH → take it
            poolManager.take(cbd.key.currency0, address(this), uint256(int256(delta0)));
        }

        // Handle currency1 (Token)
        if (delta1 < 0) {
            // We owe the pool tokens → transfer + settle
            uint256 amount = uint256(int256(-delta1));
            address token = Currency.unwrap(cbd.key.currency1);
            poolManager.sync(cbd.key.currency1);
            IERC20(token).transfer(address(poolManager), amount);
            poolManager.settle();
        } else if (delta1 > 0) {
            // Pool owes us tokens → take them and send to original sender
            poolManager.take(cbd.key.currency1, cbd.sender, uint256(int256(delta1)));
        }

        return abi.encode(delta);
    }

    receive() external payable {}
}
