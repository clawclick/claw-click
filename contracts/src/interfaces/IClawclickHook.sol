// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";

interface IClawclickHook {
    struct TokenLaunch {
        address token;
        address beneficiary;
        uint256 targetMcapETH;       // Initial MCAP (1-10 ETH)
        uint256 lowestTaxBps;        // Lowest tax seen (monotonic decay tracker)
        uint256 createdBlock;
        uint256 totalVolumeETH;
        uint256 totalFeesETH;
        uint256 totalTrades;
    }
    
    // Factory functions
    function registerLaunch(
        PoolKey calldata key,
        address token,
        address beneficiary,
        uint256 targetMcapETH
    ) external;
    
    // View functions
    function getLaunch(PoolId poolId) external view returns (TokenLaunch memory);
    function getCurrentTax(PoolKey calldata key) external view returns (uint256 taxBps);
    function getCurrentMaxTx(PoolKey calldata key) external view returns (uint256);
    function getCurrentMaxWallet(PoolKey calldata key) external view returns (uint256);
    function getUserBalance(PoolId poolId, address user) external view returns (uint256);
    
    // Fee functions
    function claimBeneficiaryFees() external;
    function claimPlatformFees() external;
    function beneficiaryFees(address beneficiary) external view returns (uint256);
    function platformFees() external view returns (uint256);
    
    // Constants
    function TOTAL_SUPPLY() external pure returns (uint256);
    function TAX_FLOOR_BPS() external pure returns (uint256);
    function TAX_DECAY_PER_ETH_BPS() external pure returns (uint256);
    function MAX_TX_BPS_PER_ETH() external pure returns (uint256);
    function MAX_WALLET_BPS_PER_ETH() external pure returns (uint256);
}
