// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {ClawclickToken} from "../src/core/ClawclickToken.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {SwapHelper} from "./SwapHelper.sol";

contract LaunchTest is Script {
    using PoolIdLibrary for PoolKey;
    
    address constant FACTORY = 0xAB936490488A16e134c531c30B6866D009a8dF2e;
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    
    address constant SETUP_WALLET = 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7;
    address constant SAFE = 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b;
    address constant KNIGHTLY = 0xB11592b5B690F41162176603726BB6c5a8904d03;
    address constant CREATOR_WALLET = 0x96ABf8FAc2a5268b72aC45539cFf04Bfc156D079;
    
    uint256 constant TARGET_MCAP = 3 ether;
    uint256 constant DEV_BUY_AMOUNT = 0.75 ether;
    
    function run() external {
        uint256 deployerKey = vm.envUint("TESTING_DEV_WALLET_PK");
        require(deployerKey != 0, "TESTING_DEV_WALLET_PK not set");
        
        ClawclickFactory factory = ClawclickFactory(payable(FACTORY));
        
        vm.startBroadcast(deployerKey);
        
        console2.log("=== CLAWS LAUNCH: Phase 1 ===");
        console2.log("Setup wallet:", SETUP_WALLET);
        
        // Deploy SwapHelper
        SwapHelper swapHelper = new SwapHelper(POOL_MANAGER);
        console2.log("SwapHelper:", address(swapHelper));
        
        // Prepare fee split (fixed size arrays)
        address[5] memory wallets;
        wallets[0] = SAFE;
        wallets[1] = KNIGHTLY;
        wallets[2] = CREATOR_WALLET;
        
        uint16[5] memory percentages;
        percentages[0] = 5000;
        percentages[1] = 2500;
        percentages[2] = 2500;
        
        ClawclickFactory.FeeSplit memory feeSplit = ClawclickFactory.FeeSplit({
            wallets: wallets,
            percentages: percentages,
            count: 3
        });
        
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "CLAWS",
            symbol: "CLAWS",
            beneficiary: SAFE,
            agentWallet: SETUP_WALLET,
            targetMcapETH: TARGET_MCAP,
            feeSplit: feeSplit
        });
        
        console2.log("\nLaunching token...");
        (address tokenAddress, PoolId poolId) = factory.createLaunch(params);
        ClawclickToken token = ClawclickToken(tokenAddress);
        
        console2.log("Token:", tokenAddress);
        console2.log("PoolId:", uint256(PoolId.unwrap(poolId)));
        
        ClawclickFactory.LaunchInfo memory info = factory.launchByToken(tokenAddress);
        PoolKey memory poolKey = info.poolKey;
        
        console2.log("\nDev buy (0.75 ETH)...");
        uint256 balanceBefore = token.balanceOf(SETUP_WALLET);
        
        uint256 bought = swapHelper.swapETHForTokens{value: DEV_BUY_AMOUNT}(poolKey, DEV_BUY_AMOUNT);
        
        uint256 balanceAfter = token.balanceOf(SETUP_WALLET);
        console2.log("Tokens bought:", bought);
        console2.log("Balance:", balanceAfter);
        
        console2.log("\nTransferring to Safe...");
        token.transfer(SAFE, balanceAfter);
        
        uint256 safeBalance = token.balanceOf(SAFE);
        console2.log("Safe balance:", safeBalance);
        
        vm.stopBroadcast();
        
        console2.log("\n=== DONE ===");
        console2.log("export TEST_TOKEN_ADDRESS=", tokenAddress);
    }
}
