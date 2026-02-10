// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ClawclickToken
 * @notice Standard ERC-20 token for clawclick launches
 * @dev Minimal token - all logic lives in the hook
 */
contract ClawclickToken is ERC20 {
    /// @notice Total supply: 1 billion tokens with 18 decimals
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    
    /// @notice The hook that manages this token's pool
    address public immutable hook;
    
    /// @notice Beneficiary address (receives trading fees)
    address public immutable beneficiary;
    
    /// @notice Creation timestamp
    uint256 public immutable createdAt;
    
    /// @notice Agent wallet (for claws.fun integration)
    address public immutable agentWallet;

    error OnlyHook();

    modifier onlyHook() {
        if (msg.sender != hook) revert OnlyHook();
        _;
    }

    /**
     * @param _name Token name
     * @param _symbol Token symbol  
     * @param _hook The ClawclickHook address
     * @param _beneficiary Fee recipient address
     * @param _agentWallet Agent wallet for claws.fun
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _hook,
        address _beneficiary,
        address _agentWallet
    ) ERC20(_name, _symbol) {
        hook = _hook;
        beneficiary = _beneficiary;
        agentWallet = _agentWallet;
        createdAt = block.timestamp;
        
        // Mint entire supply to the hook for pool initialization
        _mint(_hook, TOTAL_SUPPLY);
    }
}
