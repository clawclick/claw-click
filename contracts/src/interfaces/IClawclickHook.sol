// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";

interface IClawclickHook {
    /*//////////////////////////////////////////////////////////////
                                STRUCTS
    //////////////////////////////////////////////////////////////*/

    enum Phase {
        PROTECTED,
        GRADUATED
    }

    struct Launch {
        address token;
        address beneficiary;
        uint256 startMcap;
        uint256 baseTax;
        uint160 startSqrtPrice;
        Phase phase;
        uint8 liquidityStage;
        uint256 graduationMcap;
    }

    /*//////////////////////////////////////////////////////////////
                            FACTORY FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function registerLaunch(
        PoolKey calldata key,
        address token,
        address beneficiary,
        uint256 startMcap,
        uint160 sqrtPriceX96
    ) external;

    function setActivationInProgress(PoolId poolId, bool inProgress) external;

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    function launches(PoolId poolId)
        external
        view
        returns (Launch memory);

    function tokenToPoolId(address token)
        external
        view
        returns (PoolId);

    function getCurrentTax(PoolId poolId)
        external
        view
        returns (uint256);

    function getCurrentLimits(PoolId poolId)
        external
        view
        returns (uint256 maxTx, uint256 maxWallet);

    function getCurrentEpoch(PoolId poolId)
        external
        view
        returns (uint256);

    function isGraduated(PoolId poolId)
        external
        view
        returns (bool);

    function isGraduatedByToken(address token)
        external
        view
        returns (bool);

    function getPoolIdForToken(address token)
        external
        view
        returns (PoolId);

    /*//////////////////////////////////////////////////////////////
                            FEE CLAIMING
    //////////////////////////////////////////////////////////////*/

    function claimBeneficiaryFeesETH(address beneficiary) external;

    function claimBeneficiaryFeesToken(address beneficiary, address token) external;

    function claimPlatformFeesETH() external;

    function claimPlatformFeesToken(address token) external;

    /*//////////////////////////////////////////////////////////////
                            CONSTANTS
    //////////////////////////////////////////////////////////////*/

    function TOTAL_SUPPLY() external pure returns (uint256);

    function TAX_FLOOR_BPS() external pure returns (uint256);

    function GRADUATION_EPOCH() external pure returns (uint256);
}