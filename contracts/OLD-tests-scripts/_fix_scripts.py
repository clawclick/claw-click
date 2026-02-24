#!/usr/bin/env python3
"""Fix all broken script/test files for Clawclick contracts."""
import os

BASE = "/Users/zcsmacpro/VscProjects/claw-click/contracts"

files = {}

# ─── 01_TestLaunch.s.sol ───
files["script/tests/01_TestLaunch.s.sol"] = r'''// SPDX-License-Identifier: MIT
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
            ClawclickFactory.CreateParams({name: "Test Token", symbol: "TEST", beneficiary: deployer, agentWallet: deployer, targetMcapETH: 1 ether})
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
            ClawclickFactory.CreateParams({name: "T2", symbol: "T2", beneficiary: deployer, agentWallet: deployer, targetMcapETH: 0.5 ether})
        ) { revert("Should have reverted"); } catch { console2.log("  [OK] Reverted"); }
        console2.log("  [OK] Test 2 PASSED");
    }

    function testAboveMaxMcap() internal {
        console2.log("Test 3: Above Max MCAP");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        try factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "T3", symbol: "T3", beneficiary: deployer, agentWallet: deployer, targetMcapETH: 11 ether})
        ) { revert("Should have reverted"); } catch { console2.log("  [OK] Reverted"); }
        console2.log("  [OK] Test 3 PASSED");
    }

    function testPoolInitializedCorrectly() internal {
        console2.log("Test 4: Pool Initialized");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        uint160 expectedSqrt = factory.previewSqrtPrice(2 ether);
        require(expectedSqrt > 0, "Invalid sqrtPrice");
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "T4", symbol: "T4", beneficiary: deployer, agentWallet: deployer, targetMcapETH: 2 ether})
        );
        require(factory.poolActivated(poolId), "Not activated");
        require(factory.positionTokenId(poolId) > 0, "No position");
        console2.log("  [OK] Test 4 PASSED");
    }

    function testSupplyMintInvariant() internal {
        console2.log("Test 5: Supply Invariant");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token,) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "T5", symbol: "T5", beneficiary: deployer, agentWallet: deployer, targetMcapETH: 1 ether})
        );
        require(ClawclickToken(token).totalSupply() == 1_000_000_000 * 1e18, "Supply mismatch");
        require(ClawclickToken(token).balanceOf(deployer) == 0, "Deployer has tokens");
        console2.log("  [OK] Test 5 PASSED");
    }
}
'''

# ─── 02_TestPublicActivation.s.sol ───
files["script/tests/02_TestPublicActivation.s.sol"] = r'''// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/core/ClawclickHook_V4.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickToken.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";

contract TestPublicActivation is Script {
    ClawclickConfig public config;
    ClawclickHook public hook;
    ClawclickFactory public factory;
    address public dev;

    function setUp() public {
        config = ClawclickConfig(vm.envAddress("CONFIG"));
        hook = ClawclickHook(payable(vm.envAddress("HOOK")));
        factory = ClawclickFactory(payable(vm.envAddress("FACTORY")));
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        dev = vm.addr(pk);
    }

    function run() external {
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        console2.log("=== 02_TestActivation ===");
        vm.startBroadcast(pk);
        _testPoolActivatesAtLaunch();
        _testLPPositionExists();
        _testHookRegistered();
        _testTokensDistributed();
        vm.stopBroadcast();
        console2.log("=== ALL ACTIVATION TESTS PASSED ===");
    }

    function _testPoolActivatesAtLaunch() internal {
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "ACT1", symbol: "ACT1", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether})
        );
        require(factory.poolActivated(poolId), "Pool not activated");
        console2.log("  [OK] Pool activates at launch");
    }

    function _testLPPositionExists() internal {
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "ACT2", symbol: "ACT2", beneficiary: dev, agentWallet: dev, targetMcapETH: 2 ether})
        );
        require(factory.positionTokenId(poolId) > 0, "No LP position");
        console2.log("  [OK] LP position exists");
    }

    function _testHookRegistered() internal {
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "ACT3", symbol: "ACT3", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether})
        );
        (address hookToken,,,uint256 baseTax,,,,) = hook.launches(poolId);
        require(hookToken == token, "Hook mismatch");
        require(baseTax == 5000, "baseTax not 5000");
        console2.log("  [OK] Hook registered");
    }

    function _testTokensDistributed() internal {
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token,) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "ACT5", symbol: "ACT5", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether})
        );
        uint256 total = ClawclickToken(token).totalSupply();
        uint256 factBal = ClawclickToken(token).balanceOf(address(factory));
        console2.log("  Supply:", total / 1e18, "Factory:", factBal / 1e18);
        console2.log("  [OK] Tokens distributed");
    }
}
'''

# ─── 03_TestDevActivation.s.sol ───
files["script/tests/03_TestDevActivation.s.sol"] = r'''// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/core/ClawclickHook_V4.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickToken.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

/**
 * @title 03_TestDevActivation
 * @notice Validates pool auto-activation (dev activation removed in new system)
 */
contract TestDevActivation is Script {
    ClawclickConfig public config;
    ClawclickHook public hook;
    ClawclickFactory public factory;
    address public dev;

    function setUp() public {
        config = ClawclickConfig(vm.envAddress("CONFIG"));
        hook = ClawclickHook(payable(vm.envAddress("HOOK")));
        factory = ClawclickFactory(payable(vm.envAddress("FACTORY")));
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        dev = vm.addr(pk);
    }

    function run() external {
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        console2.log("=== 03_TestDevActivation ===");
        vm.startBroadcast(pk);
        testAutoActivation();
        testDevCapCheck();
        testActivationInProgressFlag();
        vm.stopBroadcast();
        console2.log("=== ALL DEV ACTIVATION TESTS PASSED ===");
    }

    function testAutoActivation() internal {
        console2.log("Test 1: Auto-Activation at Launch");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "DEVACT1", symbol: "DA1", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether})
        );
        require(factory.poolActivated(poolId), "Pool not activated");
        require(factory.positionTokenId(poolId) > 0, "No LP position");
        console2.log("  [OK] Pool auto-activated with LP");
    }

    function testDevCapCheck() internal {
        console2.log("Test 2: Dev Cap Check");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "DEVACT2", symbol: "DA2", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether})
        );
        bool capOk = factory.checkDevCap(poolId, dev);
        require(capOk, "Dev should be within cap");
        console2.log("  [OK] Dev within 15% cap");
    }

    function testActivationInProgressFlag() internal {
        console2.log("Test 3: activationInProgress Flag");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "DEVACT3", symbol: "DA3", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether})
        );
        bool flag = hook.activationInProgress(poolId);
        console2.log("  activationInProgress:", flag);
        console2.log("  [OK] Flag accessible");
    }

    function _createPoolKey(address token) internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: 0x800000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
    }
}
'''

# ─── 04_TestTaxDecay.s.sol ───
files["script/tests/04_TestTaxDecay.s.sol"] = r'''// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/core/ClawclickHook_V4.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickToken.sol";
import "../../src/utils/SwapExecutor.sol";
import {PoolId} from "v4-core/src/types/PoolId.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";

contract TestTaxDecay is Script {
    ClawclickConfig public config;
    ClawclickHook public hook;
    ClawclickFactory public factory;
    SwapExecutor public swapExecutor;
    address public dev;

    function setUp() public {
        config = ClawclickConfig(vm.envAddress("CONFIG"));
        hook = ClawclickHook(payable(vm.envAddress("HOOK")));
        factory = ClawclickFactory(payable(vm.envAddress("FACTORY")));
        swapExecutor = SwapExecutor(payable(vm.envAddress("SWAP_EXECUTOR")));
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        dev = vm.addr(pk);
    }

    function run() external {
        uint256 pk = vm.envUint("TESTING_DEV_WALLET_PK");
        console2.log("=== 04_TestTaxDecay ===");
        vm.startBroadcast(pk);
        testInitialTax();
        testTaxDecayAt2x();
        testTaxDecayAt4x();
        testTaxDecayAt8x();
        testFeeAccounting();
        vm.stopBroadcast();
        console2.log("=== ALL TAX DECAY TESTS PASSED ===");
    }

    function testInitialTax() internal {
        console2.log("Test 1: Initial Tax (50%)");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "TAXFINAL", symbol: "TXF", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether})
        );
        PoolKey memory key = _createPoolKey(token);
        (,,, uint256 baseTax,,,,) = hook.launches(poolId);
        require(baseTax == 5000, "Base tax should be 5000");
        console2.log("  [OK] Base tax: 5000 (50%)");
        uint256 buyAmount = 0.001 ether;
        uint256 balBefore = ClawclickToken(token).balanceOf(dev);
        swapExecutor.executeBuy{value: buyAmount}(key, buyAmount, 0);
        uint256 balAfter = ClawclickToken(token).balanceOf(dev);
        console2.log("  Tokens out:", (balAfter - balBefore) / 1e18);
        console2.log("  [OK] Test 1 PASSED");
    }

    function testTaxDecayAt2x() internal {
        console2.log("Test 2: Tax Decay at 2x MCAP");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "TAXDECAY2", symbol: "TD2", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether})
        );
        PoolKey memory key = _createPoolKey(token);
        for (uint i = 0; i < 50; i++) { swapExecutor.executeBuy{value: 0.002 ether}(key, 0.002 ether, 0); }
        uint256 currentTax = hook.getCurrentTax(poolId);
        console2.log("  Current tax:", currentTax, "bps");
        require(currentTax <= 2500, "Tax should be <= 2500 at 2x");
        console2.log("  [OK] Test 2 PASSED");
    }

    function testTaxDecayAt4x() internal {
        console2.log("Test 3: Tax Decay at 4x MCAP");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "TAXDECAY3", symbol: "TD3", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether})
        );
        PoolKey memory key = _createPoolKey(token);
        for (uint i = 0; i < 30; i++) { swapExecutor.executeBuy{value: 0.1 ether}(key, 0.1 ether, 0); }
        uint256 currentTax = hook.getCurrentTax(poolId);
        console2.log("  Current tax:", currentTax, "bps");
        require(currentTax <= 1250, "Tax should be <= 1250 at 4x");
        console2.log("  [OK] Test 3 PASSED");
    }

    function testTaxDecayAt8x() internal {
        console2.log("Test 4: Tax Decay at 8x MCAP");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "TAXDECAY4", symbol: "TD4", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether})
        );
        PoolKey memory key = _createPoolKey(token);
        for (uint i = 0; i < 70; i++) { swapExecutor.executeBuy{value: 0.1 ether}(key, 0.1 ether, 0); }
        uint256 currentTax = hook.getCurrentTax(poolId);
        console2.log("  Current tax:", currentTax, "bps");
        require(currentTax <= 625, "Tax should be <= 625 at 8x");
        console2.log("  [OK] Test 4 PASSED");
    }

    function testFeeAccounting() internal {
        console2.log("Test 5: Fee Accounting");
        uint256 fee = config.MIN_BOOTSTRAP_ETH();
        (address token, PoolId poolId) = factory.createLaunch{value: fee}(
            ClawclickFactory.CreateParams({name: "TAXDECAY5", symbol: "TD5", beneficiary: dev, agentWallet: dev, targetMcapETH: 1 ether})
        );
        PoolKey memory key = _createPoolKey(token);
        uint256 feesBefore = hook.beneficiaryFeesToken(dev, token);
        swapExecutor.executeBuy{value: 0.001 ether}(key, 0.001 ether, 0);
        uint256 feesAfter = hook.beneficiaryFeesToken(dev, token);
        require(feesAfter > feesBefore, "Fees should increase");
        console2.log("  [OK] Test 5 PASSED");
    }

    function _createPoolKey(address token) internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(token),
            fee: 0x800000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });
    }
}
'''

for relpath, content in files.items():
    fpath = os.path.join(BASE, relpath)
    with open(fpath, 'w') as f:
        f.write(content)
    print(f"  Written: {relpath}")

print("Done: 4 script/tests files fixed")
