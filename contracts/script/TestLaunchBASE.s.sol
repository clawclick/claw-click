// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";

contract TestLaunchBASE is Script {
    address constant FACTORY = 0xF5979D0fEEd05CEcb94cf62B76FE7E9aB40c6b4a;
    
    function run() external {
        uint256 privateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(privateKey);
        
        console.log("=== DEPLOYING TEST TOKEN ON BASE ===\n");
        console.log("Factory:", FACTORY);
        console.log("Deployer:", deployer);
        console.log("Balance:", address(deployer).balance);
        
        vm.startBroadcast(privateKey);
        
        // Launch AGENT token (with Hook - proper testing)
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Base Test Agent",
            symbol: "BTEST",
            beneficiary: deployer,
            agentWallet: deployer,
            targetMcapETH: 1 ether, // 1 ETH starting MCAP
            feeSplit: ClawclickFactory.FeeSplit({
                wallets: [address(0), address(0), address(0), address(0), address(0)],
                percentages: [uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)],
                count: 0
            }),
            launchType: ClawclickFactory.LaunchType.AGENT
        });
        
        (address token, PoolId poolId) = ClawclickFactory(payable(FACTORY)).createLaunch{value: 0.001 ether}(params);
        
        console.log("\n=== LAUNCH SUCCESS ===");
        console.log("Token:", token);
        console.log("\nTrade at: https://www.claw.click");
        
        vm.stopBroadcast();
    }
}
