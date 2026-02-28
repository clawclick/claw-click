// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface IPoolSwapTest {
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

    function swap(
        PoolKey memory key,
        SwapParams memory params,
        TestSettings memory testSettings,
        bytes memory hookData
    ) external payable returns (int256 delta);
}

interface IFactory {
    struct PoolKey {
        address currency0;
        address currency1;
        uint24 fee;
        int24 tickSpacing;
        address hooks;
    }

    struct LaunchInfo {
        address token;
        address beneficiary;
        address agentWallet;
        address creator;
        bytes32 poolId;
        PoolKey poolKey;
        uint256 targetMcapETH;
        uint256 createdAt;
        uint256 createdBlock;
        string name;
        string symbol;
        address feeSplitDummy1;
        uint8 launchType;
    }

    function launchByToken(address token) external view returns (LaunchInfo memory);
}

interface IERC20 {
    function balanceOf(address) external view returns (uint256);
    function approve(address, uint256) external returns (bool);
    function allowance(address, address) external view returns (uint256);
}

contract TestTradeCLAW is Script {
    address constant FACTORY = 0xcBcbCC12664F3eE4D20b3F49554BBE55fD7d9746;
    address constant POOL_SWAP_TEST = 0xCE03f9aeD760f3F5C471C1A76Ff4a8F84743b795; // Sepolia
    address constant TOKEN = 0x6cF9812A226e657210Cf6eF37839eE94347c9142; // CLAW (Immortal)

    uint160 constant MIN_SQRT_PRICE = 4295128740;
    uint160 constant MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970341;

    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);

        console.log("Testing trades on CLAW token (Immortal)...");
        console.log("Deployer:", deployer);
        console.log("Token:", TOKEN);
        console.log("");

        // Get pool key from Factory
        IFactory.LaunchInfo memory launch = IFactory(FACTORY).launchByToken(TOKEN);
        
        console.log("Pool Key:");
        console.log("  currency0:", launch.poolKey.currency0);
        console.log("  currency1:", launch.poolKey.currency1);
        console.log("  fee:", launch.poolKey.fee);
        console.log("  tickSpacing:", vm.toString(launch.poolKey.tickSpacing));
        console.log("  hooks:", launch.poolKey.hooks);
        console.log("  launchType:", launch.launchType, "(1 = AGENT)");
        console.log("");

        IPoolSwapTest.PoolKey memory poolKey = IPoolSwapTest.PoolKey({
            currency0: launch.poolKey.currency0,
            currency1: launch.poolKey.currency1,
            fee: launch.poolKey.fee,
            tickSpacing: launch.poolKey.tickSpacing,
            hooks: launch.poolKey.hooks
        });

        vm.startBroadcast(deployerPk);

        // ========================================
        // TEST 1: BUY 0.001 ETH worth of tokens
        // ========================================
        console.log("=== TEST 1: BUY (ETH -> Token) ===");
        uint256 buyAmount = 0.001 ether;
        console.log("Buying with:", buyAmount / 1e18, "ETH");

        uint256 tokenBalanceBefore = IERC20(TOKEN).balanceOf(deployer);
        console.log("Token balance before:", tokenBalanceBefore / 1e18);

        try IPoolSwapTest(POOL_SWAP_TEST).swap{value: buyAmount}(
            poolKey,
            IPoolSwapTest.SwapParams({
                zeroForOne: true, // ETH -> Token
                amountSpecified: -int256(buyAmount), // Exact input
                sqrtPriceLimitX96: MIN_SQRT_PRICE
            }),
            IPoolSwapTest.TestSettings({
                takeClaims: false,
                settleUsingBurn: false
            }),
            ""
        ) {
            console.log("Buy successful!");
            
            uint256 tokenBalanceAfter = IERC20(TOKEN).balanceOf(deployer);
            console.log("Token balance after:", tokenBalanceAfter / 1e18);
            console.log("Tokens received:", (tokenBalanceAfter - tokenBalanceBefore) / 1e18);
        } catch Error(string memory reason) {
            console.log("Buy failed:", reason);
        } catch {
            console.log("Buy failed: Unknown error");
        }

        console.log("");

        // ========================================
        // TEST 2: SELL half of tokens back
        // ========================================
        console.log("=== TEST 2: SELL (Token -> ETH) ===");
        
        uint256 currentBalance = IERC20(TOKEN).balanceOf(deployer);
        if (currentBalance == 0) {
            console.log("No tokens to sell. Skipping sell test.");
        } else {
            uint256 sellAmount = currentBalance / 2; // Sell half
            console.log("Selling:", sellAmount / 1e18, "tokens");

            // Check allowance
            uint256 allowance = IERC20(TOKEN).allowance(deployer, POOL_SWAP_TEST);
            if (allowance < sellAmount) {
                console.log("Approving tokens to PoolSwapTest...");
                IERC20(TOKEN).approve(POOL_SWAP_TEST, type(uint256).max);
                console.log("Approved!");
            }

            uint256 ethBalanceBefore = deployer.balance;
            console.log("ETH balance before:", ethBalanceBefore / 1e18);

            try IPoolSwapTest(POOL_SWAP_TEST).swap(
                poolKey,
                IPoolSwapTest.SwapParams({
                    zeroForOne: false, // Token -> ETH
                    amountSpecified: -int256(sellAmount), // Exact input
                    sqrtPriceLimitX96: MAX_SQRT_PRICE
                }),
                IPoolSwapTest.TestSettings({
                    takeClaims: false,
                    settleUsingBurn: false
                }),
                ""
            ) {
                console.log("Sell successful!");
                
                uint256 ethBalanceAfter = deployer.balance;
                console.log("ETH balance after:", ethBalanceAfter / 1e18);
                console.log("ETH received:", (ethBalanceAfter - ethBalanceBefore) / 1e18);
            } catch Error(string memory reason) {
                console.log("Sell failed:", reason);
            } catch {
                console.log("Sell failed: Unknown error");
            }
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== CLAW (IMMORTAL) TRADING COMPLETE ===");
    }
}
