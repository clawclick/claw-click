// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";

interface IClawclickHook {
    enum LaunchState {
        PRE_LAUNCH,
        LIVE
    }
    
    struct TokenLaunch {
        LaunchState state;
        address token;
        address beneficiary;
        uint256 launchBlock;
        uint256 launchTimestamp;
        uint256 totalSupply;
        uint256 supplyReleased;
        uint256 lastReleaseBlock;
        uint256 totalFeesEarnedETH;
        uint256 totalVolumeETH;
        uint256 totalBuys;
        uint256 totalSells;
        uint256 genesisETH;
    }
    
    // Factory functions
    function registerLaunch(
        PoolKey calldata key,
        address token,
        address beneficiary
    ) external;
    
    function approvePoolManager(address token) external;
    
    // View functions
    function getLaunch(PoolId poolId) external view returns (TokenLaunch memory);
    
    function isLive(PoolId poolId) external view returns (bool);
    
    function getBlocksSinceLaunch(PoolId poolId) external view returns (uint256);
    
    function getCurrentSupplyReleased(PoolId poolId) external view returns (uint256);
    
    function isInAntiSnipePeriod(PoolId poolId) external view returns (bool);
    
    function getAntiSnipeBuyLimit(PoolId poolId) external view returns (uint256);
    
    function getRemainingAntiSnipeBudget(PoolId poolId, address buyer) external view returns (uint256);
    
    // Fee functions
    function claimBeneficiaryFees() external;
    
    function claimPlatformFees() external;
    
    function beneficiaryFees(address beneficiary) external view returns (uint256);
    
    function platformFees() external view returns (uint256);
    
    // Constants
    function TOTAL_SUPPLY() external view returns (uint256);
    
    function INITIAL_RELEASE_BPS() external view returns (uint256);
    
    function RELEASE_PER_BLOCK_BPS() external view returns (uint256);
    
    function MIN_ANTI_SNIPE_BASE() external view returns (uint256);
}
