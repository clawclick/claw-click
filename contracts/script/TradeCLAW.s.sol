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

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function allowance(address, address) external view returns (uint256);
}

contract TradeCLAW is Script {
    address constant POOL_SWAP_TEST = 0xCE03f9aeD760f3F5C471C1A76Ff4a8F84743b795;
    address constant TOKEN = 0x6cF9812A226e657210Cf6eF37839eE94347c9142; // CLAW
    
    uint160 constant MIN_SQRT_PRICE = 4295128740;
    uint160 constant MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970341;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console.log("=== TRADING CLAW TOKEN (IMMORTAL) ===\n");

        IPoolSwapTest.PoolKey memory poolKey = IPoolSwapTest.PoolKey({
            currency0: address(0), // ETH
            currency1: TOKEN,
            fee: 0x800000, // DYNAMIC FEE FLAG for AGENT launches!
            tickSpacing: 60, // AGENT uses 60, DIRECT uses 200!
            hooks: 0x64f7cC79F599efBc8e95978520c5092Ef8DE2AC8
        });

        vm.startBroadcast(pk);

        // BUY
        console.log("=== BUY TEST ===");
        uint256 tokBalBefore = IERC20(TOKEN).balanceOf(deployer);
        console.log("Token balance before:", tokBalBefore / 1e18);

        console.log("Buying 0.002 ETH worth...");
        IPoolSwapTest(POOL_SWAP_TEST).swap{value: 0.002 ether}(
            poolKey,
            IPoolSwapTest.SwapParams({
                zeroForOne: true,
                amountSpecified: -2000000000000000, // -0.002 ETH
                sqrtPriceLimitX96: MIN_SQRT_PRICE
            }),
            IPoolSwapTest.TestSettings({
                takeClaims: false,
                settleUsingBurn: false
            }),
            ""
        );

        uint256 tokBalAfter = IERC20(TOKEN).balanceOf(deployer);
        console.log("Token balance after:", tokBalAfter / 1e18);
        console.log("Tokens received:", (tokBalAfter - tokBalBefore) / 1e18);
        console.log("BUY SUCCESS!\n");

        // SELL
        console.log("=== SELL TEST ===");
        uint256 sellAmount = tokBalAfter / 2; // Sell half
        console.log("Selling:", sellAmount / 1e18, "tokens");

        // Approve
        uint256 allowance = IERC20(TOKEN).allowance(deployer, POOL_SWAP_TEST);
        if (allowance < sellAmount) {
            console.log("Approving...");
            IERC20(TOKEN).approve(POOL_SWAP_TEST, type(uint256).max);
        }

        uint256 ethBalBefore = deployer.balance;
        
        IPoolSwapTest(POOL_SWAP_TEST).swap(
            poolKey,
            IPoolSwapTest.SwapParams({
                zeroForOne: false, // Token -> ETH
                amountSpecified: -int256(sellAmount),
                sqrtPriceLimitX96: MAX_SQRT_PRICE
            }),
            IPoolSwapTest.TestSettings({
                takeClaims: false,
                settleUsingBurn: false
            }),
            ""
        );

        uint256 ethBalAfter = deployer.balance;
        console.log("ETH received:", (ethBalAfter - ethBalBefore) / 1e18);
        console.log("SELL SUCCESS!\n");

        vm.stopBroadcast();

        console.log("=== CLAW TRADING COMPLETE ===");
        console.log("Final token balance:", IERC20(TOKEN).balanceOf(deployer) / 1e18);
    }
}
