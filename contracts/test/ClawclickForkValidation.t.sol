// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";

import {ClawclickFactory} from "../src/core/ClawclickFactory.sol";
import {ClawclickHook} from "../src/core/ClawclickHook_V4.sol";
import {ClawclickConfig} from "../src/core/ClawclickConfig.sol";
import {ClawclickToken} from "../src/core/ClawclickToken.sol";
import {ClawclickLPLocker} from "../src/core/ClawclickLPLocker.sol";
import {HookMiner} from "../src/utils/HookMiner.sol";

/**
 * @title ClawclickForkValidation
 * @notice CRITICAL FORK TEST - Validates against REAL Uniswap v4 contracts
 * 
 * PURPOSE:
 * - Eliminate mock-reality divergence
 * - Validate actual v4 behavior
 * - Confirm assumptions about settlement, position management, error wrapping
 * 
 * REQUIREMENTS:
 * - Run with: forge test --fork-url $SEPOLIA_RPC -vvvv
 * - Sepolia v4 contracts must be deployed
 * - RPC must have sufficient rate limits
 * 
 * WHAT WE'RE VALIDATING:
 * 1. Decrease 100% liquidity behavior (NFT remains? Tokens returned?)
 * 2. nextTokenId() predictability
 * 3. Out-of-range bootstrap (token-only, 0 ETH)
 * 4. Dynamic fee hook settlement (no CurrencyNotSettled?)
 * 5. Error wrapping (hook errors wrapped?)
 * 6. Real gas costs
 */
contract ClawclickForkValidationTest is Test {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    /*//////////////////////////////////////////////////////////////
                         SEPOLIA v4 ADDRESSES
    //////////////////////////////////////////////////////////////*/
    
    // TODO: Update with actual Sepolia v4 deployment addresses
    address constant SEPOLIA_POOL_MANAGER = address(0); // MUST UPDATE
    address constant SEPOLIA_POSITION_MANAGER = address(0); // MUST UPDATE
    
    /*//////////////////////////////////////////////////////////////
                              CONTRACTS
    //////////////////////////////////////////////////////////////*/
    
    IPoolManager public poolManager;
    IPositionManager public positionManager;
    ClawclickConfig public config;
    ClawclickHook public hook;
    ClawclickFactory public factory;
    ClawclickLPLocker public lpLocker;

    /*//////////////////////////////////////////////////////////////
                                ACTORS
    //////////////////////////////////////////////////////////////*/
    
    address public owner = address(0x1);
    address public treasury = address(0x2);
    address public beneficiary = address(0x4);
    address public trader = address(0x5);

    /*//////////////////////////////////////////////////////////////
                              CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    Currency internal constant ETH = Currency.wrap(address(0));
    uint256 constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    
    /*//////////////////////////////////////////////////////////////
                                SETUP
    //////////////////////////////////////////////////////////////*/
    
    function setUp() public {
        // Verify we're on Sepolia fork
        require(block.chainid == 11155111, "Must run on Sepolia fork");
        console.log("Chain ID:", block.chainid);
        console.log("Block number:", block.number);
        
        // Verify v4 contracts exist
        require(SEPOLIA_POOL_MANAGER != address(0), "Update SEPOLIA_POOL_MANAGER address");
        require(SEPOLIA_POSITION_MANAGER != address(0), "Update SEPOLIA_POSITION_MANAGER address");
        
        // Use REAL v4 contracts from Sepolia
        poolManager = IPoolManager(SEPOLIA_POOL_MANAGER);
        positionManager = IPositionManager(SEPOLIA_POSITION_MANAGER);
        
        console.log("Using REAL PoolManager:", address(poolManager));
        console.log("Using REAL PositionManager:", address(positionManager));
        
        // Fund accounts
        vm.deal(owner, 100 ether);
        vm.deal(treasury, 100 ether);
        vm.deal(trader, 100 ether);
        
        vm.startPrank(owner);
        
        // Deploy our contracts
        config = new ClawclickConfig(treasury, owner);
        console.log("Config deployed:", address(config));
        
        // Mine hook address
        uint160 flags = uint160(
            (1 << 13) | // BEFORE_INITIALIZE
            (1 << 11) | // BEFORE_ADD_LIQUIDITY  
            (1 << 9)  | // BEFORE_REMOVE_LIQUIDITY
            (1 << 7)  | // BEFORE_SWAP
            (1 << 6)  | // AFTER_SWAP
            (1 << 3)    // BEFORE_SWAP_RETURNS_DELTA
        );
        
        (address hookAddress, bytes32 salt) = HookMiner.find(
            owner,
            flags,
            type(ClawclickHook).creationCode,
            abi.encode(address(poolManager), config)
        );
        
        // Deploy hook
        hook = new ClawclickHook{salt: salt}(poolManager, config);
        require(address(hook) == hookAddress, "Hook address mismatch");
        console.log("Hook deployed:", address(hook));
        
        // Deploy LP Locker with REAL PositionManager
        lpLocker = new ClawclickLPLocker(address(positionManager), address(hook), owner);
        console.log("LPLocker deployed:", address(lpLocker));
        
        // Set lpLocker in hook
        hook.setLPLocker(lpLocker);
        
        // Deploy factory with REAL PositionManager
        factory = new ClawclickFactory(
            config,
            poolManager,
            hook,
            lpLocker,
            positionManager,
            owner
        );
        console.log("Factory deployed:", address(factory));
        
        config.setFactory(address(factory));
        
        vm.stopPrank();
        
        console.log("\n=== FORK SETUP COMPLETE ===");
        console.log("Using REAL v4 contracts from Sepolia");
    }

    /*//////////////////////////////////////////////////////////////
                        FORK VALIDATION TESTS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice FORK TEST 1: Bootstrap Activation
     * @dev Validates: Out-of-range token-only bootstrap with 0 ETH
     */
    function testFork_BootstrapActivation() public {
        console.log("\n=== FORK TEST: Bootstrap Activation ===\n");
        
        vm.startPrank(owner);
        
        // Create launch with 1 ETH target MCAP
        ClawclickFactory.CreateParams memory params = ClawclickFactory.CreateParams({
            name: "ForkTest",
            symbol: "FORK",
            beneficiary: beneficiary,
            agentWallet: address(0),
            isPremium: false,
            targetMcapETH: 1 ether
        });
        
        console.log("Creating launch on REAL v4...");
        uint256 gasBefore = gasleft();
        (address token, PoolId poolId) = factory.createLaunch{value: 0.0003 ether}(params);
        uint256 gasUsed = gasBefore - gasleft();
        
        console.log("Token deployed:", token);
        console.log("Gas used:", gasUsed);
        
        // OBSERVATION 1: Bootstrap succeeds with 0 ETH?
        assertTrue(token != address(0), "Token should deploy");
        console.log("✓ Bootstrap succeeded with 0 ETH");
        
        // OBSERVATION 2: Position created?
        uint256 positionId = lpLocker.getPosition(token);
        console.log("Position ID:", positionId);
        assertTrue(positionId > 0, "Position should exist");
        
        // OBSERVATION 3: Position has liquidity?
        uint128 liquidity = positionManager.getPositionLiquidity(positionId);
        console.log("Position liquidity:", liquidity);
        assertTrue(liquidity > 0, "Position should have liquidity");
        
        vm.stopPrank();
        
        console.log("\n=== FORK TEST 1 PASSED ===\n");
    }
    
    /**
     * @notice FORK TEST 2: First Buy Activation
     * @dev Validates: Price moves into bootstrap range, trading activates
     */
    function testFork_FirstBuyActivation() public {
        console.log("\n=== FORK TEST: First Buy Activation ===\n");
        
        // Create launch first
        testFork_BootstrapActivation();
        
        // TODO: Execute first buy via real v4 swap router
        // TODO: Observe price movement
        // TODO: Confirm liquidity activated
        
        console.log("[PENDING] Requires real swap router integration");
    }
    
    /**
     * @notice FORK TEST 3: Decrease 100% Liquidity Behavior
     * @dev Validates: NFT remains? Tokens returned? Settlement correct?
     */
    function testFork_DecreaseLiquidityBehavior() public {
        console.log("\n=== FORK TEST: Decrease 100% Liquidity ===\n");
        
        // TODO: Create position
        // TODO: Decrease 100% liquidity
        // TODO: Check if NFT still exists
        // TODO: Check if tokens returned
        // TODO: Check if explicit collect() needed
        
        console.log("[PENDING] Requires position creation and decrease");
    }
    
    /**
     * @notice FORK TEST 4: nextTokenId Predictability
     * @dev Validates: Can we predict next position ID before minting?
     */
    function testFork_NextTokenIdPredictability() public {
        console.log("\n=== FORK TEST: nextTokenId Predictability ===\n");
        
        uint256 nextId = positionManager.nextTokenId();
        console.log("Current nextTokenId:", nextId);
        
        // TODO: Mint position
        // TODO: Confirm ID matches prediction
        
        console.log("[PENDING] Requires position minting");
    }
    
    /**
     * @notice FORK TEST 5: Dynamic Fee Hook Settlement
     * @dev Validates: getFee() works? No CurrencyNotSettled?
     */
    function testFork_DynamicFeeSettlement() public {
        console.log("\n=== FORK TEST: Dynamic Fee Settlement ===\n");
        
        // TODO: Create launch with dynamic fee hook
        // TODO: Execute swap
        // TODO: Confirm no CurrencyNotSettled
        // TODO: Verify fee applied correctly
        
        console.log("[PENDING] Requires swap execution");
    }
    
    /**
     * @notice FORK TEST 6: Error Wrapping
     * @dev Validates: Hook errors wrapped in WrappedError?
     */
    function testFork_ErrorWrapping() public {
        console.log("\n=== FORK TEST: Error Wrapping ===\n");
        
        // TODO: Trigger hook revert
        // TODO: Capture error message
        // TODO: Verify wrapping behavior
        
        console.log("[PENDING] Requires intentional revert");
    }
    
    /**
     * @notice FORK TEST 7: Gas Costs (Real)
     * @dev Measures: Actual gas costs on real v4
     */
    function testFork_GasCosts() public {
        console.log("\n=== FORK TEST: Real Gas Costs ===\n");
        
        // TODO: Measure bootstrap gas
        // TODO: Measure swap gas
        // TODO: Measure rebalance gas
        // TODO: Compare to estimates
        
        console.log("[PENDING] Requires full lifecycle");
    }

    /*//////////////////////////////////////////////////////////////
                             HELPERS
    //////////////////////////////////////////////////////////////*/
    
    function _getPoolKey(address token) internal view returns (PoolKey memory) {
        return PoolKey({
            currency0: ETH,
            currency1: Currency.wrap(token),
            fee: 0x800000,  // Dynamic fee flag
            tickSpacing: 200,
            hooks: hook
        });
    }
}
