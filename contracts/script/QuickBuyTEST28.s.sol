// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface IPoolSwapTest {
    function swap(
        PoolKey memory key,
        SwapParams memory params,
        TestSettings memory testSettings,
        bytes memory hookData
    ) external payable returns (int256 delta);

    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    struct SwapParams {
        bool zeroForOne;
        int256 amountSpecified;
        uint160 sqrtPriceLimitX96;
    }

    struct TestSettings {
        bool takeClaims;
        bool settleUsingBurn;
    }
}

interface IFactory {
    function launchByToken(address) external view returns (bytes memory);
}

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
}

contract QuickBuyTEST28 is Script {
    address constant POOL_SWAP_TEST = 0xCE03f9aeD760f3F5C471C1A76Ff4a8F84743b795;
    address constant TOKEN = 0xeBD74Cc601b0b94D2f5E6E19877a8ccf0a487320;
    
    uint160 constant MIN_SQRT_PRICE = 4295128740;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console.log("=== BUY TEST28 TOKEN ===");
        console.log("Buyer:", deployer);
        console.log("Token:", TOKEN);

        uint256 balBefore = IERC20(TOKEN).balanceOf(deployer);
        console.log("Token balance before:", balBefore / 1e18);

        // Hardcode pool key from launch
        IPoolSwapTest.PoolKey memory poolKey = IPoolSwapTest.PoolKey({
            currency0: address(0), // ETH
            currency1: TOKEN,
            fee: 10000, // 1%
            tickSpacing: 200,
            hooks: 0x64f7cC79F599efBc8e95978520c5092Ef8DE2AC8
        });

        vm.startBroadcast(pk);

        console.log("Buying 0.001 ETH worth...");
        
        IPoolSwapTest(POOL_SWAP_TEST).swap{value: 0.001 ether}(
            poolKey,
            IPoolSwapTest.SwapParams({
                zeroForOne: true,
                amountSpecified: -1000000000000000, // -0.001 ETH
                sqrtPriceLimitX96: MIN_SQRT_PRICE
            }),
            IPoolSwapTest.TestSettings({
                takeClaims: false,
                settleUsingBurn: false
            }),
            ""
        );

        vm.stopBroadcast();

        uint256 balAfter = IERC20(TOKEN).balanceOf(deployer);
        console.log("Token balance after:", balAfter / 1e18);
        console.log("Tokens received:", (balAfter - balBefore) / 1e18);
        console.log("\n=== BUY COMPLETE ===");
    }
}
