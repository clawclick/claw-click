// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ClawclickConfig
 * @notice Global configuration for clawclick protocol
 * @dev Owned by platform multisig
 */
contract ClawclickConfig is Ownable {
    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Basis points denominator (100% = 10000)
    uint256 public constant BPS = 10000;
    
    /// @notice Maximum fee in basis points (10%)
    uint256 public constant MAX_FEE_BPS = 1000;
    
    /// @notice Maximum platform share (50%)
    uint256 public constant MAX_PLATFORM_SHARE_BPS = 5000;

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Platform treasury address
    address public treasury;
    
    /// @notice Default trading fee in basis points (1% = 100)
    uint256 public defaultFeeBps;
    
    /// @notice Platform share of fees in basis points (30% = 3000)
    uint256 public platformShareBps;
    
    /// @notice Anti-snipe duration in blocks
    uint256 public antiSnipeBlocks;
    
    /// @notice Anti-snipe max buy percentage (basis points)
    uint256 public antiSnipeMaxBuyBps;
    
    /// @notice Factory address (can create new hooks)
    address public factory;
    
    /// @notice Paused state
    bool public paused;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event DefaultFeeBpsUpdated(uint256 oldFee, uint256 newFee);
    event PlatformShareBpsUpdated(uint256 oldShare, uint256 newShare);
    event AntiSnipeUpdated(uint256 blocks, uint256 maxBuyBps);
    event FactoryUpdated(address indexed oldFactory, address indexed newFactory);
    event PausedUpdated(bool paused);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error InvalidAddress();
    error InvalidFee();
    error InvalidShare();
    error InvalidAntiSnipe();
    // ✅ FIX #16: Removed unused Paused error (ProtocolPaused used instead)

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    constructor(
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        if (_treasury == address(0)) revert InvalidAddress();
        
        treasury = _treasury;
        defaultFeeBps = 100; // 1% default fee
        platformShareBps = 3000; // 30% platform share
        antiSnipeBlocks = 20; // 20 blocks anti-snipe window
        antiSnipeMaxBuyBps = 200; // 2% max buy during anti-snipe
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }
    
    function setDefaultFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > MAX_FEE_BPS) revert InvalidFee();
        emit DefaultFeeBpsUpdated(defaultFeeBps, _feeBps);
        defaultFeeBps = _feeBps;
    }
    
    function setPlatformShareBps(uint256 _shareBps) external onlyOwner {
        if (_shareBps > MAX_PLATFORM_SHARE_BPS) revert InvalidShare();
        emit PlatformShareBpsUpdated(platformShareBps, _shareBps);
        platformShareBps = _shareBps;
    }
    
    function setAntiSnipe(uint256 _blocks, uint256 _maxBuyBps) external onlyOwner {
        if (_maxBuyBps > BPS) revert InvalidAntiSnipe();
        emit AntiSnipeUpdated(_blocks, _maxBuyBps);
        antiSnipeBlocks = _blocks;
        antiSnipeMaxBuyBps = _maxBuyBps;
    }
    
    function setFactory(address _factory) external onlyOwner {
        if (_factory == address(0)) revert InvalidAddress();
        emit FactoryUpdated(factory, _factory);
        factory = _factory;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        emit PausedUpdated(_paused);
        paused = _paused;
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Calculate fee amounts for a given trade
    function calculateFees(uint256 amount) external view returns (
        uint256 totalFee,
        uint256 beneficiaryShare,
        uint256 platformShare
    ) {
        totalFee = (amount * defaultFeeBps) / BPS;
        platformShare = (totalFee * platformShareBps) / BPS;
        beneficiaryShare = totalFee - platformShare;
    }
    
    /// @notice Check if protocol is operational
    function isOperational() external view returns (bool) {
        return !paused;
    }
}
