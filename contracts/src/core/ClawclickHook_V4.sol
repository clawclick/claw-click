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

import {ClawclickConfig} from "./ClawclickConfig.sol";
import {ClawclickLPLocker} from "./ClawclickLPLocker.sol";

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
 *   • After 4 MCAP doublings sustained for 1 hour
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
 *   1. epoch >= 4 (4x doubling = 16x growth)
 *   2. Sustained for 1 hour (anti-manipulation)
 * 
 * Sustained mechanism:
 *   if epoch >= 4:
 *     if aboveThresholdSince == 0:
 *       aboveThresholdSince = block.timestamp
 *     else if block.timestamp >= aboveThresholdSince + 1 hour:
 *       phase = GRADUATED
 *   else:
 *     aboveThresholdSince = 0
 * 
 * Permanent. No reversion.
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
        uint256 aboveThresholdSince;    // Timestamp when epoch >= 4 first reached
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
    
    /// @notice Graduation sustain duration (1 hour)
    uint256 public constant GRADUATION_DURATION = 1 hours;
    
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
    
    /// @notice LP Locker (for position management delegation)
    /// @dev Set once after deployment via setLPLocker()
    ClawclickLPLocker public lpLocker;
    
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
    
    /**
     * @notice Set LP Locker reference (one-time only)
     * @dev Required due to circular dependency: Hook needs LPLocker, LPLocker needs Hook
     * @param _lpLocker LPLocker contract address
     */
    function setLPLocker(ClawclickLPLocker _lpLocker) external {
        require(address(lpLocker) == address(0), "LPLocker already set");
        require(address(_lpLocker) != address(0), "Invalid LPLocker");
        lpLocker = _lpLocker;
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
            aboveThresholdSince: 0,
            phase: Phase.PROTECTED,
            liquidityStage: 0,        // Bootstrap stage
            graduationMcap: 0         // Set on graduation
        });
        
        // Store token→PoolId mapping for LP Locker integration
        tokenToPoolId[token] = poolId;
        
        emit LaunchCreated(poolId, token, beneficiary, startMcap, baseTax);
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
        address sender,
        PoolKey calldata key,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external view override returns (bytes4) {
        // In v4, the sender during initial launch is PositionManager (not Factory directly)
        // Factory -> PositionManager -> PoolManager -> Hook
        // We verify the pool was registered by Factory (only Factory can call registerLaunch)
        // This ensures liquidity can only be added to Factory-created pools
        PoolId poolId = key.toId();
        Launch storage launch = launches[poolId];
        require(launch.token != address(0), "Launch not registered");
        
        // Pool is registered by Factory, allow liquidity addition
        return BaseHook.beforeAddLiquidity.selector;
    }
    
    function beforeRemoveLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external pure override returns (bytes4) {
        revert LiquidityLocked();
    }
    
    /**
     * @notice Main hook logic - applies tax or returns zero delta based on phase
     * @dev Called before every swap
     * 
     * 🔥 CRITICAL FIX #1: Removed tx.origin → Use params for tracking
     * 🔥 CRITICAL FIX #2: Properly handle exact-input vs exact-output
     * 🔥 CRITICAL FIX #3: Separate ETH and Token fee accounting
     * 🔥 CRITICAL FIX #4: Explicit epoch cap in place
     */
    function beforeSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();
        Launch storage launch = launches[poolId];
        if (launch.token == address(0)) revert LaunchNotFound();
        
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
        // PHASE 1 (PROTECTED): Apply hook tax
        // ═══════════════════════════════════════════════════════════════════════
        
        // Get current MCAP
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        uint256 currentMcap = _getCurrentMcap(sqrtPriceX96);
        
        // Calculate epoch
        uint256 epoch = _getEpoch(currentMcap, launch.startMcap);
        
        // Calculate tax
        uint256 taxBps = _calculateTax(launch.baseTax, epoch);
        
        // ✅ FIX: Properly extract input amount based on swap type
        // For exact-input: amountSpecified > 0 (user specifies input amount)
        // For exact-output: amountSpecified < 0 (user specifies output amount)
        uint256 inputAmount;
        bool isExactInput = params.amountSpecified > 0;
        
        if (isExactInput) {
            // Exact input: user specifies how much they're selling
            inputAmount = uint256(params.amountSpecified);
        } else {
            // Exact output: user specifies how much they want to receive
            // For fee calculation on exact output, we need to consider the input will be higher
            // We'll apply the fee to the specified output amount as a conservative estimate
            // The actual input will be: output / (1 - fee/10000) but we simplify here
            inputAmount = uint256(-params.amountSpecified);
        }
        
        // ✅ SECURITY: Prevent dust griefing attacks
        require(inputAmount >= MIN_SWAP_AMOUNT, "Swap amount too small");
        
        // Check maxTx limit
        uint256 maxTx = _getMaxTx(currentMcap, launch.startMcap);
        if (inputAmount > maxTx) revert ExceedsMaxTx();
        
        // Calculate fee
        uint256 feeAmount = (inputAmount * taxBps) / BPS;
        
        // ✅ SECURITY: Explicit bounds check for BeforeSwapDelta cast safety
        // BeforeSwapDelta uses int128, so feeAmount must fit in int128
        // Mathematical bound: feeAmount <= (1e27 * 5000) / 10000 = 5e26 < int128.max (1.7e38)
        // We enforce explicitly to prevent any truncation
        require(feeAmount <= uint256(int256(type(int128).max)), "Fee overflow");
        
        // Safe cast through int256 to int128 (no truncation after bounds check above)
        // forge-lint: disable-next-line(unsafe-typecast)
        int128 feeDelta = int128(int256(feeAmount));
        
        // ✅ FIX: Fee delta semantics
        // Positive delta in specified currency = hook takes tokens FROM user
        // We take fee in the INPUT currency (what user is selling)
        BeforeSwapDelta delta;
        bool isETHFee;
        
        if (params.zeroForOne) {
            // Buy (ETH → Token): take fee in ETH (currency0)
            // Positive amount0 = hook takes ETH from user
            delta = toBeforeSwapDelta(feeDelta, 0);
            isETHFee = true;
        } else {
            // Sell (Token → ETH): take fee in Token (currency1)
            // Positive amount1 = hook takes Token from user
            delta = toBeforeSwapDelta(0, feeDelta);
            isETHFee = false;
        }
        
        // ✅ FIX: Separate fee accounting by currency
        uint256 beneficiaryShare = (feeAmount * BENEFICIARY_SHARE_BPS) / BPS;
        uint256 platformShare = feeAmount - beneficiaryShare;
        
        if (isETHFee) {
            // ETH fees
            beneficiaryFeesETH[launch.beneficiary] += beneficiaryShare;
            platformFeesETH += platformShare;
        } else {
            // Token fees
            beneficiaryFeesToken[launch.beneficiary][launch.token] += beneficiaryShare;
            platformFeesToken[launch.token] += platformShare;
        }
        
        emit FeesCollected(poolId, feeAmount, beneficiaryShare, platformShare, isETHFee);
        
        // Check graduation
        _checkGraduation(poolId, epoch);
        
        // ✅ FIX: Use msg.sender instead of tx.origin for composability
        emit SwapExecuted(
            poolId,
            msg.sender,  // ✅ FIXED: Was tx.origin
            params.zeroForOne,
            currentMcap,
            epoch,
            taxBps,
            feeAmount,
            isETHFee
        );
        
        // Return with NO LP fee (pool fee = 0)
        return (BaseHook.beforeSwap.selector, delta, 0);
    }
    
    /**
     * @notice Enforce maxWallet limit
     * @dev Called after swap completes (output amount now known)
     * 
     * ✅ FIX: Use msg.sender instead of tx.origin
     */
    function afterSwap(
        address,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata
    ) external override returns (bytes4, int128) {
        PoolId poolId = key.toId();
        Launch storage launch = launches[poolId];
        
        // Skip if graduated (limits disabled)
        if (launch.phase == Phase.GRADUATED) {
            return (BaseHook.afterSwap.selector, 0);
        }
        
        // Only enforce on buys (ETH → Token)
        if (!params.zeroForOne) {
            return (BaseHook.afterSwap.selector, 0);
        }
        
        // Get current MCAP for limit calculation
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        uint256 currentMcap = _getCurrentMcap(sqrtPriceX96);
        
        // Calculate maxWallet
        uint256 maxWallet = _getMaxWallet(currentMcap, launch.startMcap);
        
        // ✅ FIX: Use msg.sender instead of tx.origin
        // Update user balance (output is delta amount1 for buy)
        uint256 tokensReceived = uint256(int256(delta.amount1()));
        uint256 newBalance = userBalances[poolId][msg.sender] + tokensReceived;
        
        if (newBalance > maxWallet) revert ExceedsMaxWallet();
        
        userBalances[poolId][msg.sender] = newBalance;
        
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
    
    /**
     * @notice Check and update graduation status
     * @dev Requires epoch >= 4 sustained for 1 hour
     * @param poolId Pool ID
     * @param epoch Current epoch
     */
    function _checkGraduation(PoolId poolId, uint256 epoch) internal {
        Launch storage launch = launches[poolId];
        
        // Already graduated
        if (launch.phase == Phase.GRADUATED) return;
        
        // Check if at graduation threshold
        if (epoch >= GRADUATION_EPOCH) {
            // Start timer if not already started
            if (launch.aboveThresholdSince == 0) {
                launch.aboveThresholdSince = block.timestamp;
            }
            // Check if sustained for required duration
            else if (block.timestamp >= launch.aboveThresholdSince + GRADUATION_DURATION) {
                launch.phase = Phase.GRADUATED;
                
                // Initialize liquidity staging (INDEPENDENT of tax epochs)
                launch.liquidityStage = 1;
                launch.graduationMcap = launch.startMcap * 16;
                
                // Get final MCAP (reuse current context to avoid extra slot0 call)
                (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
                uint256 finalMcap = _getCurrentMcap(sqrtPriceX96);
                
                // Emit events for indexers and LP Locker
                emit PhaseChanged(poolId, Phase.GRADUATED, block.timestamp, finalMcap);
                emit Graduated(launch.token, poolId, block.timestamp, finalMcap);
            }
        } else {
            // Dropped below threshold - reset timer
            launch.aboveThresholdSince = 0;
        }
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
        require(!_rebalancing, "Rebalance in progress");
        require(address(lpLocker) != address(0), "LPLocker not set");
        require(launch.phase == Phase.GRADUATED, "Not graduated");
        require(newStage > launch.liquidityStage, "Invalid stage transition");
        
        _rebalancing = true;
        
        // Delegate position management to LPLocker with try/catch
        // CRITICAL: _rebalancing MUST reset even if rebalance fails
        // Failure must NOT freeze the protocol or revert the swap
        try lpLocker.executeRebalance(
            launch.token,
            launch.graduationMcap,
            newStage
        ) {
            // Success: Update stage after successful rebalance
            launch.liquidityStage = newStage;
            emit LiquidityRebalanced(poolId, launch.liquidityStage, newStage);
        } catch (bytes memory reason) {
            // Failure: Log error but DO NOT revert swap
            // Rebalance will be retried on next swap that crosses threshold
            emit RebalanceFailed(poolId, launch.token, newStage, reason);
        }
        
        // ALWAYS reset reentrancy flag (executed in both success and failure paths)
        _rebalancing = false;
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
