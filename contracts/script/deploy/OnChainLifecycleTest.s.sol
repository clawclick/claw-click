// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickHook_V4.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";

/**
 * @title OnChainLifecycleTest
 * @notice Complete lifecycle test on Sepolia: Launch → Trade → Epochs → Graduation
 * 
 * Usage:
 *   forge script script/deploy/OnChainLifecycleTest.s.sol:OnChainLifecycleTest \
 *     --rpc-url $SEPOLIA_RPC \
 *     --private-key $PRIVATE_KEY \
 *     --broadcast
 */
contract OnChainLifecycleTest is Script {
    // Contract addresses from .env
    address constant CONFIG = 0xb79701ca4C72f1834109Dc96423cFc5ebAaFef54;
    address constant HOOK = 0x5A5EAf2334EF56baEBa1b61FAF9B38DB8C3a6ac8;
    address constant FACTORY = 0x34E332124EC98B690DBAe922E662AebDc7692fC3;
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    
    ClawclickFactory factory;
    ClawclickConfig config;
    ClawclickHook hook;
    
    function run() external {
        factory = ClawclickFactory(payable(FACTORY));
        config = ClawclickConfig(CONFIG);
        hook = ClawclickHook(payable(HOOK));
        
        console2.log("=== CLAW.CLICK ON-CHAIN LIFECYCLE TEST ===");
        console2.log("Network: Sepolia");
        console2.log("Factory:", address(factory));
        console2.log("Deployer:", msg.sender);
        console2.log("");
        
        // Step 1: Verify system is operational
        require(config.isOperational(), "System is paused!");
        console2.log("[OK] System is operational");
        
        // Step 2: Create test launch
        console2.log("");
        console2.log("=== STEP 1: CREATE TEST LAUNCH ===");
        
        vm.startBroadcast();
        
        // Get launch fee
        uint256 bootstrap = 0.001 ether;  // $2 bootstrap
        console2.log("Bootstrap:", bootstrap);
        
        // Create launch params
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test Token Alpha",
            symbol: "TTA",
            beneficiary: msg.sender,
            agentWallet: address(0),
            targetMcapETH: 1 ether,  // 1 ETH = 2k MCAP @ $2000/ETH
            feeSplit: ClawclickFactory.FeeSplit({
                wallets: [address(0), address(0), address(0), address(0), address(0)],
                percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                count: 0
            })
        });
        
        // Launch token
        (address token, ) = factory.createLaunch{value: bootstrap}(params);
        
        console2.log("Token launched:", token);
        console2.log("Target MCAP: 1 ETH (2k @ $2000/ETH)");
        console2.log("");
        
        // Step 3: Get launch info
        ClawclickFactory.LaunchInfo memory info = factory.getLaunchByToken(token);
        console2.log("=== LAUNCH INFO ===");
        console2.log("Token:", info.token);
        console2.log("Beneficiary:", info.beneficiary);
        console2.log("Agent Wallet:", info.agentWallet);
        console2.log("Creator:", info.creator);
        console2.log("Target MCAP:", info.targetMcapETH);
        console2.log("Created At:", info.createdAt);
        console2.log("Created Block:", info.createdBlock);
        console2.log("Name:", info.name);
        console2.log("Symbol:", info.symbol);
        console2.log("");
        
        // Step 4: Check pool activation
        console2.log("=== POOL STATUS ===");
        bool activated = factory.poolActivated(info.poolId);
        console2.log("Pool activated:", activated);
        
        // Step 5: Check position token IDs
        console2.log("");
        console2.log("=== POSITIONS ===");
        uint256[5] memory tokenIds = factory.getPositionTokenIds(info.poolId);
        console2.log("P1 Token ID:", tokenIds[0]);
        console2.log("P2 Token ID:", tokenIds[1]);
        console2.log("P3 Token ID:", tokenIds[2]);
        console2.log("P4 Token ID:", tokenIds[3]);
        console2.log("P5 Token ID:", tokenIds[4]);
        console2.log("(Only P1 should be minted at launch)");
        
        vm.stopBroadcast();
        
        console2.log("");
        console2.log("=== TEST LAUNCH COMPLETE ===");
        console2.log("Token address:", token);
        console2.log("View on Sepolia: https://sepolia.etherscan.io/token/", token);
        console2.log("");
        console2.log("=== NEXT STEPS ===");
        console2.log("1. Execute swaps to advance epochs");
        console2.log("2. Trigger P2 minting at P1 epoch 2");
        console2.log("3. Continue to graduation (P1 epoch 4 end)");
        console2.log("4. Test post-graduation trading");
        console2.log("");
        console2.log("Save this token address for next test:");
        console2.log("export TOKEN=", token);
    }
}
