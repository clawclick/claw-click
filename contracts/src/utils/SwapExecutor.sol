// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";

/**
 * @title SwapExecutor
 * @notice Wrapper around Uniswap v4 Universal Router for test swaps on Sepolia
 * @dev Executes real swaps through deployed Universal Router
 * 
 * Universal Router (Sepolia): 0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af
 * PoolManager (Sepolia): 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543
 * 
 * This contract enables clean swap testing without manual command encoding in tests.
 */
contract SwapExecutor {
    
    /// @notice Uniswap v4 Universal Router on Sepolia
    address public constant UNIVERSAL_ROUTER = 0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af;
    
    /// @notice V4_SWAP command byte
    bytes1 public constant V4_SWAP = 0x00;
    
    /// @notice Execute a buy (ETH → Token) swap via Universal Router
    /// @param poolKey The Uniswap v4 pool key
    /// @param amountIn Amount of ETH to swap
    /// @return amountOut Amount of tokens received (may be 0 if encoding fails)
    function executeBuy(
        PoolKey calldata poolKey,
        uint256 amountIn
    ) external payable returns (uint256 amountOut) {
        require(msg.value >= amountIn, "Insufficient ETH");
        
        // Build Universal Router V4_SWAP command
        bytes memory commands = abi.encodePacked(V4_SWAP);
        
        // Build path: ETH → Token
        bytes memory path = abi.encodePacked(
            Currency.unwrap(poolKey.currency0), // ETH (address(0))
            poolKey.fee,
            poolKey.tickSpacing,
            address(poolKey.hooks),
            Currency.unwrap(poolKey.currency1)  // Token
        );
        
        // Encode V4_SWAP input
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(
            address(this),  // recipient
            amountIn,       // amountIn
            0,              // amountOutMinimum (no slippage for tests)
            path,           // path
            true            // payerIsUser (use msg.value)
        );
        
        // Execute swap via Universal Router
        (bool success, bytes memory result) = UNIVERSAL_ROUTER.call{value: amountIn}(
            abi.encodeWithSignature(
                "execute(bytes,bytes[],uint256)",
                commands,
                inputs,
                block.timestamp + 60 // 60 second deadline
            )
        );
        
        // If swap succeeded, decode amountOut
        if (success && result.length > 0) {
            // Router returns amountOut
            amountOut = abi.decode(result, (uint256));
        }
        
        return amountOut;
    }
    
    /// @notice Execute a sell (Token → ETH) swap via Universal Router
    /// @param poolKey The Uniswap v4 pool key
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
        
        // Build Universal Router V4_SWAP command
        bytes memory commands = abi.encodePacked(V4_SWAP);
        
        // Build path: Token → ETH (reverse direction)
        bytes memory path = abi.encodePacked(
            tokenAddress,                       // Token
            poolKey.fee,
            poolKey.tickSpacing,
            address(poolKey.hooks),
            Currency.unwrap(poolKey.currency0) // ETH
        );
        
        // Encode V4_SWAP input
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(
            address(this),  // recipient
            amountIn,       // amountIn
            0,              // amountOutMinimum
            path,           // path
            false           // payerIsUser (use token allowance)
        );
        
        // Execute swap via Universal Router
        (bool success, bytes memory result) = UNIVERSAL_ROUTER.call(
            abi.encodeWithSignature(
                "execute(bytes,bytes[],uint256)",
                commands,
                inputs,
                block.timestamp + 60
            )
        );
        
        if (success && result.length > 0) {
            amountOut = abi.decode(result, (uint256));
        }
        
        return amountOut;
    }
    
    /// @notice Get token balance of this contract
    function getTokenBalance(address token) external view returns (uint256) {
        (bool success, bytes memory data) = token.staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        
        if (success && data.length > 0) {
            return abi.decode(data, (uint256));
        }
        
        return 0;
    }
    
    /// @notice Receive ETH from swaps
    receive() external payable {}
    
    /// @notice Withdraw ETH (for cleanup after tests)
    function withdrawETH(address payable to, uint256 amount) external {
        require(to != address(0), "Invalid recipient");
        to.transfer(amount);
    }
    
    /// @notice Withdraw tokens (for cleanup after tests)
    function withdrawToken(address token, address to, uint256 amount) external {
        require(to != address(0), "Invalid recipient");
        (bool success,) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );
        require(success, "Transfer failed");
    }
}
