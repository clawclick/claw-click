// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import "../test/TestSwapRouter.sol";

/**
 * @title QuickSwaps
 * @notice Execute 5 quick buys to populate stats (won't hit maxWallet)
 */
contract QuickSwaps is Script {
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant HOOK = 0xa2FF089271e4527025Ee614EB165368875A12AC8;
    address constant PTT_TOKEN = 0xa0111feeC482c66F810BB1a2Dd9643deBCe873CA;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");

        console2.log("=== EXECUTING 5 QUICK BUYS ===");

        vm.startBroadcast(pk);

        TestSwapRouter router = new TestSwapRouter(IPoolManager(POOL_MANAGER));

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(PTT_TOKEN),
            fee: 0x800000, // Dynamic fee - CRITICAL!
            tickSpacing: 60,
            hooks: IHooks(HOOK)
        });

        // 5 small buys (0.01 ETH each = $20, well under limits)
        router.buy{value: 0.01 ether}(key, 0.01 ether);
        console2.log("Swap 1/5 done");
        
        router.buy{value: 0.01 ether}(key, 0.01 ether);
        console2.log("Swap 2/5 done");
        
        router.buy{value: 0.01 ether}(key, 0.01 ether);
        console2.log("Swap 3/5 done");
        
        router.buy{value: 0.01 ether}(key, 0.01 ether);
        console2.log("Swap 4/5 done");
        
        router.buy{value: 0.01 ether}(key, 0.01 ether);
        console2.log("Swap 5/5 done");

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== COMPLETE ===");
        console2.log("Volume: 0.05 ETH ($100)");
        console2.log("Check https://www.claw.click/");
    }
}
