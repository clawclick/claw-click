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
 * @title PopulateStats
 * @notice Execute many small swaps to populate volume/fees stats
 */
contract PopulateStats is Script {
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant HOOK = 0xa2FF089271e4527025Ee614EB165368875A12AC8;
    address constant PTT_TOKEN = 0xa0111feeC482c66F810BB1a2Dd9643deBCe873CA;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address trader = vm.addr(pk);

        console2.log("=== POPULATING STATS WITH MANY SMALL SWAPS ===");
        console2.log("Trader:", trader);
        console2.log("Balance:", trader.balance / 1e18, "ETH");
        console2.log("Token:", PTT_TOKEN);
        console2.log("");

        vm.startBroadcast(pk);

        // Deploy router
        TestSwapRouter router = new TestSwapRouter(IPoolManager(POOL_MANAGER));
        console2.log("Router deployed:", address(router));

        // Build pool key (MUST use dynamic fee flag!)
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)), // ETH
            currency1: Currency.wrap(PTT_TOKEN),
            fee: 0x800000, // Dynamic fee flag - CRITICAL!
            tickSpacing: 60,
            hooks: IHooks(HOOK)
        });

        console2.log("");
        console2.log("=== EXECUTING SWAPS (small amounts to avoid limits) ===");
        console2.log("");

        uint256 swapCount = 0;
        uint256 totalVolume = 0;

        // PHASE 1: Many small buys (0.01 ETH each)
        console2.log("PHASE 1: Small buys (0.01 ETH each)");
        for (uint i = 0; i < 15; i++) {
            uint256 amount = 0.01 ether;
            console2.log("Buy 0.01 ETH");
            router.buy{value: amount}(key, amount);
            swapCount++;
            totalVolume += amount;
        }

        console2.log("");
        console2.log("PHASE 2: Tiny sells to create activity");
        
        // PHASE 2: Small sells (sell 10% of balance each time)
        for (uint i = 0; i < 5; i++) {
            uint256 balance = IERC20(PTT_TOKEN).balanceOf(trader);
            if (balance == 0) break;
            
            uint256 sellAmount = balance / 10; // Sell 10%
            if (sellAmount == 0) break;
            
            console2.log("Selling tokens");
            IERC20(PTT_TOKEN).approve(address(router), sellAmount);
            router.sell(key, sellAmount);
            swapCount++;
        }

        console2.log("");
        console2.log("PHASE 3: More small buys to increase volume");
        
        // PHASE 3: More small buys
        for (uint i = 0; i < 10; i++) {
            uint256 amount = 0.008 ether; // Slightly smaller
            console2.log("Buy 0.008 ETH");
            router.buy{value: amount}(key, amount);
            swapCount++;
            totalVolume += amount;
        }

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== STATS POPULATION COMPLETE ===");
        console2.log("Total Swaps:", swapCount);
        console2.log("Total Buy Volume:", totalVolume / 1e18, "ETH");
        console2.log("Estimated USD Volume:", (totalVolume / 1e18) * 2000);
        console2.log("");
        console2.log("Check https://www.claw.click/ to see stats update!");
        console2.log("========================================");
    }
}
