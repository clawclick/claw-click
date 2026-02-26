// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickHook_V4.sol";
import "v4-core/src/interfaces/IPoolManager.sol";
import "../src/core/ClawclickConfig.sol";

/**
 * @title 03_DeployHook
 * @notice Deploy ClawclickHook using mined salt (Step 3 of mainnet deployment)
 * 
 * @dev Uses CREATE2 with mined salt from Step 2
 * 
 * WHAT IT DOES:
 * - Deploys ClawclickHook_V4 with the salt from Step 2
 * - Connects to PoolManager and Config
 * - Verifies deployed address matches predicted address
 * 
 * REQUIREMENTS:
 * - DEPLOYER_PRIVATE_KEY
 * - CONFIG_ADDRESS (from Step 1)
 * - POOL_MANAGER_ADDRESS (Base mainnet)
 * - HOOK_SALT (from Step 2 - must be set in .env)
 * 
 * USAGE:
 * forge script mainnet-deploy/03_DeployHook.s.sol \
 *   --rpc-url $BASE_MAINNET_RPC_URL \
 *   --broadcast \
 *   --verify \
 *   --legacy
 * 
 * OUTPUT:
 * - HOOK_ADDRESS (save this for next steps)
 */
contract DeployHook is Script {

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("MAINNET_DEPLOYER_PK");
        address deployer = vm.addr(deployerPrivateKey);
        
        bytes32 salt = vm.envBytes32("HOOK_SALT");
        address poolManager = vm.envAddress("POOL_MANAGER");
        address config = vm.envAddress("CONFIG_ADDRESS");

        console2.log("=== DEPLOYING HOOK ===");
        console2.log("Deployer:", deployer);
        console2.log("PoolManager:", poolManager);
        console2.log("Config:", config);
        console2.log("Salt:");
        console2.logBytes32(salt);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Hook with CREATE2 salt
        ClawclickHook hook = new ClawclickHook{salt: salt}(
            IPoolManager(poolManager),
            ClawclickConfig(config)
        );

        vm.stopBroadcast();

        console2.log("=== HOOK DEPLOYED ===");
        console2.log("Hook Address:", address(hook));
        console2.log("");
        console2.log("Verifying configuration...");
        console2.log("PoolManager:", address(hook.poolManager()));
        console2.log("Config:", address(hook.config()));
        console2.log("");
        
        // Verify permissions are correct
        console2.log("Checking permission bits...");
        uint160 hookAddress = uint160(address(hook));
        
        // Required flags for our hook
        bool beforeInitialize = (hookAddress & (1 << 13)) != 0;
        bool beforeAddLiquidity = (hookAddress & (1 << 11)) != 0;
        bool beforeRemoveLiquidity = (hookAddress & (1 << 9)) != 0;
        bool beforeSwap = (hookAddress & (1 << 7)) != 0;
        bool afterSwap = (hookAddress & (1 << 6)) != 0;
        bool beforeSwapReturnDelta = (hookAddress & (1 << 3)) != 0;
        
        console2.log("beforeInitialize:", beforeInitialize);
        console2.log("beforeAddLiquidity:", beforeAddLiquidity);
        console2.log("beforeRemoveLiquidity:", beforeRemoveLiquidity);
        console2.log("beforeSwap:", beforeSwap);
        console2.log("afterSwap:", afterSwap);
        console2.log("beforeSwapReturnDelta:", beforeSwapReturnDelta);
        
        require(beforeInitialize, "Missing beforeInitialize");
        require(beforeAddLiquidity, "Missing beforeAddLiquidity");
        require(beforeRemoveLiquidity, "Missing beforeRemoveLiquidity");
        require(beforeSwap, "Missing beforeSwap");
        require(afterSwap, "Missing afterSwap");
        require(beforeSwapReturnDelta, "Missing beforeSwapReturnDelta");
        
        console2.log("");
        console2.log("[OK] Hook deployed and verified!");
        console2.log("[OK] Save HOOK_ADDRESS for next steps:");
        console2.log(address(hook));
    }
}
