// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {ClawclickToken} from "../src/core/ClawclickToken.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

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
        TestSettings memory settings,
        bytes memory hookData
    ) external payable returns (int256, int256);
}

contract TradeViaFactory is Script {
    address constant FACTORY = 0xcBcbCC12664F3eE4D20b3F49554BBE55fD7d9746;
    address constant POOL_SWAP_TEST = 0xCE03f9aeD760f3F5C471C1A76Ff4a8F84743b795;
    address constant CLAW_TOKEN = 0x6cF9812A226e657210Cf6eF37839eE94347c9142;
    
    uint160 constant MIN_SQRT_PRICE = 4295128740; // MIN_SQRT_PRICE + 1
    uint160 constant MAX_SQRT_PRICE = 1461446703485210103287273052203988822378723970341; // MAX_SQRT_PRICE - 1

    function run() external {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(privateKey);
        
        console.log("=== TRADING CLAW VIA FACTORY POOLKEY ===\n");
        console.log("Factory:", FACTORY);
        console.log("Token:", CLAW_TOKEN);
        console.log("Trader:", deployer);
        
        // Get launch info from Factory
        ClawclickFactory factory = ClawclickFactory(payable(FACTORY));
        ClawclickFactory.LaunchInfo memory info = factory.launchByToken(CLAW_TOKEN);
        
        console.log("\n=== POOL KEY FROM FACTORY ===");
        console.log("Fee:", uint256(info.poolKey.fee));
        console.log("TickSpacing:", uint256(uint24(info.poolKey.tickSpacing)));
        
        vm.startBroadcast(privateKey);
        
        // BUY: 0.002 ETH → Tokens
        console.log("\n=== BUY TEST ===");
        uint256 buyAmount = 0.002 ether;
        console.log("Buying with ETH:", buyAmount);
        
        IPoolSwapTest.PoolKey memory poolKey = IPoolSwapTest.PoolKey({
            currency0: Currency.unwrap(info.poolKey.currency0),
            currency1: Currency.unwrap(info.poolKey.currency1),
            fee: info.poolKey.fee,
            tickSpacing: info.poolKey.tickSpacing,
            hooks: address(info.poolKey.hooks)
        });
        
        try IPoolSwapTest(POOL_SWAP_TEST).swap{value: buyAmount}(
            poolKey,
            IPoolSwapTest.SwapParams({
                zeroForOne: true,
                amountSpecified: -int256(buyAmount),
                sqrtPriceLimitX96: MIN_SQRT_PRICE
            }),
            IPoolSwapTest.TestSettings({
                takeClaims: false,
                settleUsingBurn: false
            }),
            ""
        ) {
            console.log("BUY SUCCESS!");
            uint256 tokenBalance = ClawclickToken(CLAW_TOKEN).balanceOf(deployer);
            console.log("Token balance after buy:", tokenBalance);
        } catch {
            console.log("BUY FAILED - checking details...");
            
            // Check pool exists
            console.log("\nDebugging info:");
            console.log("Launch type:", uint8(info.launchType));
            console.log("Created at:", info.createdAt);
        }
        
        vm.stopBroadcast();
    }
}
