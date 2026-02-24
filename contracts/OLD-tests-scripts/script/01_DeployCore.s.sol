// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickConfig.sol";

contract DeployCore is Script {

    function run() external {

        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        address deployer = vm.addr(pk);

        vm.startBroadcast(pk);

        ClawclickConfig config = new ClawclickConfig(
            deployer, // treasury
            deployer  // owner
        );

        vm.stopBroadcast();

        console2.log("=== CONFIG DEPLOYED ===");
        console2.log("Config:", address(config));
    }
}

// forge script script/01_DeployCore.s.sol \
// --rpc-url $ALCHEMY_API_ETH_SEPOLIA \
// --broadcast
