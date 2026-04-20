// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";

interface IClawclickFactoryCore {
    enum LaunchType { DIRECT, AGENT }

    function getPoolState(PoolId poolId) external view returns (
        address token,
        address beneficiary,
        uint256 startingMCAP,
        uint256 graduationMCAP,
        uint256 totalSupply,
        uint256 recycledETH,
        bool activated,
        bool graduated
    );

    function getPoolFlags(PoolId poolId) external view returns (
        uint256[5] memory positionTokenIds,
        bool[5] memory positionMinted,
        bool[5] memory positionRetired
    );

    function getLaunchInfo(PoolId poolId) external view returns (
        address token,
        PoolKey memory poolKey,
        address beneficiary,
        address creator,
        uint256 targetMcapETH,
        uint256 createdAt,
        string memory name,
        string memory symbol
    );

    function getPoolIdForPosition(uint256 tokenId) external view returns (PoolId);
    function clearRecycledETH(PoolId poolId) external;
    function addRecycledETH(PoolId poolId, uint256 amount) external;
    function storePositionTokenId(PoolId poolId, uint256 positionIndex, uint256 tokenId) external;
    function markPositionRetired(PoolId poolId, uint256 positionIndex) external;
}
