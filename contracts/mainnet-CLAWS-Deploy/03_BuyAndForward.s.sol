// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {ClawclickToken} from "../src/core/ClawclickToken.sol";
import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";
import {SwapHelper} from "./SwapHelper.sol";

/**
 * @title 03_BuyAndForward
 * @notice Sequential buys with 29 wallets + forward to cold storage
 * 
 * Phase 2 (Wallets 1-24): Push $9,375 -> $12,000
 *   - Buy: 0.0204 ETH per wallet
 *   - Tax: 40%, maxTx: 0.3%
 *   - Net: 4.2% supply
 * 
 * Phase 3 (Wallets 25-29): Above $12k
 *   - Buy: 0.052 ETH per wallet
 *   - Tax: 20%, maxTx: 0.6%
 *   - Net: 2.4% supply
 * 
 * Total: 21.6% supply controlled (15% Safe + 6.6% distributed)
 * Final MC: ~$13,500
 * 
 * Usage:
 *   export TEST_TOKEN_ADDRESS=0x...
 *   forge script mainnet-CLAWS-Deploy/03_BuyAndForward.s.sol:BuyAndForward \
 *     --rpc-url sepolia --broadcast -vvv
 */
contract BuyAndForward is Script {
    // Deployed contracts (Sepolia)
    address constant POOL_MANAGER = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant FACTORY = 0xAB936490488A16e134c531c30B6866D009a8dF2e;
    
    // Cold storage addresses (24 total - Phase 3 done manually)
    address[24] COLD_STORAGE = [
        0x27E030789043ef2Cf70F458018c85019b6A23399,
        0x12AfE6d1386e8a9c678EcD2498e084D5848686db,
        0x8299920cb9E3309Ff54153f98bE26A2D70f75e06,
        0x7FfB51DcE75e1E389Fd10a18b53F88DEC8349ee9,
        0xb7e57eB5cAF62b6175E36B3e637D5d0ef61a33c3,
        0x7573b935A8aaEAbE90557883400Ed703f588cfbB,
        0x1c42Cfad4DD004Af8D09c477274ff120Be591524,
        0xDab5b76aE9729Ece81634d352E6Cd40b2DB01842,
        0x9bbDcAd877E7B974a5266D8b29Cf48138231a65f,
        0xe3cE63F4E736FF8D36aa0A7C64307b17790238B2,
        0x8859Cd97D2953979BcCAEAde311A4f636b7901f7,
        0x70c4522Afdbd0c243d1906FAAE6B197c30f4534F,
        0x33f27Eb7282a432f892E70b04f76442CC364Ed7f,
        0x290FEded52A84ce5F704cA6e2480c94Ed58080A4,
        0xaf1edf3C7eFdA75D3C9973210043CC3FFb65a9aD,
        0xE7FC64b19C11f24CE1aF35BC83Ad2dD3A4070B74,
        0xa85Ea3ce7135F61E6e9b8Ccc7f24bb54C2861375,
        0xfDFfbF4b934A3868826AD86e9F3Fbe5e4B419A23,
        0x519679809164d7d5F9171405B562d4b8C67F9249,
        0xfA696e24Ffce748B30E26c3C047A0dC3FbeCe824,
        0xbE26eE9A06d36d50970106aA80E151118Ff0A169,
        0xfcddBFc144283B3aaA721Bc5f554e23226f481a2,
        0x49867915fBb071B4F7f5B50cfa7dF4B94EA15A40,
        0x97e92fBB0cBE1d497De769E229EBE7E4ab6BD3fD
    ];
    
    // Buy params
    uint256 constant PHASE2_WALLETS = 24;
    uint256 constant TOTAL_WALLETS = 24;  // Phase 3 done manually via Telegram bot
    
    uint256 constant PHASE2_BUY_AMOUNT = 0.0204 ether;  // $9,375 -> $12k
    uint256 constant PHASE3_BUY_AMOUNT = 0.052 ether;   // Above $12k
    
    uint256 constant DELAY_BETWEEN_BUYS = 3;      // 3 seconds
    uint256 constant MAX_RETRIES = 2;             // Retry 2x
    uint256 constant GAS_RESERVE = 0.003 ether;   // Keep for ETH transfer
    
    string constant MNEMONIC = "test test test test test test test test test test test junk";
    
    address public tokenAddress;
    PoolKey public poolKey;
    SwapHelper public swapHelper;
    
    struct BuyResult {
        bool success;
        uint256 tokensBought;
        uint256 attempt;
    }
    
    function run() external {
        // Get token address
        tokenAddress = vm.envAddress("TEST_TOKEN_ADDRESS");
        require(tokenAddress != address(0), "TEST_TOKEN_ADDRESS not set");
        
        ClawclickToken token = ClawclickToken(tokenAddress);
        ClawclickFactory factory = ClawclickFactory(payable(FACTORY));
        
        // Get pool key
        ClawclickFactory.LaunchInfo memory info = factory.launchByToken(tokenAddress);
        poolKey = info.poolKey;
        
        console2.log("=== CLAWS LAUNCH: Phase 2 & 3 - Sequential Buys ===");
        console2.log("Token:", tokenAddress);
        console2.log("Symbol:", token.symbol());
        console2.log("Total wallets:", TOTAL_WALLETS);
        
        uint256 deployerKey = vm.envUint("TESTING_DEV_WALLET_PK");
        
        // Deploy SwapHelper
        console2.log("\n=== Deploy SwapHelper ===");
        vm.startBroadcast(deployerKey);
        swapHelper = new SwapHelper(POOL_MANAGER);
        console2.log("SwapHelper deployed:", address(swapHelper));
        vm.stopBroadcast();
        
        // Phase 2: Wallets 1-24 (0.0204 ETH each)
        console2.log("\n=== PHASE 2: Push $9,375 -> $12,000 (Wallets 1-24) ===");
        console2.log("(Phase 3 will be done manually via Telegram bot)");
        processBuyPhase(0, TOTAL_WALLETS, PHASE2_BUY_AMOUNT, "Phase 2");
        
        // Forward remaining ETH
        console2.log("\n=== Forward Remaining ETH to Cold Storage ===");
        forwardRemainingETH();
        
        console2.log("\n=== ALL PHASES COMPLETE ===");
        console2.log("Total supply controlled: ~21.6%");
        console2.log("Estimated final MC: ~$13,500");
        console2.log("Next: Verify cold storage balances");
    }
    
    /**
     * @notice Process a phase of sequential buys
     */
    function processBuyPhase(
        uint256 startIndex,
        uint256 endIndex,
        uint256 buyAmount,
        string memory phaseName
    ) internal {
        ClawclickToken token = ClawclickToken(tokenAddress);
        
        for (uint256 i = startIndex; i < endIndex; i++) {
            uint256 walletIndex = i + 1;
            console2.log("\n--- ", phaseName, "Wallet", walletIndex, "of", TOTAL_WALLETS, "---");
            
            // Derive wallet
            uint256 privateKey = vm.deriveKey(MNEMONIC, uint32(i));
            address walletAddr = vm.addr(privateKey);
            address coldAddr = COLD_STORAGE[i];
            
            console2.log("Hot wallet:", walletAddr);
            console2.log("Cold wallet:", coldAddr);
            console2.log("Balance:", walletAddr.balance);
            console2.log("Buy amount:", buyAmount);
            
            // Execute buy with retry
            BuyResult memory result = executeBuyWithRetry(privateKey, walletAddr, buyAmount);
            
            if (result.success && result.tokensBought > 0) {
                console2.log("✅ Buy SUCCESS -", result.tokensBought, "tokens (attempt", result.attempt, ")");
                
                // Forward tokens to cold storage
                vm.broadcast(privateKey);
                bool transferSuccess = token.transfer(coldAddr, result.tokensBought);
                
                if (transferSuccess) {
                    console2.log("✅ Forwarded", result.tokensBought, "tokens to cold storage");
                } else {
                    console2.log("❌ Token transfer FAILED");
                }
            } else {
                console2.log("❌ Buy FAILED after", MAX_RETRIES + 1, "attempts - SKIPPING");
            }
            
            // Delay before next buy (except last wallet)
            if (i < endIndex - 1) {
                console2.log("⏳ Waiting", DELAY_BETWEEN_BUYS, "seconds...");
                vm.sleep(DELAY_BETWEEN_BUYS * 1000);
            }
        }
    }
    
    /**
     * @notice Execute buy with retry logic
     */
    function executeBuyWithRetry(
        uint256 privateKey,
        address walletAddr,
        uint256 amount
    ) internal returns (BuyResult memory result) {
        ClawclickToken token = ClawclickToken(tokenAddress);
        
        for (uint256 attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
            console2.log("  Attempt", attempt, "- Buying with", amount, "ETH...");
            
            uint256 balanceBefore = token.balanceOf(walletAddr);
            
            // Execute buy via SwapHelper
            bool buySuccess = executeBuy(privateKey, walletAddr, amount);
            
            if (buySuccess) {
                uint256 balanceAfter = token.balanceOf(walletAddr);
                uint256 tokensBought = balanceAfter - balanceBefore;
                
                if (tokensBought > 0) {
                    result.success = true;
                    result.tokensBought = tokensBought;
                    result.attempt = attempt;
                    return result;
                }
            }
            
            console2.log("  ❌ Attempt", attempt, "FAILED");
            
            // Retry delay (except last attempt)
            if (attempt <= MAX_RETRIES) {
                console2.log("  ⏳ Retrying in 1s...");
                vm.sleep(1000);
            }
        }
        
        result.success = false;
        result.attempt = MAX_RETRIES + 1;
        return result;
    }
    
    /**
     * @notice Execute single buy via SwapHelper
     */
    function executeBuy(
        uint256 privateKey,
        address walletAddr,
        uint256 amount
    ) internal returns (bool success) {
        try vm.broadcast(privateKey) {
            swapHelper.swapETHForTokens{value: amount}(poolKey, amount);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * @notice Forward remaining ETH to cold storage
     */
    function forwardRemainingETH() internal {
        for (uint256 i = 0; i < TOTAL_WALLETS; i++) {
            uint256 walletIndex = i + 1;
            
            uint256 privateKey = vm.deriveKey(MNEMONIC, uint32(i));
            address walletAddr = vm.addr(privateKey);
            address coldAddr = COLD_STORAGE[i];
            
            uint256 balance = walletAddr.balance;
            
            if (balance > GAS_RESERVE) {
                uint256 amountToSend = balance - GAS_RESERVE;
                
                console2.log("Wallet", walletIndex, ":", walletAddr);
                console2.log("  Balance:", balance, "- Sending:", amountToSend, "to", coldAddr);
                
                vm.broadcast(privateKey);
                (bool success,) = coldAddr.call{value: amountToSend}("");
                
                console2.log(success ? "  ✅ SUCCESS" : "  ❌ FAILED");
            } else {
                console2.log("Wallet", walletIndex, ": Balance too low (", balance, ") - Skipping");
            }
        }
    }
}
