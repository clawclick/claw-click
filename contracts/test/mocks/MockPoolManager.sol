// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";

/**
 * @title MockPoolManager
 * @notice Minimal mock of Uniswap V4 PoolManager for testing
 */
contract MockPoolManager {
    using PoolIdLibrary for PoolKey;
    
    // Mock slot0 data per pool
    mapping(PoolId => Slot0) public slot0Data;
    
    struct Slot0 {
        uint160 sqrtPriceX96;
        int24 tick;
        uint24 protocolFee;
        uint24 lpFee;
    }
    
    constructor() {
        // Initialize with default price
    }
    
    /// @notice Set sqrt price for a pool (for testing)
    function setSqrtPrice(PoolId poolId, uint160 sqrtPriceX96) external {
        slot0Data[poolId].sqrtPriceX96 = sqrtPriceX96;
    }
    
    /// @notice Get slot0 data (mimics V4 PoolManager)
    function getSlot0(PoolId poolId) external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint24 protocolFee,
        uint24 lpFee
    ) {
        Slot0 memory data = slot0Data[poolId];
        
        // Return default if not set
        if (data.sqrtPriceX96 == 0) {
            return (
                79228162514264337593543950336,  // Default 1:1
                0,
                0,
                0
            );
        }
        
        return (
            data.sqrtPriceX96,
            data.tick,
            data.protocolFee,
            data.lpFee
        );
    }
    
    /// @notice Initialize a pool (minimal mock)
    function initialize(
        PoolKey memory key,
        uint160 sqrtPriceX96,
        bytes calldata hookData
    ) external returns (int24 tick) {
        PoolId poolId = key.toId();
        slot0Data[poolId] = Slot0({
            sqrtPriceX96: sqrtPriceX96,
            tick: 0,
            protocolFee: 0,
            lpFee: 0
        });
        return 0;
    }
    
    /// @notice Mock modifyLiquidity (not fully implemented)
    function modifyLiquidity(
        PoolKey memory key,
        IPoolManager.ModifyLiquidityParams memory params,
        bytes calldata hookData
    ) external returns (BalanceDelta, BalanceDelta) {
        // Minimal mock - just return zero deltas
        return (BalanceDelta.wrap(0), BalanceDelta.wrap(0));
    }
}
