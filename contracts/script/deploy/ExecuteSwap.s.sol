// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {PoolSwapTest} from "v4-core/src/test/PoolSwapTest.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";

/**
 * @title ExecuteSwap
 * @notice Execute swaps on Sepolia using official V4 PoolSwapTest contract
 * 
 * Usage:
 *   forge script script/deploy/ExecuteSwap.s.sol:ExecuteSwap \
 *     --rpc-url $SEPOLIA_RPC \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast --legacy
 */
contract ExecuteSwap is Script {
    // Deployed contracts
    address constant FACTORY = 0x34E332124EC98B690DBAe922E662AebDc7692fC3;
    address constant TOKEN = 0xD67568663c7C40d4e509EE6e1Eb7d656C7954076;
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    
    // Official V4 test contracts on Sepolia
    address constant POOL_SWAP_TEST = 0x9B6b46e2c869aa39918Db7f52f5557FE577B6eEe;
    
    function run() external {
        ClawclickFactory factory = ClawclickFactory(payable(FACTORY));
        PoolSwapTest swapTest = PoolSwapTest(POOL_SWAP_TEST);
        
        console2.log("=== EXECUTING V4 SWAP ON SEPOLIA ===");
        console2.log("Token:", TOKEN);
        console2.log("PoolSwapTest:", POOL_SWAP_TEST);
        console2.log("Trader:", msg.sender);
        console2.log("");
        
        // Get launch info
        ClawclickFactory.LaunchInfo memory info = factory.launchByToken(TOKEN);
        PoolKey memory key = info.poolKey;
        
        console2.log("=== POOL INFO ===");
        console2.log("Currency0 (ETH):", Currency.unwrap(key.currency0));
        console2.log("Currency1 (TTA):", Currency.unwrap(key.currency1));
        console2.log("Fee:", key.fee);
        console2.log("Tick Spacing:", key.tickSpacing);
        console2.log("Hook:", address(key.hooks));
        console2.log("");
        
        vm.startBroadcast();
        
        // Swap parameters
        SwapParams memory params = SwapParams({
            zeroForOne: true,  // ETH -> TTA
            amountSpecified: -0.1 ether,  // Exact input: 0.1 ETH
            sqrtPriceLimitX96: 0  // No limit
        });
        
        PoolSwapTest.TestSettings memory settings = PoolSwapTest.TestSettings({
            takeClaims: false,
            settleUsingBurn: false
        });
        
        console2.log("=== EXECUTING SWAP ===");
        console2.log("Direction: ETH -> TTA");
        console2.log("Amount: 0.1 ETH");
        console2.log("");
        
        // Execute swap
        swapTest.swap{value: 0.1 ether}(
            key,
            params,
            settings,
            ""  // hookData
        );
        
        vm.stopBroadcast();
        
        console2.log("");
        console2.log("=== SWAP COMPLETE ===");
        console2.log("Check transaction on Sepolia explorer");
        console2.log("Monitor Hook events for epoch advancement");
        console2.log("");
        console2.log("Expected:");
        console2.log("- Tax: 50% (epoch 1)");
        console2.log("- You receive: ~TTA tokens (after tax)");
        console2.log("- MCAP increases toward 2 ETH");
    }
}
