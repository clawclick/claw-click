// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";

interface IClawclickFactory {
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    /// @notice Fee split configuration for creator's 70% share
    struct FeeSplit {
        address[5] wallets;       // Up to 5 beneficiary wallets
        uint16[5] percentages;    // Percentages in BPS (must sum to 10000 = 100%)
        uint8 count;              // Number of active wallets (1-5, 0 = use default beneficiary)
    }

    struct LaunchInfo {
        address token;
        address beneficiary;
        address agentWallet;
        address creator;
        PoolId poolId;
        PoolKey poolKey;
        uint256 targetMcapETH;
        uint256 createdAt;
        uint256 createdBlock;
        string name;
        string symbol;
        FeeSplit feeSplit;        // Fee split configuration
    }

    struct CreateParams {
        string name;
        string symbol;
        address beneficiary;
        address agentWallet;
        uint256 targetMcapETH;
        FeeSplit feeSplit;        // Optional: split creator's 70% across multiple wallets
    }

    /*//////////////////////////////////////////////////////////////
                            LAUNCH CREATION
    //////////////////////////////////////////////////////////////*/

    function createLaunch(CreateParams calldata params)
        external
        payable
        returns (address token, PoolId poolId);

    /*//////////////////////////////////////////////////////////////
                    MULTI-POSITION MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function mintNextPosition(PoolId poolId, uint256 positionIndex) external;

    function retireOldPosition(PoolId poolId, uint256 positionIndex) external;

    function collectFeesFromPosition(PoolId poolId, uint256 positionIndex) external;

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    function poolActivated(PoolId poolId) external view returns (bool);

    function getLaunchByToken(address token)
        external
        view
        returns (LaunchInfo memory);

    function getLaunchByPoolId(PoolId poolId)
        external
        view
        returns (LaunchInfo memory);

    function getAllTokens() external view returns (address[] memory);

    function getTokenCount() external view returns (uint256);

    function getTokenAtIndex(uint256 index) external view returns (address);

    function totalLaunches() external view returns (uint256);

    function previewSqrtPrice(uint256 targetMcapETH)
        external
        pure
        returns (uint160);

    /*//////////////////////////////////////////////////////////////
                            ADMIN
    //////////////////////////////////////////////////////////////*/

    function clearDevOverride(PoolId poolId) external;

    /*//////////////////////////////////////////////////////////////
                            IMMUTABLES
    //////////////////////////////////////////////////////////////*/

    function hook() external view returns (address);

    function poolManager() external view returns (address);

    function config() external view returns (address);

    function positionManager() external view returns (address);
}