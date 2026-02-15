// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";

/**
 * @title MockPositionManager
 * @notice Minimal mock of Uniswap V4 PositionManager for testing
 */
contract MockPositionManager is ERC721 {
    uint256 private _nextTokenId = 1;
    
    // Position data
    mapping(uint256 => PositionInfo) public positions;
    
    struct PositionInfo {
        PoolKey poolKey;
        int24 tickLower;
        int24 tickUpper;
        uint128 liquidity;
    }
    
    constructor() ERC721("V4 Position", "UNI-V4-POS") {}
    
    /// @notice Mock mint function
    function mint(
        PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidity,
        uint128 amount0Max,
        uint128 amount1Max,
        address recipient,
        bytes calldata hookData
    ) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;
        
        positions[tokenId] = PositionInfo({
            poolKey: key,
            tickLower: tickLower,
            tickUpper: tickUpper,
            liquidity: uint128(liquidity)
        });
        
        _safeMint(recipient, tokenId, hookData);
    }
    
    /// @notice Mock decrease liquidity
    function decreaseLiquidity(
        uint256 tokenId,
        uint128 liquidityDelta,
        uint128 amount0Min,
        uint128 amount1Min,
        bytes calldata hookData
    ) external returns (uint256 amount0, uint256 amount1) {
        require(_ownerOf(tokenId) != address(0), "Position does not exist");
        
        PositionInfo storage pos = positions[tokenId];
        require(pos.liquidity >= liquidityDelta, "Insufficient liquidity");
        
        pos.liquidity -= liquidityDelta;
        
        // Mock return values
        return (uint256(liquidityDelta), uint256(liquidityDelta));
    }
    
    /// @notice Mock collect fees
    function collect(
        uint256 tokenId,
        address recipient,
        uint128 amount0Max,
        uint128 amount1Max
    ) external returns (uint256 amount0, uint256 amount1) {
        require(_ownerOf(tokenId) != address(0), "Position does not exist");
        
        // Mock return values (simulate collected fees)
        return (1 ether, 1000 ether);
    }
    
    /// @notice Get position liquidity
    function getPositionLiquidity(uint256 tokenId) external view returns (uint128) {
        return positions[tokenId].liquidity;
    }
    
    /// @notice Get pool and position info
    function getPoolAndPositionInfo(uint256 tokenId) external view returns (
        PoolKey memory poolKey,
        PositionInfo memory posInfo
    ) {
        PositionInfo memory pos = positions[tokenId];
        return (pos.poolKey, pos);
    }
}
