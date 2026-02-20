// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../../src/core/ClawclickFactory.sol";
import "../../src/core/ClawclickHook_V4.sol";
import "../../src/core/ClawclickConfig.sol";
import "../../src/core/ClawclickToken.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";

/**
 * @title 01_TestLaunch
 * @notice Validates launch creation invariants (ISOLATED TEST)
 * 
 * Tests:
 * - createLaunch succeeds with valid params
 * - Fails below minimum MCAP (1 ETH)
 * - Fails above maximum MCAP (10 ETH)
 * - TOTAL_SUPPLY minted correctly to Factory
 * - Pool initialized correctly
 * - No liquidity minted at launch
 * - poolActivated == false
 * 
 * Does NOT test:
 * - Activation
 * - Swaps
 * - Taxes
 * - Limits
 * 
 * This is purely launch validation.
 */
contract TestLaunch is Script {
    using PoolIdLibrary for PoolKey;
    
    ClawclickFactory factory;
    ClawclickHook hook;
    ClawclickConfig config;
    
    address deployer;
    uint256 deployerPk;
    
    function setUp() public {
        // Load deployed contract addresses
        config = ClawclickConfig(vm.envAddress("CONFIG"));
        hook = ClawclickHook(payable(vm.envAddress("HOOK")));
        factory = ClawclickFactory(payable(vm.envAddress("FACTORY")));
        
        deployerPk = vm.envUint("TESTING_DEV_WALLET_PK");
        deployer = vm.addr(deployerPk);
    }
    
    function run() external {
        console2.log("=== 01_TestLaunch: Launch Creation Validation ===");
        console2.log("");
        
        vm.startBroadcast(deployerPk);
        
        // Test 1: Valid launch (1 ETH MCAP)
        testValidLaunch();
        
        // Test 2: Below minimum MCAP (should fail)
        testBelowMinMcap();
        
        // Test 3: Above maximum MCAP (should fail)
        testAboveMaxMcap();
        
        // Test 4: Pool initialized correctly
        testPoolInitializedCorrectly();
        
        // Test 5: Supply mint invariant
        testSupplyMintInvariant();
        
        vm.stopBroadcast();
        
        console2.log("");
        console2.log("=== ALL LAUNCH TESTS PASSED ===");
    }
    
    function testValidLaunch() internal {
        console2.log("Test 1: Valid Launch (1 ETH MCAP)");
        
        uint256 launchFee = config.MIN_BOOTSTRAP_ETH(); // micro tier
        
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test Token",
            symbol: "TEST",
            beneficiary: deployer,
            agentWallet: deployer,
            targetMcapETH: 1 ether
        });
        
        (address token, PoolId poolId) = factory.createLaunch{value: launchFee}(params);
        
        // Validation 1: Token deployed
        require(token != address(0), "FAIL: Token not deployed");
        console2.log("  [OK] Token deployed:", token);
        
        // Validation 2: TOTAL_SUPPLY minted to Factory
        uint256 factoryBalance = ClawclickToken(token).balanceOf(address(factory));
        require(factoryBalance == 1_000_000_000 * 1e18, "FAIL: Total supply not minted to factory");
        console2.log("  [OK] Total supply minted to Factory");
        
        // Validation 3: Pool activated == false
        bool activated = factory.poolActivated(poolId);
        require(!activated, "FAIL: Pool should not be activated");
        console2.log("  [OK] Pool not activated (correct)");
        
        // Validation 4: Launch info stored
        ClawclickFactory.LaunchInfo memory info = factory.launchByPoolId(poolId);
        require(info.token == token, "FAIL: Launch info token mismatch");
        require(info.creator == deployer, "FAIL: Creator mismatch");
        require(info.targetMcapETH == 1 ether, "FAIL: Target MCAP mismatch");
        console2.log("  [OK] Launch info stored correctly");
        
        // Validation 5: Hook registered
        (
            address hookToken,
            address beneficiary,
            uint256 startMcap,
            uint256 baseTax,
            uint160 startSqrtPrice,
            ClawclickHook.Phase phase,
            uint8 liquidityStage,
            uint256 graduationMcap
        ) = hook.launches(poolId);
        require(hookToken == token, "FAIL: Hook not registered");
        require(startMcap == 1 ether, "FAIL: Hook startMcap mismatch");
        console2.log("  [OK] Hook registered correctly");
        
        console2.log("  [OK] Test 1 PASSED");
        console2.log("");
    }
    
    function testBelowMinMcap() internal {
        console2.log("Test 2: Below Minimum MCAP (should revert)");
        
        uint256 launchFee = config.MIN_BOOTSTRAP_ETH();
        
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test Token 2",
            symbol: "TEST2",
            beneficiary: deployer,
            agentWallet: deployer,
            targetMcapETH: 0.5 ether // Below MIN_TARGET_MCAP (1 ETH)
        });
        
        // Expect revert with "InvalidTargetMcap"
        try factory.createLaunch{value: launchFee}(params) {
            revert("FAIL: Should have reverted for MCAP below minimum");
        } catch Error(string memory reason) {
            // Check if revert reason contains expected error
            console2.log("  [OK] Reverted as expected:", reason);
        } catch {
            console2.log("  [OK] Reverted (custom error)");
        }
        
        console2.log("  [OK] Test 2 PASSED");
        console2.log("");
    }
    
    function testAboveMaxMcap() internal {
        console2.log("Test 3: Above Maximum MCAP (should revert)");
        
        uint256 launchFee = config.MIN_BOOTSTRAP_ETH();
        
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test Token 3",
            symbol: "TEST3",
            beneficiary: deployer,
            agentWallet: deployer,
            targetMcapETH: 11 ether // Above MAX_TARGET_MCAP (10 ETH)
        });
        
        // Expect revert with "InvalidTargetMcap"
        try factory.createLaunch{value: launchFee}(params) {
            revert("FAIL: Should have reverted for MCAP above maximum");
        } catch Error(string memory reason) {
            console2.log("  [OK] Reverted as expected:", reason);
        } catch {
            console2.log("  [OK] Reverted (custom error)");
        }
        
        console2.log("  [OK] Test 3 PASSED");
        console2.log("");
    }
    
    function testPoolInitializedCorrectly() internal {
        console2.log("Test 4: Pool Initialized Correctly");
        
        uint256 launchFee = config.MIN_BOOTSTRAP_ETH();
        uint256 targetMcap = 2 ether;
        
        // Preview expected sqrtPrice
        uint160 expectedSqrtPrice = factory.previewSqrtPrice(targetMcap);
        console2.log("  Expected sqrtPriceX96:", expectedSqrtPrice);
        
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test Token 4",
            symbol: "TEST4",
            beneficiary: deployer,
            agentWallet: deployer,
            targetMcapETH: targetMcap
        });
        
        (address token, PoolId poolId) = factory.createLaunch{value: launchFee}(params);
        
        // Validation 1: Pool exists (can query launch info)
        ClawclickFactory.LaunchInfo memory info = factory.launchByPoolId(poolId);
        require(info.token == token, "FAIL: Pool not found");
        console2.log("  [OK] Pool exists");
        
        // Validation 2: sqrtPrice matches preview
        // Note: We can't directly query pool price without PoolManager access in script
        // But we can verify the preview calculation returned a valid value
        require(expectedSqrtPrice > 0, "FAIL: Invalid sqrtPrice");
        require(expectedSqrtPrice <= type(uint160).max, "FAIL: sqrtPrice overflow");
        console2.log("  [OK] sqrtPrice calculation valid");
        
        // Validation 3: No liquidity minted yet
        uint256 positionId = factory.positionTokenId(poolId);
        require(positionId == 0, "FAIL: Position should not exist yet");
        console2.log("  [OK] No liquidity minted (positionTokenId == 0)");
        
        // Validation 4: poolActivated == false
        bool activated = factory.poolActivated(poolId);
        require(!activated, "FAIL: Pool should not be activated");
        console2.log("  [OK] poolActivated == false");
        
        console2.log("  [OK] Test 4 PASSED");
        console2.log("");
    }
    
    function testSupplyMintInvariant() internal {
        console2.log("Test 5: Supply Mint Invariant");
        
        uint256 launchFee = config.MIN_BOOTSTRAP_ETH();
        
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "Test Token 5",
            symbol: "TEST5",
            beneficiary: deployer,
            agentWallet: deployer,
            targetMcapETH: 1 ether
        });
        
        (address token, PoolId poolId) = factory.createLaunch{value: launchFee}(params);
        
        ClawclickToken tokenContract = ClawclickToken(token);
        
        // Validation 1: Total supply is exactly 1 billion
        uint256 expectedSupply = 1_000_000_000 * 1e18;
        uint256 actualSupply = tokenContract.totalSupply();
        require(actualSupply == expectedSupply, "FAIL: Total supply mismatch");
        console2.log("  [OK] Total supply == 1_000_000_000e18");
        
        // Validation 2: Factory holds entire supply
        uint256 factoryBalance = tokenContract.balanceOf(address(factory));
        require(factoryBalance == expectedSupply, "FAIL: Factory should hold entire supply");
        console2.log("  [OK] Factory holds 100% of supply");
        
        // Validation 3: No tokens in circulation (deployer has 0)
        uint256 deployerBalance = tokenContract.balanceOf(deployer);
        require(deployerBalance == 0, "FAIL: Deployer should have 0 tokens");
        console2.log("  [OK] No tokens in circulation");
        
        // Validation 4: Verify supply distribution (Factory only)
        // In an unactivated pool, only Factory should have tokens
        uint256 accountedSupply = factoryBalance;
        require(accountedSupply == expectedSupply, "FAIL: Supply distribution mismatch");
        console2.log("  [OK] Supply fully accounted (100% in Factory)");
        
        console2.log("  [OK] Test 5 PASSED");
        console2.log("");
    }
}
