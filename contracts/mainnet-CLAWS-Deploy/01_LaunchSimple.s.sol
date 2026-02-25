// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {ClawclickToken} from "../src/core/ClawclickToken.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";

contract LaunchSimple is Script {
    address constant FACTORY = 0xAB936490488A16e134c531c30B6866D009a8dF2e;
    
    address constant SETUP_WALLET = 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7;
    address constant SAFE = 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b;
    address constant KNIGHTLY = 0xB11592b5B690F41162176603726BB6c5a8904d03;
    address constant CREATOR_WALLET = 0x96ABf8FAc2a5268b72aC45539cFf04Bfc156D079;
    
    uint256 constant TARGET_MCAP = 3 ether;
    
    function run() external {
        uint256 deployerKey = vm.envUint("TESTING_DEV_WALLET_PK");
        require(deployerKey != 0, "TESTING_DEV_WALLET_PK not set");
        
        ClawclickFactory factory = ClawclickFactory(payable(FACTORY));
        
        vm.startBroadcast(deployerKey);
        
        console2.log("=== CLAWS LAUNCH ===");
        console2.log("Setup wallet:", SETUP_WALLET);
        console2.log("Target MCAP:", TARGET_MCAP);
        
        // Prepare fee split
        address[5] memory wallets;
        wallets[0] = SAFE;
        wallets[1] = KNIGHTLY;
        wallets[2] = CREATOR_WALLET;
        
        uint16[5] memory percentages;
        percentages[0] = 5000;  // 50%
        percentages[1] = 2500;  // 25%
        percentages[2] = 2500;  // 25%
        
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
        (address tokenAddress, PoolId poolId) = factory.createLaunch{value: 0.01 ether}(params);
        ClawclickToken token = ClawclickToken(tokenAddress);
        
        console2.log("Token deployed:", tokenAddress);
        console2.log("Name:", token.name());
        console2.log("Symbol:", token.symbol());
        console2.log("Total supply:", token.totalSupply());
        console2.log("PoolId:", uint256(PoolId.unwrap(poolId)));
        
        console2.log("\n=== FEE SPLIT CONFIGURED ===");
        console2.log("Safe (50%):", SAFE);
        console2.log("Knightly (25%):", KNIGHTLY);
        console2.log("Creator (25%):", CREATOR_WALLET);
        
        vm.stopBroadcast();
        
        console2.log("\n=== LAUNCH COMPLETE ===");
        console2.log("Token address:", tokenAddress);
        console2.log("\nNEXT STEPS:");
        console2.log("1. export TEST_TOKEN_ADDRESS=", tokenAddress);
        console2.log("2. Buy 0.75 ETH worth via Uniswap UI or cast");
        console2.log("3. Transfer bought tokens to Safe");
        console2.log("4. Run 02_GenerateFundWallets.s.sol");
    }
}
