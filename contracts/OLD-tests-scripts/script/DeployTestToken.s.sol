// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactory.sol";

/**
 * @title DeployTestToken
 * @notice Quick script to deploy a test token
 */
contract DeployTestToken is Script {
    address constant FACTORY = 0x5C92E6f1Add9a2113C6977DfF15699e948e017Db;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("Deployer:", deployer);
        console2.log("Balance :", deployer.balance);

        vm.startBroadcast(pk);

        ClawclickFactory factory = ClawclickFactory(payable(FACTORY));

        // Deploy test token
        (address token, PoolId poolId) = factory.createLaunch{value: 0.001 ether}(
            ClawclickFactory.CreateParams({
                name: "TestAgentToken",
                symbol: "TEST",
                beneficiary: deployer,
                agentWallet: deployer,
                targetMcapETH: 1 ether,
                feeSplit: ClawclickFactory.FeeSplit(
                    [address(0),address(0),address(0),address(0),address(0)],
                    [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)],
                    0
                )
            })
        );

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== TEST TOKEN DEPLOYED ===");
        console2.log("Token:", token);
        console2.log("Pool ID:");
        console2.logBytes32(PoolId.unwrap(poolId));
        console2.log("===========================");
    }
}
