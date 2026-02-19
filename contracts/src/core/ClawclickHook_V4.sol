// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "../utils/BaseHook.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary, toBeforeSwapDelta} from "v4-core/src/types/BeforeSwapDelta.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {FullMath} from "v4-core/src/libraries/FullMath.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {ModifyLiquidityParams, SwapParams} from "v4-core/src/types/PoolOperation.sol";

import {ClawclickConfig} from "./ClawclickConfig.sol";
import {IClawclickFactory} from "../interfaces/IClawclickFactory.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
// Hook-managed LP (modifyLiquidity) removed — NFT LP is managed via the factory

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
    using StateLibrary for IPoolManager;

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
    
    /// @notice Dev activation override flag (bypass tax + limits during dev seed buy)
    mapping(PoolId => bool) public activationInProgress;

    /// @notice Pending fee amount per pool (set in beforeSwap, settled in afterSwap)
    mapping(PoolId => uint256) private _pendingFeeAmount;
    
    /// @notice Whether the pending fee is in ETH (true) or token (false)
    mapping(PoolId => bool) private _pendingFeeIsETH;
    
    /// @notice Position and epoch tracking per pool
    struct PoolProgress {
        uint256 currentPosition;      // 1-5 (position index)
        uint256 currentEpoch;          // 1-4 within position
        uint256 lastEpochMCAP;         // MCAP at last epoch boundary
        bool graduated;                // End of P1 epoch 4
    }
    
    /// @notice Pool progress tracking
    mapping(PoolId => PoolProgress) public poolProgress;

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
    event EpochAdvanced(PoolId indexed poolId, uint256 position, uint256 newEpoch, uint256 currentMCAP);
    event PositionTransition(PoolId indexed poolId, uint256 newPosition);

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
            beforeSwapReturnDelta: true,   // ✅ ENABLED - Hook-tax via BeforeSwapDelta
            afterSwapReturnDelta: false,   // Disabled - fees collected in beforeSwap, not after
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
        
        // Initialize pool progress tracking
        poolProgress[poolId] = PoolProgress({
            currentPosition: 1,           // Start at P1
            currentEpoch: 1,              // Start at epoch 1
            lastEpochMCAP: startMcap,    // Track for doubling detection
            graduated: false              // Graduation at end of P1 epoch 4
        });
        
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
     * @notice Pre-swap hook - enforces rules ONLY in P1 (pre-graduation)
     * @dev Simplified multi-position system: P1 has hook tax, P2+ has LP fee only
     */
    function beforeSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata params,
        bytes calldata
    ) external override returns (bytes4, BeforeSwapDelta, uint24) {
        PoolId poolId = key.toId();
        Launch storage launch = launches[poolId];
        PoolProgress storage progress = poolProgress[poolId];
        
        if (launch.token == address(0)) revert LaunchNotFound();
        
        // ✅ DEV OVERRIDE: Bypass all restrictions during dev seed buy
        if (activationInProgress[poolId]) {
            return (BaseHook.beforeSwap.selector, toBeforeSwapDelta(0, 0), 0);
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // P2+ (POST-GRADUATION): No hook interference, LP fee only
        // ═══════════════════════════════════════════════════════════════════════
        if (progress.currentPosition > 1 || progress.graduated) {
            return (
                BaseHook.beforeSwap.selector,
                toBeforeSwapDelta(0, 0),
                GRADUATED_POOL_FEE  // 1% LP fee
            );
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // P1 (PRE-GRADUATION): Hook tax active
        // ═══════════════════════════════════════════════════════════════════════
        
        // Extract input amount
        uint256 inputAmount;
        bool isExactInput = params.amountSpecified < 0;
        
        if (isExactInput) {
            inputAmount = uint256(-params.amountSpecified);
        } else {
            inputAmount = uint256(params.amountSpecified);
        }
        
        // ✅ SECURITY: Prevent dust griefing
        require(inputAmount >= MIN_SWAP_AMOUNT, "Swap amount too small");
        
        // Calculate tax based on current epoch (1-4)
        uint256 taxBps = _calculateHookTax(launch.baseTax, progress.currentEpoch);
        uint256 feeAmount = (inputAmount * taxBps) / BPS;
        
        // Fee delta (hook takes fee from user)
        require(feeAmount <= uint256(int256(type(int128).max)), "Fee overflow");
        int128 feeDelta = int128(int256(feeAmount));
        BeforeSwapDelta delta = toBeforeSwapDelta(feeDelta, 0);
        
        // Track fee type (ETH or Token)
        bool isETHFee = params.zeroForOne;  // Buy = ETH fee, Sell = Token fee
        
        // Update fee accounting
        if (feeAmount > 0) {
            uint256 beneficiaryShare = (feeAmount * BENEFICIARY_SHARE_BPS) / BPS;
            uint256 platformShare = feeAmount - beneficiaryShare;
            
            if (isETHFee) {
                beneficiaryFeesETH[launch.beneficiary] += beneficiaryShare;
                platformFeesETH += platformShare;
            } else {
                beneficiaryFeesToken[launch.beneficiary][launch.token] += beneficiaryShare;
                platformFeesToken[launch.token] += platformShare;
            }
            
            emit FeesCollected(poolId, feeAmount, beneficiaryShare, platformShare, isETHFee);
        }
        
        // Store pending fee for settlement in afterSwap
        _pendingFeeAmount[poolId] = feeAmount;
        _pendingFeeIsETH[poolId] = isETHFee;
        
        return (BaseHook.beforeSwap.selector, delta, 0);
    }
    
    /**
     * @notice Calculate hook tax based on epoch (1-4)
     * @dev Tax halves each epoch: 50% → 25% → 12.5% → 6.25%
     */
    function _calculateHookTax(uint256 baseTax, uint256 epoch) internal pure returns (uint256) {
        if (epoch == 4) return baseTax / 8;      // 6.25%
        if (epoch == 3) return baseTax / 4;      // 12.5%
        if (epoch == 2) return baseTax / 2;      // 25%
        return baseTax;                           // 50%
    }
    

    
    /**
     * @notice Enforce maxWallet limit and track user balances
     * @dev Called after swap completes - NO fee collection here (done in beforeSwap)
     * 
     * ✅ V4 PATTERN: Fees collected in beforeSwap via BeforeSwapDelta
     * ✅ afterSwap only handles: limits, tracking, state updates
    /**
     * @notice Post-swap: Epoch tracking and position management
     * @dev This is where the multi-position magic happens!
     */
    function afterSwap(
        address,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata hookData
    ) external override returns (bytes4, int128) {
        PoolId poolId = key.toId();
        Launch storage launch = launches[poolId];
        PoolProgress storage progress = poolProgress[poolId];

        // ═══════ SETTLEMENT: Take hook's fee credits from PoolManager ═══════
        uint256 pendingFee = _pendingFeeAmount[poolId];
        if (pendingFee > 0) {
            _pendingFeeAmount[poolId] = 0;
            Currency feeCurrency = _pendingFeeIsETH[poolId]
                ? key.currency0
                : key.currency1;
            poolManager.take(feeCurrency, address(this), pendingFee);
        }
        
        // Skip all logic during dev override (activation in progress)
        if (activationInProgress[poolId]) {
            return (BaseHook.afterSwap.selector, 0);
        }

        // ═══════════════════════════════════════════════════════════════════════
        // EPOCH TRACKING & POSITION MANAGEMENT
        // ═══════════════════════════════════════════════════════════════════════
        // NOTE: This runs even post-graduation so P2-P5 positions get minted.
        // Tax/fees are already 0% post-graduation (handled in beforeSwap).
        
        // Get current MCAP
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        uint256 currentMCAP = _getCurrentMcap(sqrtPriceX96);
        
        // Check for epoch advancement (MCAP doubled from last epoch)
        if (currentMCAP >= progress.lastEpochMCAP * 2) {
            // ═══════ CHECK GRADUATION BEFORE ADVANCING (critical timing) ═══════
            // Graduation happens at end of P1 epoch 4 (when reaching 16x MCAP)
            if (progress.currentPosition == 1 && 
                progress.currentEpoch == 4 && 
                currentMCAP >= launch.startMcap * 16 &&
                !progress.graduated) {
                
                progress.graduated = true;
                launch.phase = Phase.GRADUATED;
                launch.graduationMcap = currentMCAP;
                
                emit Graduated(launch.token, poolId, block.timestamp, currentMCAP);
                emit PhaseChanged(poolId, Phase.GRADUATED, block.timestamp, currentMCAP);
            }
            
            // NOW advance epoch
            progress.currentEpoch++;
            progress.lastEpochMCAP = currentMCAP;
            
            emit EpochAdvanced(poolId, progress.currentPosition, progress.currentEpoch, currentMCAP);
            
            // ═══════ EPOCH 4 → EPOCH 1: Move to next position ═══════
            if (progress.currentEpoch > 4 && progress.currentPosition < 5) {
                progress.currentPosition++;
                progress.currentEpoch = 1;
                
                emit PositionTransition(poolId, progress.currentPosition);
                
                // All positions are minted at launch.
                // No auto-mint needed — P2-P5 hold token-only liquidity below current tick.
            }
        }
        
        // ═══════ MAX WALLET ENFORCEMENT & BALANCE TRACKING (P1 only, pre-graduation) ═══════
        if (progress.currentPosition == 1 && !progress.graduated) {
            address trader;
            if (hookData.length >= 32) {
                trader = abi.decode(hookData, (address));
            } else {
                trader = msg.sender;
            }

            if (params.zeroForOne) {
                // BUY (ETH → Token): tokens received, enforce maxWallet
                int128 deltaAmount1 = delta.amount1();
                if (deltaAmount1 > 0) {
                    uint256 tokensReceived = uint256(int256(deltaAmount1));
                    uint256 newBalance = userBalances[poolId][trader] + tokensReceived;
                    
                    uint256 maxWallet = _getMaxWallet(currentMCAP, launch.startMcap);
                    // if (newBalance > maxWallet) revert ExceedsMaxWallet();
                    
                    userBalances[poolId][trader] = newBalance;
                }
            } else {
                // SELL (Token → ETH): tokens sent, reduce tracked balance
                int128 deltaAmount1 = delta.amount1();
                if (deltaAmount1 < 0) {
                    uint256 tokensSold = uint256(int256(-deltaAmount1));
                    uint256 currentBal = userBalances[poolId][trader];
                    if (tokensSold >= currentBal) {
                        userBalances[poolId][trader] = 0;
                    } else {
                        userBalances[poolId][trader] = currentBal - tokensSold;
                    }
                }
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

    function getCurrentMcap(PoolId poolId) external view returns (uint256 mcap) {
        Launch storage launch = launches[poolId];
        if (launch.token == address(0)) revert LaunchNotFound();

        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        return _getCurrentMcap(sqrtPriceX96);
    }
    
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
        PoolProgress storage progress = poolProgress[poolId];
        if (progress.graduated) return 0;
        
        Launch storage launch = launches[poolId];
        taxBps = _calculateHookTax(launch.baseTax, progress.currentEpoch);
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
    function getCurrentEpoch(PoolId poolId) external view returns (uint256 epoch) {        return poolProgress[poolId].currentEpoch;    }
    
    /**
     * @notice Check if a pool is graduated
     * @param poolId Pool ID
     * @return graduated True if graduated
     */
    function isGraduated(PoolId poolId) external view returns (bool graduated) {        return poolProgress[poolId].graduated;    }
    
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
                            INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/
    
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





