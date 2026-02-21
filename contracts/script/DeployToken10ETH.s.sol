// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactory.sol";

/**
 * @title DeployToken10ETH
 * @notice Deploy token at 10 ETH MCAP for proper testing (1% = $200 limits)
 */
contract DeployToken10ETH is Script {
    address constant FACTORY = 0x5C92E6f1Add9a2113C6977DfF15699e948e017Db;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("Deployer:", deployer);
        console2.log("Balance :", deployer.balance / 1e18, "ETH");

        vm.startBroadcast(pk);

        ClawclickFactory factory = ClawclickFactory(payable(FACTORY));

        // Deploy at 10 ETH MCAP (1% = $200 limits instead of $2)
        (address token, PoolId poolId) = factory.createLaunch{value: 0.001 ether}(
            ClawclickFactory.CreateParams({
                name: "ProperTestToken",
                symbol: "PTT",
                beneficiary: deployer,
                agentWallet: deployer,
                targetMcapETH: 10 ether,  // 10 ETH = $20k MCAP at $2k/ETH
                feeSplit: ClawclickFactory.FeeSplit(
                    [address(0),address(0),address(0),address(0),address(0)],
                    [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)],
                    0
                )
            })
        );

        vm.stopBroadcast();

        console2.log("");
        console2.log("=== TOKEN DEPLOYED (10 ETH MCAP) ===");
        console2.log("Token:", token);
        console2.log("Pool ID:");
        console2.logBytes32(PoolId.unwrap(poolId));
        console2.log("Max TX: 1% = $200 (instead of $2!)");
        console2.log("=====================================");
    }
}
