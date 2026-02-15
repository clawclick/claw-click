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
    
    /// @notice Basis points denominator (100% = 10000)
    uint256 public constant BPS = 10000;
    
    /// @notice Maximum platform share (50%)
    uint256 public constant MAX_PLATFORM_SHARE_BPS = 5000;

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
    
    /// @notice Tax tier configuration: targetMcapETH => startingTaxBps
    /// @dev Immutable once set during deployment (deterministic for users)
    mapping(uint256 => uint256) public taxTiers;

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
        
        // Initialize default tax tiers
        _initializeTaxTiers();
    }
    
    /**
     * @notice Initialize tax tier mapping
     * @dev Called once during construction
     */
    function _initializeTaxTiers() internal {
        taxTiers[1 ether] = 5000;   // 1 ETH → 50%
        taxTiers[2 ether] = 4500;   // 2 ETH → 45%
        taxTiers[3 ether] = 4000;   // 3 ETH → 40%
        taxTiers[4 ether] = 3500;   // 4 ETH → 35%
        taxTiers[5 ether] = 3000;   // 5 ETH → 30%
        taxTiers[6 ether] = 2500;   // 6 ETH → 25%
        taxTiers[7 ether] = 2000;   // 7 ETH → 20%
        taxTiers[8 ether] = 1500;   // 8 ETH → 15%
        taxTiers[9 ether] = 1000;   // 9 ETH → 10%
        taxTiers[10 ether] = 500;   // 10 ETH → 5%
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
    
    /**
     * @notice Tax tiers are IMMUTABLE after deployment
     * @dev Removed setTaxTier() to prevent post-launch manipulation
     *      This ensures users have deterministic tax rates at launch time
     *      Tax tiers cannot be changed by owner - guarantees security
     */

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
    
    /// @notice Get starting tax for a target MCAP
    function getStartingTax(uint256 targetMcapETH) external view returns (uint256) {
        return taxTiers[targetMcapETH];
    }
}
