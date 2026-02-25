// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

contract GenerateFundWallets is Script {
    address constant SETUP_WALLET = 0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7;
    uint256 constant TOTAL_WALLETS = 24;
    uint256 constant FUNDING_PER_WALLET = 0.0304 ether;
    string constant MNEMONIC = "test test test test test test test test test test test junk";
    
    struct WalletInfo {
        uint256 index;
        address addr;
        uint256 privateKey;
        uint256 fundingAmount;
    }
    
    function run() external {
        uint256 deployerKey = vm.envUint("TESTING_DEV_WALLET_PK");
        require(deployerKey != 0, "TESTING_DEV_WALLET_PK not set");
        
        console2.log("=== Generate & Fund 24 Wallets ===");
        console2.log("Funding per wallet:", FUNDING_PER_WALLET);
        
        WalletInfo[] memory wallets = new WalletInfo[](TOTAL_WALLETS);
        uint256 totalFunding = 0;
        
        for (uint256 i = 0; i < TOTAL_WALLETS; i++) {
            uint256 privateKey = vm.deriveKey(MNEMONIC, uint32(i));
            address walletAddr = vm.addr(privateKey);
            
            wallets[i] = WalletInfo({
                index: i + 1,
                addr: walletAddr,
                privateKey: privateKey,
                fundingAmount: FUNDING_PER_WALLET
            });
            
            totalFunding += FUNDING_PER_WALLET;
            console2.log("Wallet", i + 1, ":", walletAddr);
        }
        
        console2.log("\nTotal funding needed:", totalFunding);
        console2.log("Setup wallet balance:", SETUP_WALLET.balance);
        
        vm.startBroadcast(deployerKey);
        
        for (uint256 i = 0; i < TOTAL_WALLETS; i++) {
            (bool success,) = wallets[i].addr.call{value: FUNDING_PER_WALLET}("");
            require(success, "Funding failed");
            console2.log("Funded wallet", i + 1);
        }
        
        vm.stopBroadcast();
        
        console2.log("\n=== FUNDING COMPLETE ===");
        console2.log("Total distributed:", totalFunding);
    }
}
