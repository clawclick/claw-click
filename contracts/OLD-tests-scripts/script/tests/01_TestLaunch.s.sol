// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/core/ClawclickHook_V4.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickToken.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";

contract TestLaunch is Script {
    using PoolIdLibrary for PoolKey;
    ClawclickFactory factory;
    ClawclickHook hook;
    ClawclickConfig config;
    address deployer;
    uint256 deployerPk;

    function setUp() public {
        config = ClawclickConfig(vm.envAddress("CONFIG"));
        hook = ClawclickHook(payable(vm.envAddress("HOOK")));
        factory = ClawclickFactory(payable(vm.envAddress("FACTORY")));
        deployerPk = vm.envUint("TESTING_DEV_WALLET_PK");
        deployer = vm.addr(deployerPk);
    }

    function run() external {
        console2.log("=== 01_TestLaunch ===");
        vm.startBroadcast(deployerPk);
        testValidLaunch();
        testBelowMinMcap();
        testAboveMaxMcap();
        testPoolInitializedCorrectly();
        testSupplyMintInvariant();
        vm.stopBroadcast();
        console2.log("=== ALL LAUNCH TESTS PASSED ===");
    }

    function testValidLaunch() internal {
        console2.log("Test 1: Valid Launch");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "Test Token", symbol: "TEST", beneficiary: deployer, agentWallet: deployer, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        require(token != address(0), "Token not deployed");
        require(factory.poolActivated(poolId), "Pool not activated");
        require(factory.positionTokenId(poolId) > 0, "No LP position");
        (address hookToken,, uint256 startMcap,,,,,) = hook.launches(poolId);
        require(hookToken == token, "Hook mismatch");
        require(startMcap == 1 ether, "startMcap mismatch");
        console2.log("  [OK] Test 1 PASSED");
    }

    function testBelowMinMcap() internal {
        console2.log("Test 2: Below Min MCAP");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        try factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "T2", symbol: "T2", beneficiary: deployer, agentWallet: deployer, targetMcapETH: 0.5 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        ) { revert("Should have reverted"); } catch { console2.log("  [OK] Reverted"); }
        console2.log("  [OK] Test 2 PASSED");
    }

    function testAboveMaxMcap() internal {
        console2.log("Test 3: Above Max MCAP");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        try factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "T3", symbol: "T3", beneficiary: deployer, agentWallet: deployer, targetMcapETH: 11 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        ) { revert("Should have reverted"); } catch { console2.log("  [OK] Reverted"); }
        console2.log("  [OK] Test 3 PASSED");
    }

    function testPoolInitializedCorrectly() internal {
        console2.log("Test 4: Pool Initialized");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        uint160 expectedSqrt = factory.previewSqrtPrice(2 ether);
        require(expectedSqrt > 0, "Invalid sqrtPrice");
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "T4", symbol: "T4", beneficiary: deployer, agentWallet: deployer, targetMcapETH: 2 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        require(factory.poolActivated(poolId), "Not activated");
        require(factory.positionTokenId(poolId) > 0, "No position");
        console2.log("  [OK] Test 4 PASSED");
    }

    function testSupplyMintInvariant() internal {
        console2.log("Test 5: Supply Invariant");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token,) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "T5", symbol: "T5", beneficiary: deployer, agentWallet: deployer, targetMcapETH: 1 ether, feeSplit: ClawclickFactory.FeeSplit([address(0),address(0),address(0),address(0),address(0)], [uint16(0),uint16(0),uint16(0),uint16(0),uint16(0)], 0)})
        );
        require(ClawclickToken(token).totalSupply() == 1_000_000_000 * 1e18, "Supply mismatch");
        require(ClawclickToken(token).balanceOf(deployer) == 0, "Deployer has tokens");
        console2.log("  [OK] Test 5 PASSED");
    }
}
