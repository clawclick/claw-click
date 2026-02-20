// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";

/**
 * @title SimpleLaunch
 * @notice Minimal script to launch token on Sepolia
 */
contract SimpleLaunch is Script {
    address constant FACTORY = 0x34E332124EC98B690DBAe922E662AebDc7692fC3;
    
    function run() external {
        ClawclickFactory factory = ClawclickFactory(payable(FACTORY));
        
        console2.log("=== LAUNCHING TOKEN ===");
        console2.log("Factory:", FACTORY);
        console2.log("Deployer:", msg.sender);
        
        // Bootstrap amount
        uint256 bootstrap = 0.001 ether;  // $2 at $2000/ETH
        console2.log("Bootstrap:", bootstrap);
        
        vm.startBroadcast();
        
        // Create launch
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test Token Alpha",
            symbol: "TTA",
            beneficiary: msg.sender,
            agentWallet: address(0),
            targetMcapETH: 1 ether,
            feeSplit: ClawclickFactory.FeeSplit({
                wallets: [address(0), address(0), address(0), address(0), address(0)],
                percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                count: 0
            })
        });
        
        (address token, ) = factory.createLaunch{value: bootstrap}(params);
        
        vm.stopBroadcast();
        
        console2.log("");
        console2.log("=== SUCCESS ===");
        console2.log("Token:", token);
        console2.log("");
        console2.log("View on explorer:");
        console2.log("https://sepolia.etherscan.io/address/", token);
    }
}
