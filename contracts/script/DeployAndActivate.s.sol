// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/core/ClawclickConfig.sol";
import "../src/core/ClawclickHook_V4.sol";
import "../src/core/ClawclickFactory.sol";
import "../src/core/ClawclickToken.sol";
import "../src/utils/HookMiner.sol";
import "../src/utils/BootstrapETH.sol";
import "../test/TestSwapRouter.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";

/**
 * @title DeployAndActivate
 * @notice Deploys full Clawclick stack, creates launch, activates pool.
 *         Prints addresses for the Python buy-rotation script.
 *
 *  Usage:
 *    cd contracts && source ../.env && export $(grep -v '^#' ../.env | xargs)
 *    forge script script/DeployAndActivate.s.sol \
 *      --rpc-url $ETH_SEPOLIA_RPC_URL --broadcast --via-ir -vvv
 */
contract DeployAndActivate is Script {
    using PoolIdLibrary for PoolKey;

    address constant POOL_MANAGER     = 0xE03A1074c86CFeDd5C142C4F04F1a1536e203543;
    address constant POSITION_MANAGER = 0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("Deployer:", deployer);
        console2.log("Balance :", deployer.balance);

        vm.startBroadcast(pk);

        // 1. Config
        ClawclickConfig config = new ClawclickConfig(deployer, deployer);

        // 2. Hook (CREATE2 mined)
        Hooks.Permissions memory perms = Hooks.Permissions({
            beforeInitialize: true, afterInitialize: false,
            beforeAddLiquidity: true, afterAddLiquidity: false,
            beforeRemoveLiquidity: true, afterRemoveLiquidity: false,
            beforeSwap: true, afterSwap: true,
            beforeDonate: false, afterDonate: false,
            beforeSwapReturnDelta: true, afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false, afterRemoveLiquidityReturnDelta: false
        });
        uint160 flags = uint160(
            (perms.beforeInitialize ? 1 << 13 : 0) |
            (perms.beforeAddLiquidity ? 1 << 11 : 0) |
            (perms.beforeRemoveLiquidity ? 1 << 9 : 0) |
            (perms.beforeSwap ? 1 << 7 : 0) | (perms.afterSwap ? 1 << 6 : 0) |
            (perms.beforeSwapReturnDelta ? 1 << 3 : 0)
        );
        address create2 = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
        (address predicted, bytes32 salt) = HookMiner.find(
            create2, flags,
            type(ClawclickHook).creationCode,
            abi.encode(POOL_MANAGER, address(config))
        );
        ClawclickHook hook = new ClawclickHook{salt: salt}(
            IPoolManager(POOL_MANAGER), config
        );
        require(address(hook) == predicted, "Hook addr mismatch");

        // 3. Factory (no BootstrapETH for testing)
        ClawclickFactory factory = new ClawclickFactory(
            config, 
            IPoolManager(POOL_MANAGER), 
            hook,
            POSITION_MANAGER, 
            BootstrapETH(payable(address(0))),  // No bootstrap for testing
            deployer  // owner
        );
        config.setFactory(address(factory));

        // 4. Router
        TestSwapRouter router = new TestSwapRouter(IPoolManager(POOL_MANAGER));

        // 5. Create launch (1 ETH target MCAP, 0.001 ETH bootstrap)
        uint256 bootstrap = 0.001 ether;
        (address token, PoolId poolId) = factory.createLaunch{value: bootstrap}(
            ClawclickFactory.CreateParams({
                name: "GradTestRepos",
                symbol: "GRADR",
                beneficiary: deployer,
                agentWallet: deployer,
                targetMcapETH: 1 ether
            })
        );

        // 6. Pool is automatically activated with bootstrap liquidity
        // No manual activation needed in new system

        vm.stopBroadcast();

        // Print addresses for Python script
        console2.log("");
        console2.log("=== DEPLOYED ADDRESSES (copy to .env) ===");
        console2.log("HOOK=", address(hook));
        console2.log("FACTORY=", address(factory));
        console2.log("ROUTER=", address(router));
        console2.log("TOKEN=", token);
        console2.log("POOL_MANAGER=", POOL_MANAGER);
        console2.log("POOL_ID=");
        console2.logBytes32(PoolId.unwrap(poolId));
        console2.log("=========================================");
    }
}
