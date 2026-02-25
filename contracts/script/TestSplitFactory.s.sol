// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactoryCore.sol";
import "../src/core/ClawclickHook_V4.sol";

contract TestSplitFactory is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        ClawclickFactoryCore factory = ClawclickFactoryCore(payable(0x3dc8FDB524Abd9E89C9f67b0992060ca3f9436e8));
        ClawclickHook hook = ClawclickHook(payable(0x3C26aE16F7C62856F372cF152e2f252ab61Deac8));
        
        console2.log("========================================");
        console2.log("TESTING SPLIT FACTORY - DIRECT LAUNCH");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Test DIRECT launch
        ClawclickFactoryCore.FeeSplit memory emptyFeeSplit;
        emptyFeeSplit.count = 0;
        
        ClawclickFactoryCore.CreateParams memory directParams = ClawclickFactoryCore.CreateParams({
            name: "DirectTest",
            symbol: "DT",
            beneficiary: deployer,
            agentWallet: address(0),
            targetMcapETH: 3 ether,
            feeSplit: emptyFeeSplit,
            launchType: ClawclickFactoryCore.LaunchType.DIRECT
        });
        
        (address directToken, PoolId directPoolId) = factory.createLaunch{value: 0.001 ether}(directParams);
        
        console2.log("[OK] DIRECT launch created!");
        console2.log("Token:", directToken);
        
        // Verify
        ClawclickFactoryCore.LaunchInfo memory directInfo = factory.launchByPoolId(directPoolId);
        require(address(directInfo.poolKey.hooks) == address(0), "Hook should be address(0)");
        console2.log("[PASS] Hook = address(0)");
        
        require(directInfo.poolKey.fee == 100, "Fee should be 100");
        console2.log("[PASS] Pool fee = 1%");
        
        require(factory.isDirectLaunch(directPoolId), "Should be DIRECT");
        console2.log("[PASS] isDirectLaunch() = true");
        
        console2.log("");
        console2.log("=== Testing AGENT Launch ===");
        
        ClawclickFactoryCore.CreateParams memory agentParams = ClawclickFactoryCore.CreateParams({
            name: "AgentTest",
            symbol: "AT",
            beneficiary: deployer,
            agentWallet: address(0),
            targetMcapETH: 3 ether,
            feeSplit: emptyFeeSplit,
            launchType: ClawclickFactoryCore.LaunchType.AGENT
        });
        
        (address agentToken, PoolId agentPoolId) = factory.createLaunch{value: 0.001 ether}(agentParams);
        
        console2.log("[OK] AGENT launch created!");
        console2.log("Token:", agentToken);
        
        // Verify
        ClawclickFactoryCore.LaunchInfo memory agentInfo = factory.launchByPoolId(agentPoolId);
        require(address(agentInfo.poolKey.hooks) == address(hook), "Hook should be ClawclickHook");
        console2.log("[PASS] Hook = ClawclickHook");
        
        require(agentInfo.poolKey.fee == 0x800000, "Fee should be dynamic");
        console2.log("[PASS] Pool fee = dynamic");
        
        require(!factory.isDirectLaunch(agentPoolId), "Should be AGENT");
        console2.log("[PASS] isDirectLaunch() = false");
        
        uint256 epoch = hook.getCurrentEpoch(agentPoolId);
        console2.log("Hook epoch:", epoch);
        require(epoch == 1, "Should start at epoch 1");
        console2.log("[PASS] Hook registered - epoch 1");
        
        vm.stopBroadcast();

        console2.log("");
        console2.log("========================================");
        console2.log("ALL TESTS PASSED!");
        console2.log("========================================");
        console2.log("DIRECT Token:", directToken);
        console2.log("AGENT Token:", agentToken);
    }
}
