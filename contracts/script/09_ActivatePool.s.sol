// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../src/core/ClawclickFactory.sol";

contract ActivatePool is Script {
    using PoolIdLibrary for PoolKey;
    
    ClawclickFactory factory = ClawclickFactory(0xdCCb09e463C160c67e9075794bcE1F29a6C8C7A4);
    IPositionManager positionManager = IPositionManager(0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4);
    
    address token = 0x005C870142072b7425541327F65733f668CC7989;
    address hook = 0xEbe6420f6aA7Bc53A2079160D6f0B116F45B37c0;
    
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)), // ETH
            currency1: Currency.wrap(token),
            fee: 0x800000, // Dynamic fee flag
            tickSpacing: 200,
            hooks: IHooks(hook)
        });
        
        PoolId poolId = key.toId();
        
        console2.log("=== PRE-ACTIVATION STATE ===");
        console2.log("Pool ID:", uint256(PoolId.unwrap(poolId)));
        console2.log("Pool activated:", factory.poolActivated(poolId));
        
        vm.startBroadcast(pk);
        
        // Activate pool with 0.01 ETH
        console2.log("\n=== ACTIVATING POOL ===");
        console2.log("Sending 0.01 ETH to activate...");
        factory.activatePool{value: 0.01 ether}(key);
        
        vm.stopBroadcast();
        
        console2.log("\n=== POST-ACTIVATION STATE ===");
        console2.log("Pool activated:", factory.poolActivated(poolId));
        
        uint256 tokenId = factory.positionTokenId(poolId);
        console2.log("NFT Token ID:", tokenId);
        
        if (tokenId > 0) {
            address nftOwner = IERC721(address(positionManager)).ownerOf(tokenId);
            console2.log("NFT Owner:", nftOwner);
            console2.log("Factory address:", address(factory));
            console2.log("NFT owned by Factory:", nftOwner == address(factory));
        }
    }
}
