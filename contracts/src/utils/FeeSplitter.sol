// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title FeeSplitter
 * @notice Minimal immutable contract that receives ETH and auto-forwards to multiple wallets
 * @dev Ultra-lightweight: no owner, no upgrades, just receive + split + forward
 * 
 * Flow:
 * 1. ETH comes in (from taxes)
 * 2. If balance >= threshold (0.0015 ETH), auto-split and forward
 * 3. Each wallet gets their % share
 * 
 * Example: 5 wallets at 20% each
 * - 0.1 ETH comes in → triggers split → each gets 0.02 ETH
 * - If only 0.001 ETH, waits for more to reach threshold
 */
contract FeeSplitter {
    /// @notice Minimum balance to trigger distribution (0.0015 ETH)
    uint256 public constant THRESHOLD = 0.0015 ether;
    
    /// @notice Basis points denominator (10000 = 100%)
    uint256 public constant BPS = 10000;
    
    /// @notice Recipient wallets (immutable, set at deployment)
    address payable[5] public recipients;
    
    /// @notice Percentage shares in BPS (immutable, set at deployment)
    uint16[5] public shares;
    
    /// @notice Number of active recipients (1-5)
    uint8 public count;
    
    /// @notice Total ETH distributed (for tracking)
    uint256 public totalDistributed;
    
    event Distributed(uint256 amount, uint256 timestamp);
    
    error InvalidConfiguration();
    error ZeroAddress();
    error InvalidShares();
    error DistributionFailed();
    
    /**
     * @notice Deploy fee splitter with recipients and shares
     * @param _recipients Array of recipient addresses (up to 5)
     * @param _shares Array of shares in BPS (must sum to 10000)
     * @param _count Number of active recipients (1-5)
     */
    constructor(
        address payable[5] memory _recipients,
        uint16[5] memory _shares,
        uint8 _count
    ) {
        if (_count == 0 || _count > 5) revert InvalidConfiguration();
        
        uint256 totalShares;
        for (uint8 i = 0; i < _count; i++) {
            if (_recipients[i] == address(0)) revert ZeroAddress();
            totalShares += _shares[i];
            recipients[i] = _recipients[i];
            shares[i] = _shares[i];
        }
        
        if (totalShares != BPS) revert InvalidShares();
        count = _count;
    }
    
    /**
     * @notice Receive ETH and auto-distribute if threshold met
     */
    receive() external payable {
        if (address(this).balance >= THRESHOLD) {
            _distribute();
        }
    }
    
    /**
     * @notice Manual trigger for distribution (anyone can call)
     */
    function distribute() external {
        if (address(this).balance < THRESHOLD) revert("Below threshold");
        _distribute();
    }
    
    /**
     * @notice Internal distribution logic
     */
    function _distribute() internal {
        uint256 balance = address(this).balance;
        if (balance == 0) return;
        
        for (uint8 i = 0; i < count; i++) {
            uint256 amount = (balance * shares[i]) / BPS;
            (bool success, ) = recipients[i].call{value: amount}("");
            if (!success) revert DistributionFailed();
        }
        
        totalDistributed += balance;
        emit Distributed(balance, block.timestamp);
    }
}
