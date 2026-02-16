// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactory.sol";

contract CreateLaunch is Script {

    function run() external {

        uint256 pk = vm.envUint("PRIVATE_KEY");
        address factoryAddr = vm.envAddress("FACTORY");

        vm.startBroadcast(pk);

        ClawclickFactory(factoryAddr).createLaunch{value: 0.0003 ether}(
            ClawclickFactory.CreateParams({
                name: "TEST",
                symbol: "TST",
                beneficiary: msg.sender,
                agentWallet: msg.sender,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );

        vm.stopBroadcast();

        console2.log("=== TOKEN CREATED ===");
    }
}