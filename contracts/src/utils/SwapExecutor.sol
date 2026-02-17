// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";

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
 * @notice Test utility for executing swaps via PoolSwapTest contract
 * @dev Uses Uniswap v4's official test contract for Sepolia testing
 */
contract SwapExecutor {
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
            zeroForOne: true,  // ETH (currency0) → Token (currency1)
            amountSpecified: -int256(amountIn),  // Negative = exact input
            sqrtPriceLimitX96: 0  // No price limit
        });
        
        IPoolSwapTest.TestSettings memory settings = IPoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });
        
        swapTest.swap{value: amountIn}(
            key,
            params,
            settings,
            bytes("")  // No hook data
        );
        
        // Tokens automatically sent to msg.sender by PoolSwapTest
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
            zeroForOne: false,  // Token (currency1) → ETH (currency0)
            amountSpecified: -int256(amountIn),  // Negative = exact input
            sqrtPriceLimitX96: 0  // No price limit
        });
        
        IPoolSwapTest.TestSettings memory settings = IPoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });
        
        swapTest.swap(
            key,
            params,
            settings,
            bytes("")  // No hook data
        );
        
        // ETH automatically sent to msg.sender by PoolSwapTest
    }
    
    receive() external payable {}
}
