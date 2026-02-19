// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickHook_V4.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

/**
 * @title NewToken
 * @notice Creates a new token launch through the existing factory and activates with 0.1 ETH
 *
 *  Usage:
 *    cd contracts && forge script script/05_NewToken.s.sol \
 *      --rpc-url https://ethereum-sepolia-rpc.publicnode.com --broadcast --via-ir -vvv
 */
contract NewToken is Script {
    using PoolIdLibrary for PoolKey;

    // Existing deployed contracts on Sepolia (latest DeployAndActivate)
    address constant FACTORY = 0x6658702F5070fF4a0f6C4507101EA485839511bb;
    address constant HOOK    = 0x9d5427a454Be43eF29343CBB6F51040C25262AC8;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("Deployer:", deployer);
        console2.log("Balance :", deployer.balance);

        ClawclickFactory factory = ClawclickFactory(payable(FACTORY));

        vm.startBroadcast(pk);

        // 1. Create launch (1 ETH target MCAP, micro tier)
        uint256 fee = factory.getFee(false);
        console2.log("Launch fee:", fee);

        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({
                name: "GradTestWideLP",
                symbol: "GTWLP",
                beneficiary: deployer,
                agentWallet: deployer,
                isPremium: false,
                targetMcapETH: 1 ether
            })
        );

        console2.log("Token deployed:", token);

        // 2. Build pool key
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: 0x800000,
            tickSpacing: 200,
            hooks: IHooks(HOOK)
        });

        // 3. Activate pool with 1 ETH
        factory.activatePool{value: .1 ether}(key);

        vm.stopBroadcast();

        // Print results
        console2.log("");
        console2.log("=== NEW TOKEN DEPLOYED ===");
        console2.log("TOKEN:", token);
        console2.log("POOL_ID:");
        console2.logBytes32(PoolId.unwrap(poolId));
        console2.log("ACTIVATION_ETH: 1 ether");
        console2.log("==========================");
    }
}
