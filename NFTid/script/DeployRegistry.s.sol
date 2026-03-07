// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../contracts/AgentNFTidRegistry.sol";

contract DeployRegistry is Script {
    address constant CLAWD_NFT = 0x6c4618080761925A6D92526c0AA443eF03a92C96;
    address constant BIRTH_CERTIFICATE = 0x4003CbFD62B0b4BAbBdad714e472fCb8D1f03132;

    function run() external {
        vm.startBroadcast();

        AgentNFTidRegistry registry = new AgentNFTidRegistry(
            CLAWD_NFT,
            BIRTH_CERTIFICATE
        );

        console.log("AgentNFTidRegistry deployed to:", address(registry));

        vm.stopBroadcast();
    }
}
