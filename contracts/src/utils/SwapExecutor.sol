// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";

/**
 * @title SwapExecutor
 * @notice Minimal wrapper around Uniswap v4 Universal Router for test swaps
 * @dev Use this in test scripts to execute real swaps on Sepolia
 * 
 * Universal Router (Sepolia): 0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af
 * 
 * This contract:
 * - Accepts ETH
 * - Calls Universal Router
 * - Executes exactInputSingle swaps
 * - Returns swap results
 * 
 * NO lifecycle logic
 * NO hook logic
 * NO factory logic
 * Purely a swap utility for tests
 */
contract SwapExecutor {
    
    /// @notice Uniswap v4 Universal Router on Sepolia
    address public constant UNIVERSAL_ROUTER = 0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af;
    
    /// @notice Execute a buy (ETH → Token) swap
    /// @param poolKey The pool key
    /// @param amountIn Amount of ETH to swap
    /// @return amountOut Amount of tokens received
    function executeBuy(
        PoolKey calldata poolKey,
        uint256 amountIn
    ) external payable returns (uint256 amountOut) {
        require(msg.value >= amountIn, "Insufficient ETH");
        
        // Build Universal Router command
        // V4_SWAP = 0x00
        bytes memory commands = abi.encodePacked(uint8(0x00));
        
        // Encode swap parameters
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(
            address(this), // recipient
            amountIn,      // amountIn
            0,             // amountOutMinimum (no slippage check for tests)
            abi.encodePacked(
                Currency.unwrap(poolKey.currency0), // ETH
                uint24(poolKey.fee),
                Currency.unwrap(poolKey.currency1)  // Token
            ),
            true // payerIsUser
        );
        
        // Execute swap via Universal Router
        (bool success, bytes memory result) = UNIVERSAL_ROUTER.call{value: amountIn}(
            abi.encodeWithSignature(
                "execute(bytes,bytes[])",
                commands,
                inputs
            )
        );
        
        require(success, "Swap failed");
        
        // Decode result to get amountOut
        // Universal Router returns amountOut as first return value
        if (result.length > 0) {
            amountOut = abi.decode(result, (uint256));
        }
        
        return amountOut;
    }
    
    /// @notice Execute a sell (Token → ETH) swap
    /// @param poolKey The pool key
    /// @param tokenAddress Token to sell
    /// @param amountIn Amount of tokens to swap
    /// @return amountOut Amount of ETH received
    function executeSell(
        PoolKey calldata poolKey,
        address tokenAddress,
        uint256 amountIn
    ) external returns (uint256 amountOut) {
        
        // Approve Universal Router to spend tokens
        (bool approveSuccess,) = tokenAddress.call(
            abi.encodeWithSignature(
                "approve(address,uint256)",
                UNIVERSAL_ROUTER,
                amountIn
            )
        );
        require(approveSuccess, "Approve failed");
        
        // Build Universal Router command
        bytes memory commands = abi.encodePacked(uint8(0x00));
        
        // Encode swap parameters (reverse direction)
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(
            address(this), // recipient
            amountIn,      // amountIn
            0,             // amountOutMinimum
            abi.encodePacked(
                tokenAddress,              // Token
                uint24(poolKey.fee),
                Currency.unwrap(poolKey.currency0) // ETH
            ),
            false // payerIsUser
        );
        
        // Execute swap via Universal Router
        (bool success, bytes memory result) = UNIVERSAL_ROUTER.call(
            abi.encodeWithSignature(
                "execute(bytes,bytes[])",
                commands,
                inputs
            )
        );
        
        require(success, "Swap failed");
        
        if (result.length > 0) {
            amountOut = abi.decode(result, (uint256));
        }
        
        return amountOut;
    }
    
    /// @notice Get token balance
    function getTokenBalance(address token, address account) external view returns (uint256) {
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", account)
        );
        
        if (success && data.length > 0) {
            return abi.decode(data, (uint256));
        }
        
        return 0;
    }
    
    /// @notice Receive ETH
    receive() external payable {}
}
