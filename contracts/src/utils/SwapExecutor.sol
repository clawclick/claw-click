// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";

interface IPoolSwapTest {
    struct TestSettings {
        bool takeClaims;
        bool settleUsingBurn;
    }

    function swap(
        PoolKey memory key,
        SwapParams memory params,
        TestSettings memory testSettings,
        bytes memory hookData
    ) external payable returns (int256);
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

/**
 * @title SwapExecutor
 * @notice Swap utility for executing swaps via PoolSwapTest contract
 * @dev Position auto-mint is handled by the hook via modifyLiquiditiesWithoutUnlock.
 *      No auto-mint logic needed in the executor.
 */
contract SwapExecutor {
    using PoolIdLibrary for PoolKey;

    address public constant POOL_SWAP_TEST = 0x9B6b46e2c869aa39918Db7f52f5557FE577B6eEe;
    IPoolSwapTest internal constant swapTest = IPoolSwapTest(POOL_SWAP_TEST);
    
    /* ==================== BUY ==================== */
    function executeBuy(
        PoolKey memory key,
        uint256 amountIn,
        uint256 amountOutMin
    ) external payable {
        require(msg.value == amountIn, "Bad ETH");
        
        SwapParams memory params = SwapParams({
            zeroForOne: true,
            amountSpecified: -int256(amountIn),
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });
        
        IPoolSwapTest.TestSettings memory settings = IPoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });
        
        swapTest.swap{value: amountIn}(
            key,
            params,
            settings,
            abi.encode(msg.sender)
        );
    }
    
    /* ==================== SELL ==================== */
    function executeSell(
        PoolKey memory key,
        address token,
        uint256 amountIn,
        uint256 amountOutMin
    ) external {
        IERC20(token).approve(POOL_SWAP_TEST, amountIn);
        
        SwapParams memory params = SwapParams({
            zeroForOne: false,
            amountSpecified: -int256(amountIn),
            sqrtPriceLimitX96: TickMath.MAX_SQRT_PRICE - 1
        });
        
        IPoolSwapTest.TestSettings memory settings = IPoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });
        
        swapTest.swap(
            key,
            params,
            settings,
            abi.encode(msg.sender)
        );
    }

    receive() external payable {}
}
