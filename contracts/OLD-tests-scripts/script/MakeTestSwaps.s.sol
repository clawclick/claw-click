// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../test/TestSwapRouter.sol";

/**
 * @title MakeTestSwaps
 * @notice Script to make test swaps on deployed tokens
 */
contract MakeTestSwaps is Script {
    using PoolIdLibrary for PoolKey;

    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant HOOK = 0xa2FF089271e4527025Ee614EB165368875A12AC8;
    
    // Token 1: GradTestRepos
    address constant TOKEN_1 = 0x0d79931ec9CdDF474F24D9dE59E1169B38923E54;
    
    // Token 2: TestAgentToken
    address constant TOKEN_2 = 0x23dE240E5B5a09a5755d805044587F2Ef65c06cE;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address trader = vm.addr(pk);

        console2.log("Trader:", trader);
        console2.log("Balance:", trader.balance / 1e18, "ETH");

        vm.startBroadcast(pk);

        // Deploy router
        TestSwapRouter router = new TestSwapRouter(IPoolManager(POOL_MANAGER));
        console2.log("Router deployed:", address(router));

        // Make swaps on Token 2 only (most recently deployed)
        console2.log("");
        console2.log("=== Making swaps on Token 2 (TEST) ===");
        makeSwapsOnToken(router, TOKEN_2);

        vm.stopBroadcast();

        console2.log("");
        console2.log("All test swaps completed!");
    }

    function makeSwapsOnToken(TestSwapRouter router, address token) internal {
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)), // ETH
            currency1: Currency.wrap(token),
            fee: 0,
            tickSpacing: 60,
            hooks: IHooks(HOOK)
        });

        // 5 buys
        for (uint i = 0; i < 5; i++) {
            uint256 amountIn = 0.01 ether; // Buy with 0.01 ETH each
            console2.log("Making buy swap...");
            
            router.buy{value: amountIn}(key, amountIn);
        }

        // 3 sells (keep some tokens)
        for (uint i = 0; i < 3; i++) {
            // Sell ~20% of what we bought
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            uint256 amountToSell = tokenBalance / 5;
            
            if (amountToSell > 0) {
                console2.log("Making sell swap...");
                
                // Approve router
                IERC20(token).approve(address(router), amountToSell);
                
                router.sell(key, amountToSell);
            }
        }
    }
}
