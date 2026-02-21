// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

/**
 * @title DebugPTTPool
 * @notice Check if PTT pool is actually initialized
 */
contract DebugPTTPool is Script {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;

    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant HOOK = 0xa2FF089271e4527025Ee614EB165368875A12AC8;
    address constant PTT_TOKEN = 0xa0111feeC482c66F810BB1a2Dd9643deBCe873CA;

    function run() external view {
        console2.log("=== CHECKING PTT POOL STATE ===");
        console2.log("Token:", PTT_TOKEN);
        console2.log("Hook:", HOOK);
        console2.log("Pool Manager:", POOL_MANAGER);
        console2.log("");

        // Build pool key (MUST match Factory's _createPoolKey)
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)), // ETH
            currency1: Currency.wrap(PTT_TOKEN),
            fee: 0x800000, // Dynamic fee flag - CRITICAL!
            tickSpacing: 60,
            hooks: IHooks(HOOK)
        });

        PoolId poolId = key.toId();
        console2.log("Pool ID:");
        console2.logBytes32(PoolId.unwrap(poolId));
        console2.log("");

        IPoolManager pm = IPoolManager(POOL_MANAGER);

        // Check if pool is initialized
        (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee) = pm.getSlot0(poolId);
        
        console2.log("=== POOL STATE ===");
        console2.log("sqrtPriceX96:", sqrtPriceX96);
        console2.log("tick:", uint256(int256(tick)));
        console2.log("protocolFee:", protocolFee);
        console2.log("lpFee:", lpFee);
        console2.log("");

        if (sqrtPriceX96 == 0) {
            console2.log("[X] POOL NOT INITIALIZED (sqrtPriceX96 == 0)");
        } else {
            console2.log("[OK] POOL IS INITIALIZED");
            console2.log("   sqrtPriceX96:", sqrtPriceX96);
        }
    }
}
