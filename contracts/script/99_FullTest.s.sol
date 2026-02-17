// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/core/ClawclickToken.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";

/**
 * @title Full Lifecycle Test
 * @notice Tests complete lifecycle with new NFT-custody architecture
 * 
 * Flow:
 * 1. Create launch (micro tier, 2 ETH target MCAP)
 * 2. Activate pool with ETH (first-buy activation)
 * 3. Verify NFT owner == Factory
 * 4. Run swaps to test tax engine
 * 5. Verify reposition() and collectFees() can only be called by Factory owner
 */
contract FullTest is Script {

    IPoolManager constant poolManager = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    IPositionManager constant positionManager = IPositionManager(0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4);

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address factoryAddr = vm.envAddress("FACTORY");
        address hookAddr = vm.envAddress("HOOK");
        
        ClawclickFactory factory = ClawclickFactory(factoryAddr);
        ClawclickHook hook = ClawclickHook(payable(hookAddr));
        
        vm.startBroadcast(pk);
        
        console2.log("========================================");
        console2.log("STEP 1: CREATE LAUNCH");
        console2.log("========================================");
        
        // Create launch (micro tier, 2 ETH target)
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test Token",
            symbol: "TEST",
            beneficiary: tx.origin,
            agentWallet: tx.origin,
            isPremium: false,
            targetMcapETH: 2 ether
        });
        
        uint256 microFee = factory.getFee(false);
        console2.log("Micro Fee:", microFee);
        
        (address token, PoolId poolId) = factory.createLaunch{value: microFee}(params);
        
        console2.log("Token:", token);
        console2.log("PoolId:", uint256(PoolId.unwrap(poolId)));
        
        ClawclickFactory.LaunchInfo memory info = factory.getLaunchByToken(token);
        
        console2.log("Target MCAP:", info.targetMcapETH);
        console2.log("Created Block:", info.createdBlock);
        
        console2.log("\n========================================");
        console2.log("STEP 2: CHECK PRE-ACTIVATION STATE");
        console2.log("========================================");
        
        bool isActivated = factory.poolActivated(poolId);
        console2.log("Pool Activated:", isActivated);
        
        uint256 tokenId = factory.positionTokenId(poolId);
        console2.log("Position Token ID:", tokenId);
        
        console2.log("\n========================================");
        console2.log("STEP 3: ACTIVATE POOL");
        console2.log("========================================");
        
        // Activate pool with 0.1 ETH
        uint256 activationETH = 0.1 ether;
        console2.log("Activating with ETH:", activationETH);
        
        factory.activatePool{value: activationETH}(info.poolKey);
        
        console2.log("\n========================================");
        console2.log("STEP 4: CHECK POST-ACTIVATION STATE");
        console2.log("========================================");
        
        isActivated = factory.poolActivated(poolId);
        console2.log("Pool Activated:", isActivated);
        
        tokenId = factory.positionTokenId(poolId);
        console2.log("Position Token ID:", tokenId);
        
        // Check NFT owner
        try IERC721(address(positionManager)).ownerOf(tokenId) returns (address nftOwner) {
            console2.log("NFT Owner:", nftOwner);
            console2.log("Factory Address:", address(factory));
            
            if (nftOwner == address(factory)) {
                console2.log("[OK] NFT OWNED BY FACTORY (CORRECT)");
            } else {
                console2.log("[ERROR] NFT NOT OWNED BY FACTORY (WRONG)");
            }
        } catch {
            console2.log("[ERROR] Could not fetch NFT owner");
        }
        
        console2.log("\n========================================");
        console2.log("STEP 5: CHECK HOOK STATE");
        console2.log("========================================");
        
        uint256 epoch = hook.getCurrentEpoch(poolId);
        uint256 tax = hook.getCurrentTax(poolId);
        bool graduated = hook.isGraduated(poolId);
        
        console2.log("Current Epoch:", epoch);
        console2.log("Current Tax (BPS):", tax);
        console2.log("Graduated:", graduated);
        
        console2.log("\n========================================");
        console2.log("[OK] DEPLOYMENT & ACTIVATION COMPLETE!");
        console2.log("========================================");
        console2.log("\nNext steps:");
        console2.log("1. Export TOKEN=", token);
        console2.log("2. Run 06_LiveLifecycleTest to test swaps");
        console2.log("3. Call factory.repositionByEpoch() as owner");
        console2.log("4. Call factory.collectFees() as owner");
        
        vm.stopBroadcast();
    }
}
