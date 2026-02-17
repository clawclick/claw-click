// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "../utils/BaseHook.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {BalanceDelta, toBalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary, toBeforeSwapDelta} from "v4-core/src/types/BeforeSwapDelta.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {SafeCast} from "v4-core/src/libraries/SafeCast.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {FullMath} from "v4-core/src/libraries/FullMath.sol";
import {FixedPoint96} from "v4-core/src/libraries/FixedPoint96.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {ModifyLiquidityParams, SwapParams} from "v4-core/src/types/PoolOperation.sol";

import {ClawclickConfig} from "./ClawclickConfig.sol";
import {IClawclickFactory} from "../interfaces/IClawclickFactory.sol";

/**
 * @title ClawclickHook - Deep Sea Engine v4 Hybrid Launch Model
 * @notice Two-phase relative growth engine built on Uniswap v4
 * @author OpenClaw
 * 
 * 🔒 LOCKED SYSTEM - Do not modify architecture
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * This is NOT a tax token. This is NOT pure Clanker.
 * This is a v4-native hybrid engine.
 * 
 * PHASE 1 — PROTECTED MODE
 *   • Hook-based anti-bot protection
 *   • Growth-based tax decay (relative doubling)
 *   • Dynamic position limits
 *   • 70/30 revenue split
 *   • Pool fee = 0% (hook collects all fees via delta)
 *   • Tradable from block 1
 * 
 * PHASE 2 — GRADUATED MODE
 *   • After 4 MCAP doublings
 *   • Hook tax disabled (returns ZERO_DELTA)
 *   • Pool fee = 1% (LP earns ongoing revenue)
 *   • Limits disabled
 *   • LP rebalance allowed (timelocked)
 *   • 70/30 split continues (via PositionManager)
 *   • Irreversible
 *   • Tradable
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * TAX MODEL — RELATIVE DOUBLING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Tax decays based on relative growth ratio:
 *   growthRatio = currentMcap / startMcap
 *   epoch = floor(log2(growthRatio))
 *   tax = baseTax / (2^epoch)
 *   floor = 1%
 * 
 * Examples:
 *   1 ETH start → 50% base tax
 *     1e  → 50.0% (epoch 0)
 *     2e  → 25.0% (epoch 1)
 *     4e  → 12.5% (epoch 2)
 *     8e  →  6.25% (epoch 3)
 *     16e →  1.0% (epoch 4+, floor)
 * 
 *   10 ETH start → 5% base tax
 *     10e → 5.0% (epoch 0)
 *     20e → 2.5% (epoch 1)
 *     40e → 1.25% (epoch 2)
 *     80e → 1.0% (epoch 3+, floor)
 * 
 * Equal fairness across all launch sizes.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * GRADUATION LOGIC
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Triggered when:
 *   epoch >= 4 (4x doubling = 16x growth)
 * 
 * Simple epoch-based graduation:
 *   if epoch >= GRADUATION_EPOCH (4):
 *     phase = GRADUATED
 *     graduationMcap = startMcap * 16
 *     liquidityStage = 1
 * 
 * Permanent. No reversion. No timer.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * POSITION LIMITS — RELATIVE SCALING
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Limits scale with MCAP growth ratio:
 *   maxBps = baseLimitBps * growthRatio
 *   minimum = 0.1%
 * 
 * Examples:
 *   1 ETH start (growthRatio = 1.0) → 0.1% limit
 *   2 ETH (growthRatio = 2.0) → 0.2% limit
 *   4 ETH (growthRatio = 4.0) → 0.4% limit
 * 
 * Equal fairness. Small MC = tight limits. Growing MC = expanding limits.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * FEE FLOW
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PHASE 1 (PROTECTED):
 *   • Hook takes fee via BeforeSwapDelta
 *   • Pool fee = 0
 *   • Immediate 70/30 split
 *   • Fees taken in ETH (buy) or Token (sell)
 *   • Accumulated in hook storage by currency
 *   • Claimable by beneficiary/platform
 * 
 * PHASE 2 (GRADUATED):
 *   • Hook returns ZERO_DELTA
 *   • Pool fee = 1% (100 bps)
 *   • LP earns 1%
 *   • PositionManager collects fees
 *   • 70/30 split continues via PositionManager
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * SAFE MCAP CALCULATION
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * NEVER square sqrtPrice directly (causes overflow at valid v4 prices).
 * 
 * Use incremental division:
 *   intermediate = (TOTAL_SUPPLY * 2^96) / sqrtPriceX96
 *   mcap = intermediate * 2^96 / sqrtPriceX96
 * 
 * This is mathematically equivalent to:
 *   mcap = (TOTAL_SUPPLY * 2^192) / (sqrtPriceX96^2)
 * 
 * But avoids intermediate overflow.
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */
contract ClawclickHook is BaseHook, ReentrancyGuard {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;
    using SafeCast for uint256;
    using SafeCast for int256;
    using StateLibrary for IPoolManager;
    using BeforeSwapDeltaLibrary for BeforeSwapDelta;

    /*//////////////////////////////////////////////////////////////
                                TYPES
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Launch phase
    enum Phase {
        PROTECTED,    // Hook tax active, pool fee = 0
        GRADUATED     // Hook tax off, pool fee = 1%
    }
    
    /// @notice Launch metadata
    /// @dev NOTE: Liquidity staging is independent of tax epoch logic.
    ///      Epoch logic controls fee decay and graduation.
    ///      Liquidity staging controls capital efficiency after graduation.
    ///      These systems do not share thresholds.
    struct Launch {
        address token;
        address beneficiary;
        uint256 startMcap;              // Initial MCAP in ETH
        uint256 baseTax;                // Starting tax in bps (e.g., 5000 = 50%)
        uint160 startSqrtPrice;         // sqrtPriceX96 at launch
        Phase phase;                    // Current phase (PROTECTED/GRADUATED)
        uint8 liquidityStage;           // Liquidity stage (0=bootstrap, 1-3=stages)
        uint256 graduationMcap;         // startMcap * 16 (set on graduation)
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Total supply per token (1 billion with 18 decimals)
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    
    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;
    
    /// @notice Tax floor (1%)
    uint256 public constant TAX_FLOOR_BPS = 100;
    
    /// @notice Base limit (0.1%)
    uint256 public constant BASE_LIMIT_BPS = 10;
    
    /// @notice Graduation threshold (epoch 4 = 16x growth)
    uint256 public constant GRADUATION_EPOCH = 4;
    
    /// @notice Beneficiary share (70%)
    uint256 public constant BENEFICIARY_SHARE_BPS = 7000;
    
    /// @notice Platform share (30%)
    uint256 public constant PLATFORM_SHARE_BPS = 3000;
    
    /// @notice Graduated pool fee (1%)
    uint24 public constant GRADUATED_POOL_FEE = 100;
    
    /// @notice Minimum swap amount to prevent dust griefing (0.0001 ETH or tokens)
    /// @dev Set to 1e14 (0.0001 ETH ≈ $0.20 at $2000/ETH) to meaningfully deter griefing
    ///      while still allowing micro-swaps. Previous value of 1e12 was too permissive.
    uint256 public constant MIN_SWAP_AMOUNT = 1e14;
    
    /// @notice Minimum starting MCAP to prevent shallow liquidity graduation (1 ETH)
    uint256 public constant MIN_START_MCAP = 1 ether;
    
    /// @notice Native ETH address
    address public constant ETH = address(0);

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Protocol configuration
    ClawclickConfig public immutable config;
    
    /// @notice Launch data per pool
    mapping(PoolId => Launch) public launches;
    
    /// @notice Token to PoolId mapping (for LP Locker integration)
    mapping(address => PoolId) public tokenToPoolId;
    
    /// @notice Accumulated ETH fees per beneficiary (currency = ETH)
    mapping(address => uint256) public beneficiaryFeesETH;
    
    /// @notice Accumulated token fees per beneficiary per token
    mapping(address => mapping(address => uint256)) public beneficiaryFeesToken;
    
    /// @notice Accumulated platform ETH fees
    uint256 public platformFeesETH;
    
    /// @notice Accumulated platform token fees per token
    mapping(address => uint256) public platformFeesToken;
    
    /// @notice Per-user balance tracking (for maxWallet enforcement)
    mapping(PoolId => mapping(address => uint256)) public userBalances;
    
    /// @notice Rebalancing guard (prevents recursion during autonomous rebalance)
    bool private _rebalancing;
    
    /// @notice Dev activation override flag (bypass tax + limits during dev seed buy)
    mapping(PoolId => bool) public activationInProgress;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    
    event LaunchCreated(
        PoolId indexed poolId,
        address indexed token,
        address indexed beneficiary,
        uint256 startMcap,
        uint256 baseTax
    );
    
    event SwapExecuted(
        PoolId indexed poolId,
        address indexed swapper,
        bool isBuy,
        uint256 currentMcap,
        uint256 epoch,
        uint256 taxBps,
        uint256 feeAmount,
        bool isETHFee
    );
    
    event PhaseChanged(
        PoolId indexed poolId,
        Phase indexed newPhase,
        uint256 timestamp,
        uint256 finalMcap
    );
    
    event Graduated(
        address indexed token,
        PoolId indexed poolId,
        uint256 timestamp,
        uint256 finalMcap
    );
    
    event FeesCollected(
        PoolId indexed poolId,
        uint256 totalFee,
        uint256 beneficiaryShare,
        uint256 platformShare,
        bool isETH
    );
    
    event FeesClaimed(address indexed recipient, uint256 amount, address token);
    
    event LiquidityRebalanced(
        PoolId indexed poolId,
        uint8 oldStage,
        uint8 newStage
    );
    
    event RebalanceFailed(
        PoolId indexed poolId,
        address indexed token,
        uint8 attemptedStage,
        bytes reason
    );

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error NotFactory();
    error LaunchNotFound();
    error ProtocolPaused();
    error NoFeesToClaim();
    error NotTreasury();
    error PoolNotActivated();
    error TransferFailed();
    error LiquidityLocked();
    error ExceedsMaxTx();
    error ExceedsMaxWallet();
    error AlreadyGraduated();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    constructor(
        IPoolManager _poolManager,
        ClawclickConfig _config
    ) BaseHook(_poolManager) {
        config = _config;
    }
    
    /*//////////////////////////////////////////////////////////////
                            HOOK PERMISSIONS
    //////////////////////////////////////////////////////////////*/
    
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: true,
            afterInitialize: false,
            beforeAddLiquidity: true,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: true,
            afterRemoveLiquidity: false,
            beforeSwap: true,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: true,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    /*//////////////////////////////////////////////////////////////
                            FACTORY FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Register a new token launch
     * @dev Only callable by factory during deployment
     * @param key Pool key
     * @param token Token address
     * @param beneficiary Fee recipient (70%)
     * @param startMcap Initial MCAP in ETH (1-10 ETH)
     * @param sqrtPriceX96 Initial sqrtPrice
     */
    function registerLaunch(
        PoolKey calldata key,
        address token,
        address beneficiary,
        uint256 startMcap,
        uint160 sqrtPriceX96
    ) external {
        if (msg.sender != config.factory()) revert NotFactory();
        
        // ✅ SECURITY: Enforce minimum starting MCAP to prevent shallow liquidity graduation
        require(startMcap >= MIN_START_MCAP, "Start MCAP too low");
        
        PoolId poolId = key.toId();
        
        // Determine base tax from starting MCAP (via Config tax tiers)
        uint256 baseTax = config.getStartingTax(startMcap);
        
        launches[poolId] = Launch({
            token: token,
            beneficiary: beneficiary,
            startMcap: startMcap,
            baseTax: baseTax,
            startSqrtPrice: sqrtPriceX96,
            phase: Phase.PROTECTED,
            liquidityStage: 0,        // Bootstrap stage
            graduationMcap: 0         // Set on graduation
        });
        
        // Store token→PoolId mapping for LP Locker integration
        tokenToPoolId[token] = poolId;
        
        emit LaunchCreated(poolId, token, beneficiary, startMcap, baseTax);
    }
    
    /**
     * @notice Set activation override flag (dev seed buy in progress)
     * @dev Only callable by factory
     * @param poolId Pool ID
     * @param inProgress True to bypass restrictions, false to re-enable
     */
    function setActivationInProgress(PoolId poolId, bool inProgress) external {
        if (msg.sender != config.factory()) revert NotFactory();
        activationInProgress[poolId] = inProgress;
    }
    
    /*//////////////////////////////////////////////////////////////
                            HOOK CALLBACKS
    //////////////////////////////////////////////////////////////*/
    
    function beforeInitialize(
        address sender,
        PoolKey calldata key,
        uint160
    ) external view override returns (bytes4) {
        if (sender != config.factory()) revert NotFactory();
        return BaseHook.beforeInitialize.selector;
    }
    
    function beforeAddLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external view override returns (bytes4) {
        // Allow all liquidity operations - security enforced by NFT ownership (Factory owns NFT)
        // Hook's job is to enforce trading rules, not liquidity management
        return this.beforeAddLiquidity.selector;
    }
    
    function beforeRemoveLiquidity(
        address,
        PoolKey calldata,
        ModifyLiquidityParams calldata,
        bytes calldata
    ) external view override returns (bytes4) {
        // Allow all liquidity operations - security enforced by NFT ownership (Factory owns NFT)
        // Hook's job is to enforce trading rules, not liquidity management  
        return this.beforeRemoveLiquidity.selector;
    }
    
    /**
     * @notice Pre-swap checks and validations
     * @dev Called before every swap - performs safety checks only, NO fee collection
     * 
     * ✅ V4 PATTERN: Always return ZERO delta
     * ✅ Fee collection happens in afterSwap() with explicit poolManager.take()
     */
    function beforeSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();
        Launch storage launch = launches[poolId];
        if (launch.token == address(0)) revert LaunchNotFound();
        
        // ✅ DEV OVERRIDE: Bypass all restrictions during dev seed buy
        if (activationInProgress[poolId]) {
            return (BaseHook.beforeSwap.selector, toBeforeSwapDelta(0, 0), 0);
        }
        
        // First-buy activation check: pool must be activated before swaps
        IClawclickFactory factory = IClawclickFactory(config.factory());
        if (!factory.poolActivated(poolId)) {
            revert PoolNotActivated();
        }
        
        // ✅ Defensive: Explicit phase validation
        require(
            launch.phase == Phase.PROTECTED || launch.phase == Phase.GRADUATED,
            "Invalid phase"
        );
        
        // ═══════════════════════════════════════════════════════════════════════
        // PHASE 2 (GRADUATED): Autonomous liquidity staging + LP fee
        // ═══════════════════════════════════════════════════════════════════════
        if (launch.phase == Phase.GRADUATED) {
            // Autonomous rebalance check (only if not currently rebalancing)
            if (!_rebalancing && launch.liquidityStage < 3) {
                // Get current MCAP for stage detection
                (uint160 currentSqrtPrice,,,) = poolManager.getSlot0(poolId);
                uint256 mcapForStage = _getCurrentMcap(currentSqrtPrice);
                
                // Determine correct stage for current MCAP
                uint8 newStage = _getLiquidityStage(mcapForStage, launch.graduationMcap);
                
                // Trigger rebalance if stage has advanced
                if (newStage > launch.liquidityStage) {
                    _rebalanceLiquidity(poolId, launch, newStage);
                    launch.liquidityStage = newStage;
                }
            }
            
            return (
                BaseHook.beforeSwap.selector,
                toBeforeSwapDelta(0, 0),
                GRADUATED_POOL_FEE  // 1% LP fee
            );
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PHASE 1 (PROTECTED): Validate limits only
        // ═══════════════════════════════════════════════════════════════════════
        
        // Get current MCAP
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        uint256 currentMcap = _getCurrentMcap(sqrtPriceX96);
        
        // ✅ Extract input amount based on swap type
        uint256 inputAmount;
        bool isExactInput = params.amountSpecified > 0;
        
        if (isExactInput) {
            inputAmount = uint256(params.amountSpecified);
        } else {
            inputAmount = uint256(-params.amountSpecified);
        }
        
        // ✅ SECURITY: Prevent dust griefing attacks
        require(inputAmount >= MIN_SWAP_AMOUNT, "Swap amount too small");
        
        // Check maxTx limit
        uint256 maxTx = _getMaxTx(currentMcap, launch.startMcap);
        if (inputAmount > maxTx) revert ExceedsMaxTx();
        
        // ✅ Return ZERO delta - fees collected in afterSwap()
        return (BaseHook.beforeSwap.selector, toBeforeSwapDelta(0, 0), 0);
    }
    
    /**
     * @notice Check and trigger graduation when epoch threshold is reached
     * @dev Simple epoch-based graduation (no timer)
     */
    function _checkGraduation(PoolId poolId, uint256 epoch) internal {
        Launch storage launch = launches[poolId];

        if (launch.phase == Phase.GRADUATED) return;

        if (epoch >= GRADUATION_EPOCH) {
            launch.phase = Phase.GRADUATED;

            // Graduation MCAP = startMcap * 16 (2^4)
            launch.graduationMcap = launch.startMcap * 16;

            // Initialize liquidity stage
            launch.liquidityStage = 1;

            // Get final MCAP for event
            (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
            uint256 finalMcap = _getCurrentMcap(sqrtPriceX96);

            emit PhaseChanged(poolId, Phase.GRADUATED, block.timestamp, finalMcap);
            emit Graduated(launch.token, poolId, block.timestamp, finalMcap);
        }
    }
    
    /**
     * @notice Collect tax and enforce maxWallet limit
     * @dev Called after swap completes - THIS IS WHERE TAX COLLECTION HAPPENS
     * 
     * ✅ V4 PATTERN: Use poolManager.take() for explicit settlement
     * ✅ Tax is collected AFTER swap, not before
     * ✅ No delta modification - settlement via take()
     */
    function afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata
    ) external override returns (bytes4, int128) {
        PoolId poolId = key.toId();
        Launch storage launch = launches[poolId];
        
        // Skip all hook logic during dev override
        if (activationInProgress[poolId]) {
            return (BaseHook.afterSwap.selector, 0);
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // GRADUATED PHASE: No tax, no limits
        // ═══════════════════════════════════════════════════════════════════════
        if (launch.phase == Phase.GRADUATED) {
            return (BaseHook.afterSwap.selector, 0);
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // PROTECTED PHASE: Collect tax + enforce limits
        // ═══════════════════════════════════════════════════════════════════════
        
        // Determine swap direction and input amount from delta
        bool isBuy = params.zeroForOne;  // ETH → Token
        
        // Extract input amount (what user actually spent)
        uint256 inputAmount;
        Currency feeCurrency;
        
        if (isBuy) {
            // Buy: ETH in (amount0), tokens out (amount1)
            // amount0 is negative (pool gave ETH), so we take absolute value
            int128 amount0 = delta.amount0();
            inputAmount = uint256(int256(-amount0));  // Convert negative to positive
            feeCurrency = key.currency0;  // ETH
        } else {
            // Sell: tokens in (amount1), ETH out (amount0)
            // amount1 is negative (pool gave tokens), so we take absolute value
            int128 amount1 = delta.amount1();
            inputAmount = uint256(int256(-amount1));  // Convert negative to positive
            feeCurrency = key.currency1;  // Token
        }
        
        // Get current MCAP and epoch
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        uint256 currentMcap = _getCurrentMcap(sqrtPriceX96);
        uint256 epoch = _getEpoch(currentMcap, launch.startMcap);
        
        // Calculate tax
        uint256 taxBps = _calculateTax(launch.baseTax, epoch);
        uint256 feeAmount = (inputAmount * taxBps) / BPS;
        
        // ✅ CRITICAL: Collect tax via poolManager.take()
        // This explicitly transfers tokens/ETH from pool to hook contract
        if (feeAmount > 0) {
            poolManager.take(feeCurrency, address(this), feeAmount);
            
            // Update accounting
            uint256 beneficiaryShare = (feeAmount * BENEFICIARY_SHARE_BPS) / BPS;
            uint256 platformShare = feeAmount - beneficiaryShare;
            
            if (isBuy) {
                // ETH fees
                beneficiaryFeesETH[launch.beneficiary] += beneficiaryShare;
                platformFeesETH += platformShare;
            } else {
                // Token fees
                beneficiaryFeesToken[launch.beneficiary][launch.token] += beneficiaryShare;
                platformFeesToken[launch.token] += platformShare;
            }
            
            emit FeesCollected(poolId, feeAmount, beneficiaryShare, platformShare, isBuy);
        }
        
        // Check graduation
        _checkGraduation(poolId, epoch);
        
        // ═══════════════════════════════════════════════════════════════════════
        // Enforce maxWallet on buys
        // ═══════════════════════════════════════════════════════════════════════
        if (isBuy) {
            // Get current MCAP for limit calculation
            uint256 maxWallet = _getMaxWallet(currentMcap, launch.startMcap);
            
            // Calculate tokens received (amount1 is positive for buys)
            int128 deltaAmount1 = delta.amount1();
            if (deltaAmount1 > 0) {
                uint256 tokensReceived = uint256(int256(deltaAmount1));
                uint256 newBalance = userBalances[poolId][msg.sender] + tokensReceived;
                
                if (newBalance > maxWallet) revert ExceedsMaxWallet();
                
                userBalances[poolId][msg.sender] = newBalance;
            }
        }
        
        return (BaseHook.afterSwap.selector, 0);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL LOGIC
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Calculate current MCAP from sqrtPrice
     * @dev Uses safe incremental division to avoid overflow
     * @param sqrtPriceX96 Current sqrt price in Q96 format
     * @return mcap Current MCAP in ETH (wei)
     */
    function _getCurrentMcap(uint160 sqrtPriceX96) internal pure returns (uint256 mcap) {
        // SAFE MCAP CALCULATION:
        // mcap = (TOTAL_SUPPLY * 2^192) / (sqrtPrice^2)
        //      = (TOTAL_SUPPLY * 2^96 / sqrtPrice) * (2^96 / sqrtPrice)
        
        uint256 intermediate = FullMath.mulDiv(
            TOTAL_SUPPLY,
            uint256(1 << 96),
            uint256(sqrtPriceX96)
        );
        
        mcap = FullMath.mulDiv(
            intermediate,
            uint256(1 << 96),
            uint256(sqrtPriceX96)
        );
    }
    
    /**
     * @notice Calculate epoch from growth ratio
     * @dev epoch = floor(log2(currentMcap / startMcap))
     * @param currentMcap Current MCAP in wei
     * @param startMcap Starting MCAP in wei
     * @return epoch Doubling epoch (0, 1, 2, 3, 4+)
     * 
     * ✅ FIX: Explicit epoch cap to prevent overflow
     */
    function _getEpoch(uint256 currentMcap, uint256 startMcap) internal pure returns (uint256 epoch) {
        if (currentMcap <= startMcap) return 0;
        
        uint256 ratio = currentMcap / startMcap;
        epoch = 0;
        
        // ✅ Explicit bound: stop at graduation epoch
        while (ratio >= 2 && epoch < GRADUATION_EPOCH) {
            ratio /= 2;
            epoch++;
        }
        
        // ✅ Defensive cap (prevents overflow if ratio bug happens)
        if (epoch > GRADUATION_EPOCH) {
            epoch = GRADUATION_EPOCH;
        }
    }
    
    /**
     * @notice Calculate tax from base tax and epoch
     * @dev tax = baseTax / (2^epoch), floor at 1%
     * @param baseTax Starting tax in bps
     * @param epoch Current epoch
     * @return taxBps Tax in bps
     */
    function _calculateTax(uint256 baseTax, uint256 epoch) internal pure returns (uint256 taxBps) {
        // Apply doubling decay: tax = baseTax / (2^epoch)
        taxBps = baseTax >> epoch;  // Bit shift is equivalent to division by 2^epoch
        
        // Floor at 1%
        if (taxBps < TAX_FLOOR_BPS) {
            taxBps = TAX_FLOOR_BPS;
        }
    }
    
    /**
     * NOTE: _getBaseTaxForMcap() was removed - now uses ClawclickConfig.getStartingTax()
     * Tax tiers are defined in ClawclickConfig and are immutable after deployment.
     * This eliminates duplicate definitions and ensures single source of truth.
     */
    
    /**
     * @notice Get maxTx limit
     * @dev maxBps = baseLimitBps * growthRatio, minimum 0.1%
     * @param currentMcap Current MCAP in wei
     * @param startMcap Starting MCAP in wei
     * @return maxTx Maximum transaction amount
     */
    function _getMaxTx(uint256 currentMcap, uint256 startMcap) internal pure returns (uint256 maxTx) {
        uint256 growthRatio = (currentMcap * BPS) / startMcap;  // Scale by BPS for precision
        uint256 limitBps = (BASE_LIMIT_BPS * growthRatio) / BPS;
        
        // Minimum 0.1%
        if (limitBps < BASE_LIMIT_BPS) {
            limitBps = BASE_LIMIT_BPS;
        }
        
        maxTx = (TOTAL_SUPPLY * limitBps) / BPS;
    }
    
    /**
     * @notice Get maxWallet limit
     * @dev Same as maxTx for simplicity
     * @param currentMcap Current MCAP in wei
     * @param startMcap Starting MCAP in wei
     * @return maxWallet Maximum wallet balance
     */
    function _getMaxWallet(uint256 currentMcap, uint256 startMcap) internal pure returns (uint256 maxWallet) {
        return _getMaxTx(currentMcap, startMcap);
    }
    
    /*//////////////////////////////////////////////////////////////
                            FEE CLAIMING
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Claim accumulated beneficiary ETH fees
     * @dev Anyone can call (fees are per-beneficiary)
     * @param beneficiary Beneficiary address
     */
    function claimBeneficiaryFeesETH(address beneficiary) external nonReentrant {
        uint256 amount = beneficiaryFeesETH[beneficiary];
        if (amount == 0) revert NoFeesToClaim();
        
        beneficiaryFeesETH[beneficiary] = 0;
        
        (bool success,) = beneficiary.call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit FeesClaimed(beneficiary, amount, ETH);
    }
    
    /**
     * @notice Claim accumulated beneficiary token fees
     * @dev Anyone can call (fees are per-beneficiary per token)
     * @param beneficiary Beneficiary address
     * @param token Token address
     */
    function claimBeneficiaryFeesToken(address beneficiary, address token) external nonReentrant {
        uint256 amount = beneficiaryFeesToken[beneficiary][token];
        if (amount == 0) revert NoFeesToClaim();
        
        beneficiaryFeesToken[beneficiary][token] = 0;
        
        // Transfer tokens (assumes token implements transfer correctly)
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", beneficiary, amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert TransferFailed();
        }
        
        emit FeesClaimed(beneficiary, amount, token);
    }
    
    /**
     * @notice Claim accumulated platform ETH fees
     * @dev Only callable by treasury
     */
    function claimPlatformFeesETH() external nonReentrant {
        if (msg.sender != config.treasury()) revert NotTreasury();
        
        uint256 amount = platformFeesETH;
        if (amount == 0) revert NoFeesToClaim();
        
        platformFeesETH = 0;
        
        (bool success,) = config.treasury().call{value: amount}("");
        if (!success) revert TransferFailed();
        
        emit FeesClaimed(config.treasury(), amount, ETH);
    }
    
    /**
     * @notice Claim accumulated platform token fees
     * @dev Only callable by treasury
     * @param token Token address
     */
    function claimPlatformFeesToken(address token) external nonReentrant {
        if (msg.sender != config.treasury()) revert NotTreasury();
        
        uint256 amount = platformFeesToken[token];
        if (amount == 0) revert NoFeesToClaim();
        
        platformFeesToken[token] = 0;
        
        // Transfer tokens
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", config.treasury(), amount)
        );
        if (!success || (data.length > 0 && !abi.decode(data, (bool)))) {
            revert TransferFailed();
        }
        
        emit FeesClaimed(config.treasury(), amount, token);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Get current tax for a pool
     * @param poolId Pool ID
     * @return taxBps Current tax in bps (or 0 if graduated)
     */
    function getCurrentTax(PoolId poolId) external view returns (uint256 taxBps) {
        Launch storage launch = launches[poolId];
        if (launch.phase == Phase.GRADUATED) return 0;
        
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        uint256 currentMcap = _getCurrentMcap(sqrtPriceX96);
        uint256 epoch = _getEpoch(currentMcap, launch.startMcap);
        
        taxBps = _calculateTax(launch.baseTax, epoch);
    }
    
    /**
     * @notice Get current position limits for a pool
     * @param poolId Pool ID
     * @return maxTx Maximum transaction amount
     * @return maxWallet Maximum wallet balance
     */
    function getCurrentLimits(PoolId poolId) external view returns (uint256 maxTx, uint256 maxWallet) {
        Launch storage launch = launches[poolId];
        if (launch.phase == Phase.GRADUATED) {
            return (type(uint256).max, type(uint256).max);
        }
        
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        uint256 currentMcap = _getCurrentMcap(sqrtPriceX96);
        
        maxTx = _getMaxTx(currentMcap, launch.startMcap);
        maxWallet = _getMaxWallet(currentMcap, launch.startMcap);
    }
    
    /**
     * @notice Get current epoch for a pool
     * @param poolId Pool ID
     * @return epoch Current doubling epoch
     */
    function getCurrentEpoch(PoolId poolId) external view returns (uint256 epoch) {
        Launch storage launch = launches[poolId];
        
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        uint256 currentMcap = _getCurrentMcap(sqrtPriceX96);
        
        epoch = _getEpoch(currentMcap, launch.startMcap);
    }
    
    /**
     * @notice Check if a pool is graduated
     * @param poolId Pool ID
     * @return graduated True if graduated
     */
    function isGraduated(PoolId poolId) external view returns (bool graduated) {
        return launches[poolId].phase == Phase.GRADUATED;
    }
    
    /**
     * @notice Check if a token is graduated (for LP Locker integration)
     * @param token Token address
     * @return graduated True if graduated
     */
    function isGraduatedByToken(address token) external view returns (bool graduated) {
        PoolId poolId = tokenToPoolId[token];
        return launches[poolId].phase == Phase.GRADUATED;
    }
    
    /**
     * @notice Get PoolId for a token (for LP Locker integration)
     * @param token Token address
     * @return poolId Pool ID
     */
    function getPoolIdForToken(address token) external view returns (PoolId poolId) {
        return tokenToPoolId[token];
    }

    /*//////////////////////////////////////////////////////////////
                    LIQUIDITY STAGING (POST-GRADUATION)
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Determine liquidity stage based on current MCAP
     * @dev Stage detection is independent of tax epoch logic
     * @param currentMcap Current MCAP in wei
     * @param G Graduation MCAP (startMcap * 16)
     * @return stage Liquidity stage (1, 2, or 3)
     */
    function _getLiquidityStage(uint256 currentMcap, uint256 G) internal pure returns (uint8 stage) {
        if (currentMcap < G * 6) {
            return 1;
        } else if (currentMcap < G * 60) {
            return 2;
        } else {
            return 3;
        }
    }
    
    /**
     * @notice Get MCAP range bounds for a liquidity stage
     * @dev Progressive expansion: Stage 1 [G, G*6], Stage 2 [G*6, G*60], Stage 3 [G*60, G*6000]
     * @param stage Liquidity stage (1, 2, or 3)
     * @param G Graduation MCAP (startMcap * 16)
     * @return lowerMcap Lower bound in wei
     * @return upperMcap Upper bound in wei
     */
    function _getStageRange(uint8 stage, uint256 G) internal pure returns (uint256 lowerMcap, uint256 upperMcap) {
        if (stage == 1) {
            return (G, G * 6);
        } else if (stage == 2) {
            return (G * 6, G * 60);
        } else {
            return (G * 60, G * 6000);
        }
    }
    
    /**
     * @notice Convert MCAP to aligned tick
     * @dev Converts MCAP → price → sqrtPrice → tick → aligned tick
     * @param mcap Market cap in wei
     * @return tick Aligned tick (aligned to tickSpacing)
     */
    function _mcapToTick(uint256 mcap) internal pure returns (int24 tick) {
        // MCAP → sqrtPriceX96
        // sqrtPriceX96 = sqrt(TOTAL_SUPPLY / mcap) * 2^96
        uint256 ratioX96 = FullMath.mulDiv(TOTAL_SUPPLY, FixedPoint96.Q96, mcap);
        uint256 sqrtRatioX96 = _sqrt(ratioX96);
        require(sqrtRatioX96 > 0 && sqrtRatioX96 <= type(uint160).max, "Invalid sqrtPrice");
        
        // sqrtPrice → tick
        int24 rawTick = TickMath.getTickAtSqrtPrice(uint160(sqrtRatioX96));
        
        // Align to tickSpacing (200)
        int24 tickSpacing = 200;
        tick = (rawTick / tickSpacing) * tickSpacing;
        
        return tick;
    }
    
    /**
     * @notice Autonomous liquidity rebalancing (called during swap)
     * @dev Executes full migration: decrease 100% → collect all → mint new position
     * @param poolId Pool ID
     * @param launch Launch storage reference
     * @param newStage New liquidity stage to transition to
     */
    function _rebalanceLiquidity(
        PoolId poolId,
        Launch storage launch,
        uint8 newStage
    ) internal {
        // Adjustable repositioning model: rebalancing done via Factory.reposition()
        // This function is obsolete but kept for compilation compatibility
        require(!_rebalancing, "Rebalance in progress");
        require(launch.phase == Phase.GRADUATED, "Not graduated");
        require(newStage > launch.liquidityStage, "Invalid stage transition");
        
        // TODO: Implement Factory-triggered repositioning
        // For now: no-op, manual reposition() call required
        launch.liquidityStage = newStage;
        emit LiquidityRebalanced(poolId, 0, newStage);
    }
    
    /**
     * @notice Babylonian square root (Newton's method)
     * @param x Value to take square root of
     * @return y Square root of x
     */
    function _sqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) return 0;
        
        uint256 z = (x + 1) / 2;
        y = x;
        
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }

    /*//////////////////////////////////////////////////////////////
                        RECEIVE ETHER
    //////////////////////////////////////////////////////////////*/
    
    receive() external payable {}
}
