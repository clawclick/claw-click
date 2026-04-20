// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {ClawclickHook} from "../src/core/ClawclickHook_V4.sol";
import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {AgentLaunchBundler} from "../src/bundler/AgentLaunchBundler.sol";
import {ClawclickConfig} from "../src/core/ClawclickConfig.sol";
import {BootstrapETH} from "../src/utils/BootstrapETH.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";

contract Deploy_Salt424_Sepolia is Script {
    function run() external {
        vm.startBroadcast(0x0075f14030668b47b7f9d8b7a7fe173a96071129c9f0638aec02e74d4bcda65a);
        
        // Deploy hook with salt 424
        ClawclickHook hook = new ClawclickHook{salt: bytes32(uint256(424))}(
            IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543),
            ClawclickConfig(0xf01514F68Df33689046F6Dd4184edCaA54fF4492)
        );
        console2.log("Hook:", address(hook));
        console2.log("Permissions:", uint160(address(hook)) & 0x3FFF);
        
        // Deploy Factory
        ClawclickFactory factory = new ClawclickFactory(
            ClawclickConfig(0xf01514F68Df33689046F6Dd4184edCaA54fF4492),
            IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543),
            hook,
            0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4,
            BootstrapETH(payable(0xC52b027928AfAa54f1f0FeC0e4D7b6397026f660)),
            0x3472a51BAf1814B59bf7ac55C8CBA679189Bf0e7
        );
        console2.log("Factory:", address(factory));
        
        // Deploy Bundler
        AgentLaunchBundler bundler = new AgentLaunchBundler(
            address(factory),
            0xE13532b0bD16E87088383f9F909EaCB03009a2e9
        );
        console2.log("Bundler:", address(bundler));
        
        vm.stopBroadcast();
    }
}
