// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IClawclickFactory} from "../src/interfaces/IClawclickFactory.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";

contract DeployRealToken is Script {
    using PoolIdLibrary for PoolId;
    
    address constant FACTORY = 0x488626C043513F3ad48d1437bd0b04FB040947C5;
    
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        
        console2.log("Deployer:", deployer);
        console2.log("Balance:", deployer.balance);
        
        vm.startBroadcast(pk);
        
        IClawclickFactory factory = IClawclickFactory(FACTORY);
        
        uint16[5] memory percentages;
        address[5] memory wallets;
        
        IClawclickFactory.CreateParams memory params = IClawclickFactory.CreateParams({
            name: "Real Sepolia Test",
            symbol: "RTEST",
            beneficiary: deployer,
            agentWallet: address(0),
            targetMcapETH: 3 ether,
            feeSplit: IClawclickFactory.FeeSplit({
                wallets: wallets,
                percentages: percentages,
                count: 0
            }),
            launchType: IClawclickFactory.LaunchType.DIRECT
        });
        
        (address token, PoolId poolId) = factory.createLaunch{value: 0.001 ether}(params);
        
        console2.log("Token:", token);
        console2.log("PoolId:");
        console2.logBytes32(PoolId.unwrap(poolId));
        
        vm.stopBroadcast();
    }
}
