// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ClawclickConfig
 * @notice Global configuration for Deep Sea Engine
 * @dev Owned by platform multisig
 * 
 * Key Parameters:
 *   - Fee split: 70% beneficiary / 30% platform
 *   - Tax tiers: Maps target MCAP → starting tax
 *   - Position limits: MaxTx/MaxWallet scaling factors
 */
contract ClawclickConfig is Ownable {
    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Standard basis points denominator (100% = 10000)
    /// @dev Used for fees, shares, overlaps, limits
    uint256 public constant BPS = 10000;
    
    /// @notice Extended basis points for token allocations (100% = 100000)
    /// @dev Provides finer granularity for geometric decay allocations
    uint256 public constant EXTENDED_BPS = 100000;
    
    /// @notice Maximum platform share (50%)
    uint256 public constant MAX_PLATFORM_SHARE_BPS = 5000;
    
    /*//////////////////////////////////////////////////////////////
                        MULTI-POSITION CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Bootstrap ETH requirement ($2 minimum)
    uint256 public constant MIN_BOOTSTRAP_ETH = 0.001 ether;
    
    /// @notice Position overlap percentage (5% = 500 bps)
    uint256 public constant POSITION_OVERLAP_BPS = 500;
    
    /// @notice Token allocations per position (basis points, sum = 100%)
    /// @dev [P1, P2, P3, P4, P5] = [75%, 18.75%, 4.6875%, 1.171875%, 0.390625%]
    uint256 public constant POSITION_1_ALLOCATION_BPS = 75000;   // 75.0000%
    uint256 public constant POSITION_2_ALLOCATION_BPS = 18750;   // 18.7500%
    uint256 public constant POSITION_3_ALLOCATION_BPS = 4688;    // 4.6875%
    uint256 public constant POSITION_4_ALLOCATION_BPS = 1172;    // 1.1719%
    uint256 public constant POSITION_5_ALLOCATION_BPS = 390;     // 0.3906%
    
    /// @notice Position retirement offset (retire positions X steps behind)
    uint256 public constant RETIREMENT_OFFSET = 2;
    
    /// @notice MCAP multiplier per position (16x per position = 4 doublings)
    uint256 public constant POSITION_MCAP_MULTIPLIER = 16;

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Platform treasury address
    address public treasury;
    
    /// @notice Platform share of fees in basis points (30% = 3000)
    uint256 public platformShareBps;
    
    /// @notice Factory address (can create new launches)
    address public factory;
    
    /// @notice Paused state
    bool public paused;
    
    /// @notice Base tax rate for all launches (50% = 5000 bps)
    /// @dev Fixed rate, decays via epoch system in Hook
    uint256 public constant BASE_TAX_BPS = 5000;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PlatformShareBpsUpdated(uint256 oldShare, uint256 newShare);
    event FactoryUpdated(address indexed oldFactory, address indexed newFactory);
    event PausedUpdated(bool paused);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error InvalidAddress();
    error InvalidShare();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    constructor(
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        if (_treasury == address(0)) revert InvalidAddress();
        
        treasury = _treasury;
        platformShareBps = 3000; // 30% platform share
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }
    
    function setPlatformShareBps(uint256 _shareBps) external onlyOwner {
        if (_shareBps > MAX_PLATFORM_SHARE_BPS) revert InvalidShare();
        emit PlatformShareBpsUpdated(platformShareBps, _shareBps);
        platformShareBps = _shareBps;
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
    
    /// @notice Calculate fee split for a given amount
    function calculateFees(uint256 amount) external view returns (
        uint256 totalFee,
        uint256 beneficiaryShare,
        uint256 platformShare
    ) {
        totalFee = amount;  // Amount is already the fee
        platformShare = (totalFee * platformShareBps) / BPS;
        beneficiaryShare = totalFee - platformShare;
    }
    
    /// @notice Check if protocol is operational
    function isOperational() external view returns (bool) {
        return !paused;
    }
    
    /// @notice Get starting tax (fixed 50% for all launches)
    /// @dev Tax decays via epoch system in Hook: 50% → 25% → 12.5% → 6.25%
    function getStartingTax(uint256) external pure returns (uint256) {
        return BASE_TAX_BPS;
    }
}
