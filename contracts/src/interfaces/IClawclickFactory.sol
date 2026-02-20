// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";

interface IClawclickFactory {
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    struct FeeSplit {
        address[5] wallets;
        uint16[5] percentages;
        uint8 count;
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
        FeeSplit feeSplit;
    }

    struct CreateParams {
        string name;
        string symbol;
        address beneficiary;
        address agentWallet;
        uint256 targetMcapETH;
        FeeSplit feeSplit;
    }

    struct PoolState {
        address token;
        address beneficiary;
        uint256 startingMCAP;
        uint256 graduationMCAP;
        uint256 totalSupply;
        uint256[5] positionTokenIds;
        bool[5] positionMinted;
        bool[5] positionRetired;
        uint256 recycledETH;
        bool activated;
        bool graduated;
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
                            VIEW FUNCTIONS & MAPPINGS
    //////////////////////////////////////////////////////////////*/
    
    function poolActivated(PoolId poolId) external view returns (bool);

    // Public mappings - access directly instead of view functions
    function launchByToken(address token) external view returns (LaunchInfo memory);
    
    function launchByPoolId(PoolId poolId) external view returns (LaunchInfo memory);
    
    function poolStates(PoolId poolId) external view returns (PoolState memory);
    
    function allTokens(uint256 index) external view returns (address);

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