// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../test/TestSwapRouter.sol";

/**
 * @title SwapOnPTT
 * @notice Make test swaps on ProperTestToken (10 ETH MCAP = $200 limits)
 */
contract SwapOnPTT is Script {
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant HOOK = 0xa2FF089271e4527025Ee614EB165368875A12AC8;
    address constant PTT_TOKEN = 0xa0111feeC482c66F810BB1a2Dd9643deBCe873CA;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address trader = vm.addr(pk);

        console2.log("Trader:", trader);
        console2.log("Balance:", trader.balance / 1e18, "ETH");
        console2.log("Token:", PTT_TOKEN);

        vm.startBroadcast(pk);

        // Deploy router
        TestSwapRouter router = new TestSwapRouter(IPoolManager(POOL_MANAGER));
        console2.log("Router deployed:", address(router));

        // Build pool key
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)), // ETH
            currency1: Currency.wrap(PTT_TOKEN),
            fee: 0,
            tickSpacing: 60,
            hooks: IHooks(HOOK)
        });

        console2.log("\n=== MAKING TEST SWAPS ===");
        
        // Buy 1: 0.05 ETH (~$100)
        console2.log("\n[1/8] Buy 0.05 ETH...");
        router.buy{value: 0.05 ether}(key, 0.05 ether);
        
        // Buy 2: 0.05 ETH
        console2.log("[2/8] Buy 0.05 ETH...");
        router.buy{value: 0.05 ether}(key, 0.05 ether);
        
        // Buy 3: 0.03 ETH (~$60)
        console2.log("[3/8] Buy 0.03 ETH...");
        router.buy{value: 0.03 ether}(key, 0.03 ether);
        
        // Sell some tokens back
        uint256 balance = IERC20(PTT_TOKEN).balanceOf(trader);
        uint256 sellAmount = balance / 4;
        console2.log("[4/8] Sell tokens:", sellAmount / 1e18);
        IERC20(PTT_TOKEN).approve(address(router), sellAmount);
        router.sell(key, sellAmount);
        
        // Buy 4: 0.04 ETH
        console2.log("[5/8] Buy 0.04 ETH...");
        router.buy{value: 0.04 ether}(key, 0.04 ether);
        
        // Sell more
        balance = IERC20(PTT_TOKEN).balanceOf(trader);
        sellAmount = balance / 5;
        console2.log("[6/8] Sell tokens:", sellAmount / 1e18);
        IERC20(PTT_TOKEN).approve(address(router), sellAmount);
        router.sell(key, sellAmount);
        
        // Buy 5: 0.06 ETH
        console2.log("[7/8] Buy 0.06 ETH...");
        router.buy{value: 0.06 ether}(key, 0.06 ether);
        
        // Final sell
        balance = IERC20(PTT_TOKEN).balanceOf(trader);
        sellAmount = balance / 3;
        console2.log("[8/8] Sell tokens:", sellAmount / 1e18);
        IERC20(PTT_TOKEN).approve(address(router), sellAmount);
        router.sell(key, sellAmount);

        vm.stopBroadcast();

        console2.log("\n=== COMPLETE ===");
        console2.log("Total buys: 5 (~$460 volume)");
        console2.log("Total sells: 3");
        console2.log("Check https://www.claw.click/ for stats!");
        console2.log("================");
    }
}
