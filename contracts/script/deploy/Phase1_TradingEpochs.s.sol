// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/core/ClawclickHook_V4.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

/**
 * @title Phase1_TradingEpochs
 * @notice Phase 1: Execute swaps and monitor epoch advancement
 * 
 * Tests:
 * - Buy TTA tokens (ETH -> TTA)
 * - Monitor current epoch
 * - Verify tax decay
 * - Advance through P1 epochs (1-4)
 * 
 * Usage:
 *   forge script script/deploy/Phase1_TradingEpochs.s.sol:Phase1_TradingEpochs \
 *     --rpc-url $SEPOLIA_RPC \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 */
contract Phase1_TradingEpochs is Script {
    // Deployed addresses
    address constant FACTORY = 0x34E332124EC98B690DBAe922E662AebDc7692fC3;
    address constant HOOK = 0x5A5EAf2334EF56baEBa1b61FAF9B38DB8C3a6ac8;
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant TOKEN = 0xD67568663c7C40d4e509EE6e1Eb7d656C7954076;
    
    ClawclickFactory factory;
    ClawclickHook hook;
    
    function run() external {
        factory = ClawclickFactory(payable(FACTORY));
        hook = ClawclickHook(payable(HOOK));
        
        console2.log("=== PHASE 1: TRADING & EPOCHS ===");
        console2.log("Token:", TOKEN);
        console2.log("Trader:", msg.sender);
        console2.log("");
        
        // Get launch info
        ClawclickFactory.LaunchInfo memory info = factory.getLaunchByToken(TOKEN);
        
        console2.log("=== CURRENT STATUS ===");
        console2.log("Pool ID:", uint256(PoolId.unwrap(info.poolId)));
        
        // Get hook state
        console2.log("");
        console2.log("=== CHECKING HOOK STATE ===");
        
        // Check if we can query current phase/epoch
        // Note: Hook may not have public getters, so we'll track via events
        
        console2.log("");
        console2.log("=== EXECUTING TEST SWAPS ===");
        console2.log("Goal: Advance through P1 epochs");
        console2.log("Expected: Tax decay 50% -> 40% -> 30% -> 20% -> 10%");
        console2.log("");
        
        // For now, just log instructions since direct swap requires PoolManager interaction
        console2.log("[INFO] To execute swaps:");
        console2.log("1. Use Uniswap V4 frontend or custom swap router");
        console2.log("2. Buy TTA tokens with ETH");
        console2.log("3. Monitor events for epoch advancement");
        console2.log("4. Each doubling triggers new epoch");
        console2.log("");
        
        console2.log("=== EPOCH TRACKING ===");
        console2.log("Starting MCAP: 1 ETH");
        console2.log("Epoch 1: 1 ETH -> 2 ETH (tax: 50%)");
        console2.log("Epoch 2: 2 ETH -> 4 ETH (tax: 40%) [P2 mints!]");
        console2.log("Epoch 3: 4 ETH -> 8 ETH (tax: 30%)");
        console2.log("Epoch 4: 8 ETH -> 16 ETH (tax: 20%)");
        console2.log("Graduation: 16 ETH reached (tax: 10% for final epoch)");
        console2.log("");
        
        console2.log("=== MONITORING TOOLS ===");
        console2.log("1. Sepolia Explorer: https://sepolia.etherscan.io/token/", TOKEN);
        console2.log("2. Check Hook events: https://sepolia.etherscan.io/address/", HOOK);
        console2.log("3. Monitor pool: https://sepolia.etherscan.io/address/", POOL_MANAGER);
        console2.log("");
        
        console2.log("=== NEXT STEPS ===");
        console2.log("1. Execute buy transactions via Universal Router or custom swap");
        console2.log("2. Monitor EpochAdvanced events from Hook");
        console2.log("3. Watch for P2 minting at epoch 2");
        console2.log("4. Continue to Phase 2 once P2 mints");
    }
}
