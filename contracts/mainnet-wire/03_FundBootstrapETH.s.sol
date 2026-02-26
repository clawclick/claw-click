// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/utils/BootstrapETH.sol";

/**
 * @title 03_FundBootstrapETH
 * @notice Fund BootstrapETH contract (Step 3 of mainnet wiring - OPTIONAL)
 * 
 * @dev Can be done anytime - not required before ownership transfer
 * 
 * WHAT IT DOES:
 * - Sends ETH to BootstrapETH contract
 * - Enables free bootstrap launches for first-time creators
 * - Amount: BOOTSTRAP_FUNDING_AMOUNT (set in .env, recommended: 10+ ETH)
 * 
 * FUNDING MATH:
 * - Each free launch costs: MIN_BOOTSTRAP_ETH (typically 0.2 ETH)
 * - 10 ETH = 50 free launches
 * - 50 ETH = 250 free launches
 * - Can be refilled anytime by sending ETH directly to contract
 * 
 * REQUIREMENTS:
 * - DEPLOYER_PRIVATE_KEY (any address with ETH can fund)
 * - BOOTSTRAP_ETH_ADDRESS (from deployment)
 * - BOOTSTRAP_FUNDING_AMOUNT (ETH to send, e.g., 10 ether)
 * 
 * USAGE:
 * forge script mainnet-wire/03_FundBootstrapETH.s.sol \
 *   --rpc-url $BASE_MAINNET_RPC_URL \
 *   --broadcast \
 *   --legacy
 * 
 * ALTERNATIVE:
 * Send ETH directly via cast:
 * cast send $BOOTSTRAP_ETH_ADDRESS --value 10ether --private-key $DEPLOYER_PRIVATE_KEY
 */
contract FundBootstrapETH is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("MAINNET_DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);
        
        address bootstrapETHAddress = vm.envAddress("BOOTSTRAP_ETH_ADDRESS");
        uint256 fundingAmount = vm.envUint("BOOTSTRAP_FUNDING_AMOUNT"); // in wei

        console2.log("=== FUNDING BOOTSTRAP ETH ===");
        console2.log("Funder:", deployer);
        console2.log("BootstrapETH:", bootstrapETHAddress);
        console2.log("Funding Amount:", fundingAmount / 1 ether, "ETH");
        console2.log("");

        BootstrapETH bootstrapETH = BootstrapETH(payable(bootstrapETHAddress));

        // Check current state
        console2.log("Current BootstrapETH State:");
        console2.log("  Balance:", bootstrapETH.getBalance() / 1 ether, "ETH");
        console2.log("  Daily Limit:", bootstrapETH.DAILY_LAUNCH_LIMIT());
        console2.log("  Remaining Today:", bootstrapETH.getRemainingLaunches());
        console2.log("");

        uint256 newBalance = bootstrapETH.getBalance() + fundingAmount;
        console2.log("After funding:");
        console2.log("  New Balance:", newBalance / 1 ether, "ETH");
        console2.log("  Estimated Free Launches:", newBalance / 200000000000000000); // Assuming 0.2 ETH per launch
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Send ETH to BootstrapETH contract
        (bool success,) = bootstrapETHAddress.call{value: fundingAmount}("");
        require(success, "ETH transfer failed");

        vm.stopBroadcast();

        console2.log("=== BOOTSTRAP ETH FUNDED ===");
        console2.log("");
        console2.log("Verifying...");
        console2.log("New Balance:", bootstrapETH.getBalance() / 1 ether, "ETH");
        
        require(bootstrapETH.getBalance() >= fundingAmount, "Funding failed");
        
        console2.log("");
        console2.log("✅ BootstrapETH successfully funded!");
        console2.log("✅ Free launches enabled for first-time creators");
        console2.log("");
        console2.log("📊 Stats:");
        console2.log("   Total Balance:", bootstrapETH.getBalance() / 1 ether, "ETH");
        console2.log("   Estimated Free Launches:", bootstrapETH.getBalance() / 200000000000000000);
        console2.log("   Daily Limit:", bootstrapETH.DAILY_LAUNCH_LIMIT());
    }
}
