// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";
import {PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../src/core/ClawclickFactory.sol";

contract SwapTest is Script {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;
    
    IPoolManager poolManager = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    IPositionManager positionManager = IPositionManager(0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4);
    ClawclickFactory factory = ClawclickFactory(0xA26Acea207cE95797fa6303eAF0bB191b802e77f);
    
    address token = 0x39702408153fF3F389fe7b96A0A710175EFf90A0;
    address hook = 0xEbe6420f6aA7Bc53A2079160D6f0B116F45B37c0;
    
    PoolKey key;
    uint256 nftTokenId = 23455;
    
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        
        // Build pool key
        key = PoolKey({
            currency0: Currency.wrap(address(0)), // ETH
            currency1: Currency.wrap(token),
            fee: 0x800000, // Dynamic fee flag
            tickSpacing: 200,
            hooks: IHooks(hook)
        });
        
        console2.log("=== PRE-SWAP STATE ===");
        _logPoolState();
        _logPositionState();
        
        vm.startBroadcast(pk);
        
        // Execute swap via unlock callback
        bytes memory swapData = abi.encode(key, true, int256(0.01 ether));
        poolManager.unlock(abi.encode(this.unlockCallback.selector, swapData));
        
        vm.stopBroadcast();
        
        console2.log("\n=== POST-SWAP STATE ===");
        _logPoolState();
        _logPositionState();
    }
    
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "Only PoolManager");
        
        (PoolKey memory _key, bool zeroForOne, int256 amountSpecified) = abi.decode(data, (PoolKey, bool, int256));
        
        // Build swap params
        SwapParams memory params = SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: amountSpecified,
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });
        
        // Execute swap
        BalanceDelta delta = poolManager.swap(_key, params, "");
        
        console2.log("\n=== SWAP DELTAS ===");
        console2.log("amount0Delta:", uint256(int256(delta.amount0())));
        console2.log("amount1Delta:", uint256(int256(delta.amount1())));
        
        // Settle deltas
        int128 amt0 = delta.amount0();
        int128 amt1 = delta.amount1();
        
        if (amt0 < 0) {
            // We owe ETH to pool
            poolManager.settle{value: uint128(-amt0)}();
        } else if (amt0 > 0) {
            // Pool owes us ETH
            poolManager.take(_key.currency0, address(this), uint128(amt0));
        }
        
        if (amt1 < 0) {
            // We owe tokens to pool (shouldn't happen in buy)
            revert("Unexpected token debt");
        } else if (amt1 > 0) {
            // Pool owes us tokens - we receive them
            poolManager.take(_key.currency1, address(this), uint128(amt1));
        }
        
        return "";
    }
    
    function _logPoolState() internal view {
        (uint160 sqrtPriceX96, int24 tick,,) = poolManager.getSlot0(key.toId());
        uint128 liquidity = poolManager.getLiquidity(key.toId());
        
        console2.log("sqrtPriceX96:", sqrtPriceX96);
        console2.log("tick:", uint256(uint24(tick)));
        console2.log("liquidity:", liquidity);
    }
    
    function _logPositionState() internal view {
        // Position info tracking - check NFT ownership
        address owner = IERC721(address(positionManager)).ownerOf(nftTokenId);
        console2.log("Position NFT owner:", owner);
        console2.log("Position NFT ID:", nftTokenId);
        console2.log("Factory address:", address(factory));
        console2.log("NFT owned by Factory:", owner == address(factory));
    }
    
    // Required to receive ETH
    receive() external payable {}
}
