// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";

interface IUniversalRouter {
    function execute(
        bytes calldata commands,
        bytes[] calldata inputs,
        uint256 deadline
    ) external payable;
}

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
}

contract SwapExecutor {
    address public constant UNIVERSAL_ROUTER = 0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af;
    IUniversalRouter internal constant router = IUniversalRouter(UNIVERSAL_ROUTER);
    
    uint8 private constant V4_SWAP_EXACT_IN = 0x0b;
    
    /* ==================== BUY ==================== */
    function executeBuy(
        PoolKey memory key,
        uint256 amountIn,
        uint256 amountOutMin
    ) external payable {
        require(msg.value == amountIn, "Bad ETH");
        
        bytes memory commands = abi.encodePacked(V4_SWAP_EXACT_IN);
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(
            key,
            true,  // zeroForOne (ETH -> Token)
            amountIn,
            amountOutMin,
            bytes("")
        );
        
        router.execute{value: amountIn}(
            commands,
            inputs,
            block.timestamp + 300
        );
    }
    
    /* ==================== SELL ==================== */
    function executeSell(
        PoolKey memory key,
        address token,
        uint256 amountIn,
        uint256 amountOutMin
    ) external {
        IERC20(token).approve(UNIVERSAL_ROUTER, amountIn);
        
        bytes memory commands = abi.encodePacked(V4_SWAP_EXACT_IN);
        bytes[] memory inputs = new bytes[](1);
        inputs[0] = abi.encode(
            key,
            false,  // zeroForOne (Token -> ETH)
            amountIn,
            amountOutMin,
            bytes("")
        );
        
        router.execute(
            commands,
            inputs,
            block.timestamp + 300
        );
    }
    
    receive() external payable {}
}
