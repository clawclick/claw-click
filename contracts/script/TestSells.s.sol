// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactory.sol";
import "../test/TestSwapRouter.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestSells
 * @notice Sell half of each fresh wallet's tokens back to the pool.
 *
 * Usage:
 *   forge script script/TestSells.s.sol \
 *     --rpc-url $ETH_SEPOLIA_RPC_URL --broadcast --via-ir -vvv
 */
contract TestSells is Script {
    using PoolIdLibrary for PoolKey;

    address constant FACTORY_ADDR = 0x00cE3F7e4701e5c0FC9798a3b8bA33C7d767068B;
    address constant ROUTER_ADDR  = 0xCE03f9aeD760f3F5C471C1A76Ff4a8F84743b795;
    address constant TOKEN_ADDR   = 0x6E0A27e0C01D767AE3f968D06fFF1B74DC3ed185;

    function _getPoolKey() internal view returns (PoolKey memory) {
        ClawclickFactory factory = ClawclickFactory(payable(FACTORY_ADDR));
        ClawclickFactory.LaunchInfo memory info = factory.launchByToken(TOKEN_ADDR);
        return info.poolKey;
    }

    function _doSell(PoolKey memory key, uint256 amt) internal {
        IERC20(TOKEN_ADDR).approve(ROUTER_ADDR, amt);
        TestSwapRouter(payable(ROUTER_ADDR)).sell(key, amt);
    }

    function run() external {
        // Same deterministic keys as TestBuys
        uint256 pk1 = uint256(keccak256("clawclick_test_buyer_1"));
        uint256 pk2 = uint256(keccak256("clawclick_test_buyer_2"));
        uint256 pk3 = uint256(keccak256("clawclick_test_buyer_3"));
        address buyer1 = vm.addr(pk1);
        address buyer2 = vm.addr(pk2);
        address buyer3 = vm.addr(pk3);

        PoolKey memory key = _getPoolKey();
        IERC20 token = IERC20(TOKEN_ADDR);

        console2.log("=== FRESH WALLET TEST SELLS ===");
        console2.log("Buyer 1:", buyer1, "tokens:", token.balanceOf(buyer1));
        console2.log("Buyer 2:", buyer2, "tokens:", token.balanceOf(buyer2));
        console2.log("Buyer 3:", buyer3, "tokens:", token.balanceOf(buyer3));
        console2.log("");

        // Sell half of each wallet's balance
        uint256 sell1 = token.balanceOf(buyer1) / 2;
        uint256 sell2 = token.balanceOf(buyer2) / 2;
        uint256 sell3 = token.balanceOf(buyer3) / 2;

        // --- Sell from Buyer 1 ---
        console2.log("--- SELL 1: Buyer 1 selling", sell1, "tokens ---");
        vm.startBroadcast(pk1);
        _doSell(key, sell1);
        vm.stopBroadcast();
        console2.log("Buyer 1 remaining tokens:", token.balanceOf(buyer1));
        console2.log("Buyer 1 ETH:", buyer1.balance);

        // --- Sell from Buyer 2 ---
        console2.log("");
        console2.log("--- SELL 2: Buyer 2 selling", sell2, "tokens ---");
        vm.startBroadcast(pk2);
        _doSell(key, sell2);
        vm.stopBroadcast();
        console2.log("Buyer 2 remaining tokens:", token.balanceOf(buyer2));
        console2.log("Buyer 2 ETH:", buyer2.balance);

        // --- Sell from Buyer 3 ---
        console2.log("");
        console2.log("--- SELL 3: Buyer 3 selling", sell3, "tokens ---");
        vm.startBroadcast(pk3);
        _doSell(key, sell3);
        vm.stopBroadcast();
        console2.log("Buyer 3 remaining tokens:", token.balanceOf(buyer3));
        console2.log("Buyer 3 ETH:", buyer3.balance);

        console2.log("");
        console2.log("=== ALL 3 SELLS COMPLETE ===");
    }
}
