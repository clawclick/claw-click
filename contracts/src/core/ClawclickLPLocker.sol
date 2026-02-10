// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @title ClawclickLPLocker
 * @notice Locks Uniswap V4 LP positions permanently
 * @dev Protocol-owned liquidity - positions cannot be withdrawn
 * 
 * ✅ FIX #13: PositionManager MUST implement ERC-721
 * CRITICAL ASSUMPTION: The V4 PositionManager being used MUST:
 *   1. Implement IERC721 (mint LP positions as NFTs)
 *   2. Call onERC721Received when transferring positions
 *   3. Be the OFFICIAL Uniswap V4 PositionManager
 * 
 * Before mainnet deployment, VERIFY:
 *   - PositionManager address is correct for target network
 *   - PositionManager implements full ERC-721 interface
 *   - Test transfers work and trigger onERC721Received
 * 
 * Without ERC-721 compatibility, this locker is NON-FUNCTIONAL.
 */
contract ClawclickLPLocker is Ownable, IERC721Receiver {
    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/
    
    /// @notice V4 Position Manager address
    address public immutable positionManager;
    
    /// @notice Mapping of token to its locked position ID
    mapping(address => uint256) public lockedPositions;
    
    /// @notice Mapping of position ID to token address
    mapping(uint256 => address) public positionToToken;
    
    /// @notice Total positions locked
    uint256 public totalLocked;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    
    event PositionLocked(
        address indexed token,
        uint256 indexed positionId,
        address indexed locker
    );

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error InvalidPositionManager();
    error PositionAlreadyLocked();
    error NotFromPositionManager();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    constructor(
        address _positionManager,
        address _owner
    ) Ownable(_owner) {
        if (_positionManager == address(0)) revert InvalidPositionManager();
        positionManager = _positionManager;
    }

    /*//////////////////////////////////////////////////////////////
                            LOCK FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Lock a position for a token
     * @dev Called by factory after creating pool position
     * @param token The token address
     * @param positionId The V4 position NFT ID
     */
    function lockPosition(address token, uint256 positionId) external {
        if (lockedPositions[token] != 0) revert PositionAlreadyLocked();
        
        // Transfer position NFT to this contract
        IERC721(positionManager).transferFrom(msg.sender, address(this), positionId);
        
        // Record the lock
        lockedPositions[token] = positionId;
        positionToToken[positionId] = token;
        totalLocked++;
        
        emit PositionLocked(token, positionId, msg.sender);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Check if a token has a locked position
    function isLocked(address token) external view returns (bool) {
        return lockedPositions[token] != 0;
    }
    
    /// @notice Get position ID for a token
    function getPosition(address token) external view returns (uint256) {
        return lockedPositions[token];
    }

    /*//////////////////////////////////////////////////////////////
                          ERC721 RECEIVER
    //////////////////////////////////////////////////////////////*/
    
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
