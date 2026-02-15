// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";

interface IClawclickFactory {
    struct LaunchInfo {
        address token;
        address beneficiary;
        address agentWallet;
        address creator;
        PoolId poolId;
        PoolKey poolKey;
        uint256 targetMcapETH;    // NEW: Initial MCAP
        uint256 createdAt;
        uint256 createdBlock;
        string name;
        string symbol;
        bool isPremium;
    }
    
    struct CreateParams {
        string name;
        string symbol;
        address beneficiary;
        address agentWallet;
        bool isPremium;
        uint256 targetMcapETH;    // NEW: 1-10 ETH target
    }
    
    // Launch creation
    function createLaunch(CreateParams calldata params) external payable returns (address token, PoolId poolId);
    
    // View functions
    function getLaunchByToken(address token) external view returns (LaunchInfo memory);
    function getLaunchByPoolId(PoolId poolId) external view returns (LaunchInfo memory);
    function getAllTokens() external view returns (address[] memory);
    function getTokenCount() external view returns (uint256);
    function getTokenAtIndex(uint256 index) external view returns (address);
    function getFee(bool isPremium) external view returns (uint256);
    function totalLaunches() external view returns (uint256);
    function premiumFee() external view returns (uint256);
    function microFee() external view returns (uint256);
    function previewSqrtPrice(uint256 targetMcapETH) external pure returns (uint160);  // NEW
    
    // Admin functions
    function setFees(uint256 _premiumFee, uint256 _microFee) external;
    
    // Immutables
    function hook() external view returns (address);
    function poolManager() external view returns (address);
    function config() external view returns (address);
    function lpLocker() external view returns (address);
}
