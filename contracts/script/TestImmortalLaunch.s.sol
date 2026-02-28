// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";

interface ILaunchBundler {
    struct CreateParams {
        string name;
        string symbol;
        address beneficiary;
        address agentWallet;
        uint256 targetMcapETH;
        FeeSplit feeSplit;
        uint8 launchType;
    }

    struct FeeSplit {
        address[5] wallets;
        uint16[5] percentages;
        uint8 count;
    }

    function launchAndMint(
        CreateParams calldata params,
        address agentWallet,
        address creator,
        string calldata agentName,
        string calldata socialHandle,
        string calldata memoryCID,
        string calldata avatarCID,
        string calldata ensName
    ) external payable returns (address token, bytes32 poolId, uint256 nftId);
}

contract TestImmortalLaunch is Script {
    address constant BUNDLER = 0x8112c14406C0f38C56f13A709498ddEd446a5b7b;

    function run() external {
        uint256 deployerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPk);

        console.log("Launching immortal token on Sepolia...");
        console.log("Deployer:", deployer);

        ILaunchBundler.CreateParams memory params = ILaunchBundler.CreateParams({
            name: "OpenClaw Agent",
            symbol: "CLAW",
            beneficiary: deployer,
            agentWallet: deployer,
            targetMcapETH: 2 ether,
            feeSplit: ILaunchBundler.FeeSplit({
                wallets: [
                    address(0),
                    address(0),
                    address(0),
                    address(0),
                    address(0)
                ],
                percentages: [uint16(0), 0, 0, 0, 0],
                count: 0
            }),
            launchType: 1 // AGENT
        });

        vm.startBroadcast(deployerPk);

        (address token, bytes32 poolId, uint256 nftId) = ILaunchBundler(BUNDLER).launchAndMint{value: 0.006 ether}( // 0.005 immortalization + 0.001 bootstrap
            params,
            deployer,
            deployer,
            "OpenClaw Agent Feb28",
            "@openclaw_test",
            "QmTestMemory123",
            "QmTestAvatar456",
            ""
        );

        vm.stopBroadcast();

        console.log("\nImmortal Token Created!");
        console.log("Token:", token);
        console.log("Pool ID:", vm.toString(poolId));
        console.log("NFT ID:", nftId);
    }
}
