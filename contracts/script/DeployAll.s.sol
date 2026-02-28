// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickConfig.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/utils/BootstrapETH.sol";

/**
 * @title DeployAll
 * @notice Deploy all claw.click contracts to Base mainnet in correct order
 * @dev Run: forge script script/DeployAll.s.sol --rpc-url base --broadcast --verify
 */
contract DeployAll is Script {
    // Uniswap V4 addresses on Base mainnet
    address constant POOL_MANAGER = 0x498581fF718922c3f8e6A244956aF099B2652b2b;
    address constant POSITION_MANAGER = 0x7C5f5A4bBd8fD63184577525326123B519429bDc;
    
    // Treasury for fees
    address constant TREASURY = 0xFf7549B06E68186C91a6737bc0f0CDE1245e349b;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("MAINNET_DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);
        
        console2.log("====================================");
        console2.log("DEPLOYING CLAW.CLICK TO BASE MAINNET");
        console2.log("====================================");
        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);
        console2.log("Treasury:", TREASURY);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy Config
        console2.log("[1/5] Deploying ClawclickConfig...");
        ClawclickConfig config = new ClawclickConfig(TREASURY, deployer);
        console2.log("  Config:", address(config));

        // Step 2: Deploy Hook (using CREATE2 for deterministic address if needed)
        console2.log("[2/5] Deploying ClawclickHook...");
        ClawclickHook hook = new ClawclickHook{salt: bytes32(uint256(0x241d))}(
            IPoolManager(POOL_MANAGER),
            config
        );
        console2.log("  Hook:", address(hook));

        // Step 3: Deploy Factory (temporary BootstrapETH address = address(0))
        console2.log("[3/4] Deploying ClawclickFactory...");
        ClawclickFactory factory = new ClawclickFactory{salt: bytes32(uint256(0x01))}(
            config,
            IPoolManager(POOL_MANAGER),
            hook,
            POSITION_MANAGER,
            BootstrapETH(payable(address(0))), // Bootstrap feature disabled initially
            deployer
        );
        console2.log("  Factory:", address(factory));

        // Step 4: Deploy BootstrapETH (needs factory address)
        console2.log("[4/4] Deploying BootstrapETH...");
        BootstrapETH bootstrapETH = new BootstrapETH(address(factory));
        console2.log("  BootstrapETH:", address(bootstrapETH));
        console2.log("");
        console2.log("NOTE: Factory deployed with bootstrapETH = address(0)");
        console2.log("      Users must pay bootstrap ETH directly for now.");
        console2.log("      To enable free bootstraps, redeploy Factory with bootstrapETH address.");

        vm.stopBroadcast();

        console2.log("");
        console2.log("====================================");
        console2.log("DEPLOYMENT COMPLETE!");
        console2.log("====================================");
        console2.log("Config:       ", address(config));
        console2.log("Hook:         ", address(hook));
        console2.log("Factory:      ", address(factory));
        console2.log("BootstrapETH: ", address(bootstrapETH));
        console2.log("====================================");
        console2.log("");
        console2.log("Next steps:");
        console2.log("1. Deploy AgentLaunchBundler (claws.fun/contracts)");
        console2.log("2. Update contract addresses in app/lib/contracts/index.ts");
        console2.log("3. Fund BootstrapETH with ~0.1 ETH for testing");
    }
}
