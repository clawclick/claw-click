// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {FullMath} from "v4-core/src/libraries/FullMath.sol";
import {FixedPoint96} from "v4-core/src/libraries/FixedPoint96.sol";
import {StateLibrary} from "v4-core/src/libraries/StateLibrary.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {Actions} from "v4-periphery/src/libraries/Actions.sol";
import {IAllowanceTransfer} from "permit2/src/interfaces/IAllowanceTransfer.sol";
import {LiquidityAmounts} from "v4-periphery/src/libraries/LiquidityAmounts.sol";
import {PositionInfo, PositionInfoLibrary} from "v4-periphery/src/libraries/PositionInfoLibrary.sol";

import {ClawclickToken} from "./ClawclickToken.sol";
import {ClawclickConfig} from "./ClawclickConfig.sol";
import {ClawclickHook} from "./ClawclickHook_V4.sol";

/**
 * @title ClawclickFactory
 * @notice Factory for creating MCAP-initialized Uniswap v4 token launches
 * @dev Deep Sea Engine - Deterministic AMM model
 * 
 * Launch Flow:
 *   1. User specifies target MCAP (1-10 ETH)
 *   2. Factory calculates deterministic price: price = targetMcap / totalSupply
 *   3. Factory converts price → sqrtPriceX96 using Q64.96 fixed-point math
 *   4. Factory deploys token (1B supply minted to factory)
 *   5. Factory initializes pool at calculated sqrtPrice
 *   6. Factory adds full-range liquidity (100% tokens, 0 ETH)
 *   7. Factory locks LP NFT permanently
 *   8. Hook enforces dynamic tax + maxTx/maxWallet based on live MCAP
 * 
 * Key Invariants:
 *   - Price is deterministic from target MCAP (no genesis gating)
 *   - All tokens liquid from block 1 (no supply throttling)
 *   - LP locked forever (protocol-owned liquidity)
 *   - ETH is always currency0 (address(0) < any token address)
 */
contract ClawclickFactory is Ownable, ReentrancyGuard {
    using PoolIdLibrary for PoolKey;
    using StateLibrary for IPoolManager;
    using PositionInfoLibrary for PositionInfo;

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Total supply per token (1 billion with 18 decimals)
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    
    /// @notice Basis points denominator
    uint256 public constant BPS = 10000;
    
    /// @notice Permit2 contract address (used for PositionManager token approvals)
    address public constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    
    /// @notice Minimum target MCAP (1 ETH)
    uint256 public constant MIN_TARGET_MCAP = 1 ether;
    
    /// @notice Maximum target MCAP (10 ETH)
    uint256 public constant MAX_TARGET_MCAP = 10 ether;
    
    /// @notice Full range tick bounds (valid for tickSpacing=60)
    /// @dev Must be multiples of tickSpacing: -887220 % 60 = 0 ✓
    int24 public constant TICK_LOWER = -887220; // Closest valid tick to MIN_TICK (-887272)
    int24 public constant TICK_UPPER = 887220;  // Closest valid tick to MAX_TICK (887272)

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Protocol configuration
    ClawclickConfig public immutable config;
    
    /// @notice Pool manager
    IPoolManager public immutable poolManager;
    
    /// @notice Hook contract
    ClawclickHook public immutable hook;
    
    /// @notice Position Manager (NFT LP owner/manager)
    address public immutable positionManager;
    
    /// @notice Premium tier fee (serious launches)
    uint256 public premiumFee;
    
    /// @notice Micro tier fee (experiments)
    uint256 public microFee;
    
    /// @notice Total launches created
    uint256 public totalLaunches;
    
    /// @notice Launch info by token address
    mapping(address => LaunchInfo) public launchByToken;
    
    /// @notice Launch info by pool ID
    mapping(PoolId => LaunchInfo) public launchByPoolId;
    
    /// @notice Pool state (multi-position tracking)
    mapping(PoolId => PoolState) public poolStates;
    
    /// @notice Position token ID to Pool ID mapping (for position management)
    mapping(uint256 => PoolId) public tokenIdToPoolId;
    
    struct PoolState {
        address token;
        address beneficiary;
        uint256 startingMCAP;           // Initial MCAP at launch
        uint256 graduationMCAP;         // 16x starting MCAP
        uint256 totalSupply;            // Token total supply
        uint256[5] positionTokenIds;    // NFT token IDs for all 5 positions
        bool[5] positionMinted;         // Track which positions exist
        bool[5] positionRetired;        // Track which positions are withdrawn
        uint256 recycledETH;            // ETH from withdrawn positions
        bool activated;                 // Pool has been activated
        bool graduated;                 // Reached 16x MCAP
    }
    
    /// @notice Dev 15% supply cap
    uint256 public constant MAX_DEV_SUPPLY_BPS = 1500; // 15%
    
    /// @notice All launch tokens (for enumeration)
    address[] public allTokens;

    /*//////////////////////////////////////////////////////////////
                                TYPES
    //////////////////////////////////////////////////////////////*/
    
    struct LaunchInfo {
        address token;
        address beneficiary;
        address agentWallet;
        address creator;
        PoolId poolId;
        PoolKey poolKey;
        uint256 targetMcapETH;    // Initial MCAP (1-10 ETH)
        uint256 createdAt;
        uint256 createdBlock;
        string name;
        string symbol;
        bool isPremium;
    }
    
    struct CreateParams {
        string name;
        string symbol;
        address beneficiary;
        address agentWallet;
        bool isPremium;
        uint256 targetMcapETH;    // NEW: 1-10 ETH target
    }

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    
    event TokenLaunched(
        address indexed token,
        address indexed beneficiary,
        address indexed creator,
        PoolId poolId,
        uint256 targetMcapETH,
        uint160 sqrtPriceX96,
        string name,
        string symbol,
        bool isPremium
    );
    
    event FeesUpdated(uint256 premiumFee, uint256 microFee);
    event LaunchFeePaid(address indexed user, uint256 amount);
    event LiquidityAdded(address indexed token, PoolId indexed poolId, uint256 tokenAmount, uint256 liquidityMinted);
    event LiquidityRepositioned(address indexed token, PoolId indexed poolId, uint256 oldTokenId, uint256 newTokenId, int24 tickLower, int24 tickUpper);
    event PoolActivated(PoolId indexed poolId, bool isDevActivation, uint256 liquidityMinted);
    event PositionMinted(PoolId indexed poolId, uint256 indexed positionIndex, uint256 tokenId, uint256 tokenAmount);
    event PositionRetired(PoolId indexed poolId, uint256 indexed positionIndex, uint256 tokenId, uint256 ethRecovered, uint256 tokensRecovered);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error InsufficientFee();
    error InvalidParams();
    error ProtocolPaused();
    error NameTooLong();
    error SymbolTooLong();
    error EmptyName();
    error EmptySymbol();
    error ZeroBeneficiary();
    error FeeTransferFailed();
    error InvalidTargetMcap();
    error SqrtPriceOverflow();
    error TokenApprovalFailed();
    error LiquidityAddFailed();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    constructor(
        ClawclickConfig _config,
        IPoolManager _poolManager,
        ClawclickHook _hook,
        address _positionManager,
        address _owner
    ) Ownable(_owner) {
        config = _config;
        poolManager = _poolManager;
        hook = _hook;
        positionManager = _positionManager;
        
        // Default fees
        premiumFee = 0.001 ether;  // ~$2.30
        microFee = 0.0003 ether;   // ~$0.70
    }

    /*//////////////////////////////////////////////////////////////
                            LAUNCH FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Create a new token launch with deterministic MCAP-based price
     * @dev Mints ALL 5 positions at launch.
     *      P1 gets tokens + bootstrap ETH. P2-P5 get token-only one-sided liquidity.
     * @param params Launch parameters including target MCAP
     * @return token The created token address
     * @return poolId The pool ID for the token/ETH pair
     */
    function createLaunch(CreateParams calldata params) 
        external 
        payable 
        nonReentrant
        returns (address token, PoolId poolId) 
    {
        // Check protocol state
        if (config.paused()) revert ProtocolPaused();
        
        // Validate fee + bootstrap requirement
        uint256 requiredFee = params.isPremium ? premiumFee : microFee;
        uint256 minBootstrap = config.MIN_BOOTSTRAP_ETH();
        uint256 totalRequired = requiredFee + minBootstrap;
        
        if (msg.value < totalRequired) revert InsufficientFee();
        
        // Use all ETH above fee as bootstrap (deeper initial liquidity)
        uint256 bootstrapETH = msg.value - requiredFee;
        
        emit LaunchFeePaid(msg.sender, requiredFee);
        
        // Validate params
        _validateParams(params);
        
        // 1. Deploy token (supply minted to factory for liquidity provision)
        token = address(new ClawclickToken(
            params.name,
            params.symbol,
            address(this),  // Factory receives tokens to add liquidity
            params.beneficiary,
            params.agentWallet
        ));
        
        // 2. Calculate deterministic sqrtPrice from target MCAP
        uint160 sqrtPriceX96 = _calculateSqrtPrice(params.targetMcapETH);
        
        // 3. Create pool key
        PoolKey memory key = _createPoolKey(token);
        poolId = key.toId();
        
        // 4. Initialize pool at calculated price
        poolManager.initialize(key, sqrtPriceX96);
        
        // 5. Register launch with hook
        hook.registerLaunch(key, token, params.beneficiary, params.targetMcapETH, sqrtPriceX96);
        
        // 6. Calculate position ranges
        uint256 totalSupply = TOTAL_SUPPLY;
        (int24[5] memory tickLowers, int24[5] memory tickUppers, uint256[5] memory allocations) = 
            _calculatePositionRanges(params.targetMcapETH, totalSupply);
        
        // 7. Mint ALL P1-P5 positions at launch
        //    P1: tokens + bootstrap ETH (spans current price)
        //    P2-P5: token-only, one-sided liquidity (below current tick)
        //    Since current tick > P2-P5 upper ticks, those positions hold
        //    only token1 (Token). As price moves down through each range,
        //    the tokens become tradeable. No ETH needed for P2-P5.
        uint256[5] memory posTokenIds;
        bool[5] memory mintedFlags;
        
        for (uint256 i = 0; i < 5; i++) {
            uint256 ethForPosition = (i == 0) ? bootstrapETH : 0;
            posTokenIds[i] = _mintPositionViaManager(
                key,
                tickLowers[i],
                tickUppers[i],
                allocations[i],
                ethForPosition
            );
            mintedFlags[i] = true;
        }
        
        // 8. Store pool state
        PoolState memory poolState = PoolState({
            token: token,
            beneficiary: params.beneficiary,
            startingMCAP: params.targetMcapETH,
            graduationMCAP: params.targetMcapETH * config.POSITION_MCAP_MULTIPLIER(),
            totalSupply: totalSupply,
            positionTokenIds: posTokenIds,
            positionMinted: mintedFlags,
            positionRetired: [false, false, false, false, false],
            recycledETH: 0,
            activated: true,
            graduated: false
        });
        poolStates[poolId] = poolState;
        
        // Store reverse mappings for all positions
        for (uint256 i = 0; i < 5; i++) {
            tokenIdToPoolId[posTokenIds[i]] = poolId;
        }
        
        // 9. Store launch info
        LaunchInfo memory info = LaunchInfo({
            token: token,
            beneficiary: params.beneficiary,
            agentWallet: params.agentWallet,
            creator: msg.sender,
            poolId: poolId,
            poolKey: key,
            targetMcapETH: params.targetMcapETH,
            createdAt: block.timestamp,
            createdBlock: block.number,
            name: params.name,
            symbol: params.symbol,
            isPremium: params.isPremium
        });
        
        launchByToken[token] = info;
        launchByPoolId[poolId] = info;
        allTokens.push(token);
        totalLaunches++;
        
        // 10. Send launch fee to treasury
        (bool success,) = config.treasury().call{value: requiredFee}("");
        if (!success) revert FeeTransferFailed();
        
        emit LiquidityAdded(token, poolId, allocations[0], posTokenIds[0]);
        
        emit TokenLaunched(
            token,
            params.beneficiary,
            msg.sender,
            poolId,
            params.targetMcapETH,
            sqrtPriceX96,
            params.name,
            params.symbol,
            params.isPremium
        );
        
        return (token, poolId);
    }

    /*//////////////////////////////////////////////////////////////
                         PRICE CALCULATION
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Calculate sqrtPriceX96 from target MCAP using exact Q64.96 math
     * @dev CRITICAL: Understanding v4 price semantics
     * 
     * In Uniswap v4:
     *   sqrtPriceX96 = sqrt(amount1/amount0) * 2^96
     * 
     * For our pool (ETH=currency0, Token=currency1):
     *   sqrtPriceX96 = sqrt(token/ETH) * 2^96
     * 
     * We want: price_ETH_per_token = targetMcap / totalSupply
     * But sqrtPriceX96 represents: token/ETH = 1 / price_ETH_per_token
     * 
     * Therefore:
     *   sqrtPriceX96 = sqrt(totalSupply / targetMcap) * 2^96
     * 
     * Implementation:
     *   1. ratio = totalSupply / targetMcap (inverted price)
     *   2. ratioX96 = ratio * 2^96
     *   3. sqrtRatioX48 = sqrt(ratioX96) = sqrt(ratio * 2^96) = sqrt(ratio) * 2^48
     *   4. sqrtPriceX96 = sqrtRatioX48 * 2^48
     * 
     * @param targetMcapETH Target market cap in ETH (1-10 ETH)
     * @return sqrtPriceX96 The sqrt price in Q64.96 format
     */
    function _calculateSqrtPrice(uint256 targetMcapETH) internal pure returns (uint160 sqrtPriceX96) {
        if (targetMcapETH < MIN_TARGET_MCAP || targetMcapETH > MAX_TARGET_MCAP) {
            revert InvalidTargetMcap();
        }
        
        // Step 1: Calculate inverted ratio scaled by 2^96
        // ratioX96 = (totalSupply * 2^96) / targetMcap
        uint256 ratioX96 = FullMath.mulDiv(TOTAL_SUPPLY, FixedPoint96.Q96, targetMcapETH);
        
        // Step 2: Take square root
        // sqrt(ratioX96) = sqrt(totalSupply/targetMcap * 2^96) = sqrt(totalSupply/targetMcap) * 2^48
        uint256 sqrtRatioX48 = _sqrt(ratioX96);
        
        // Step 3: Scale back up to Q96
        // sqrtPriceX96 = sqrtRatioX48 * 2^48
        uint256 result = sqrtRatioX48 * (1 << 48);
        
        // ✅ SECURITY: Explicit bounds check for uint160 cast safety
        // sqrtPriceX96 must fit in uint160 per Uniswap v4 specification
        // Valid range: [MIN_SQRT_PRICE, MAX_SQRT_PRICE] both fit in uint160
        require(result > 0 && result <= type(uint160).max, "SqrtPrice overflow");
        
        // Safe cast: result bounds verified above
        // forge-lint: disable-next-line(unsafe-typecast)
        return uint160(result);
    }
    
    /**
     * @notice Babylonian square root method
     * @dev Gas-efficient iterative sqrt for uint256
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
                    MULTI-POSITION LIQUIDITY SYSTEM
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Calculate all 5 position ranges with 5% overlap
     * @dev Position ranges:
     *      P1: startMCAP → 16x (epochs 1-4, hook tax phase)
     *      P2: 16x → 256x (graduation, LP fee active)
     *      P3: 256x → 4,096x
     *      P4: 4,096x → 65,536x
     *      P5: 65,536x → infinity
     * 
     * @param startingMCAP Initial MCAP in ETH
     * @param totalSupply Token total supply
     * @return tickLowers Lower tick bounds for all 5 positions
     * @return tickUppers Upper tick bounds for all 5 positions
     * @return tokenAllocations Token amounts for all 5 positions
     */
    function _calculatePositionRanges(
        uint256 startingMCAP,
        uint256 totalSupply
    ) internal view returns (
        int24[5] memory tickLowers,
        int24[5] memory tickUppers,
        uint256[5] memory tokenAllocations
    ) {
        // Token allocations (geometric decay: 75%, 18.75%, 4.6875%, 1.1719%, 0.3906%)
        // Allocations sum to 100,000 (i.e. per 100k basis), so divide by BPS * 10
        uint256 allocDenom = config.BPS() * 10; // 100,000
        tokenAllocations[0] = (totalSupply * config.POSITION_1_ALLOCATION_BPS()) / allocDenom;
        tokenAllocations[1] = (totalSupply * config.POSITION_2_ALLOCATION_BPS()) / allocDenom;
        tokenAllocations[2] = (totalSupply * config.POSITION_3_ALLOCATION_BPS()) / allocDenom;
        tokenAllocations[3] = (totalSupply * config.POSITION_4_ALLOCATION_BPS()) / allocDenom;
        tokenAllocations[4] = (totalSupply * config.POSITION_5_ALLOCATION_BPS()) / allocDenom;
        
        // MCAP milestones (16x, 256x, 4096x, 65536x) with overflow protection
        uint256 multiplier = config.POSITION_MCAP_MULTIPLIER();
        uint256 p1End = startingMCAP * multiplier;
        require(p1End >= startingMCAP, "P1 overflow");
        
        uint256 p2End = p1End * multiplier;
        require(p2End >= p1End, "P2 overflow");
        
        uint256 p3End = p2End * multiplier;
        require(p3End >= p2End, "P3 overflow");
        
        uint256 p4End = p3End * multiplier;
        require(p4End >= p3End, "P4 overflow");
        
        uint256[5] memory mcapMilestones = [
            p1End,              // P1 end: 16x
            p2End,              // P2 end: 256x
            p3End,              // P3 end: 4096x
            p4End,              // P4 end: 65536x
            type(uint256).max   // P5 end: infinity
        ];
        
        uint256 overlapBps = config.POSITION_OVERLAP_BPS();
        
        // Calculate tick ranges with 5% overlap
        for (uint256 i = 0; i < 5; i++) {
            if (i == 0) {
                // P1: starts at initial MCAP
                tickLowers[i] = _mcapToTick(startingMCAP, totalSupply);
            } else {
                // P2-P5: start 5% before previous end (overlap)
                uint256 lowerMCAP = (mcapMilestones[i-1] * (BPS - overlapBps)) / BPS;
                tickLowers[i] = _mcapToTick(lowerMCAP, totalSupply);
            }
            
            if (i == 4) {
                // P5: ends at infinity MCAP → in ETH/Token pools, higher MCAP = lower tick
                // So infinity MCAP maps to the lowest possible tick
                tickUppers[i] = TICK_LOWER;
            } else {
                // P1-P4: end 5% after milestone (overlap)
                uint256 upperMCAP = (mcapMilestones[i] * (BPS + overlapBps)) / BPS;
                tickUppers[i] = _mcapToTick(upperMCAP, totalSupply);
            }
            
            // Ensure tick spacing alignment
            int24 spacing = 60; // Standard tick spacing for dynamic fee pools
            tickLowers[i] = (tickLowers[i] / spacing) * spacing;
            tickUppers[i] = (tickUppers[i] / spacing) * spacing;
            
            // Bounds check
            if (tickLowers[i] < TICK_LOWER) tickLowers[i] = TICK_LOWER;
            if (tickUppers[i] > TICK_UPPER) tickUppers[i] = TICK_UPPER;
            
            // FIX: For ETH(currency0)/Token(currency1) pairs, higher MCAP → lower tick.
            // _mcapToTick(lowerMCAP) returns a HIGHER tick than _mcapToTick(higherMCAP),
            // so tickLowers and tickUppers end up inverted. Swap to ensure tickLower < tickUpper.
            if (tickLowers[i] > tickUppers[i]) {
                int24 temp = tickLowers[i];
                tickLowers[i] = tickUppers[i];
                tickUppers[i] = temp;
            }
        }
        
        return (tickLowers, tickUppers, tokenAllocations);
    }
    
    /**
     * @notice Convert MCAP to tick
     * @dev MCAP = price × totalSupply
     *      price = MCAP / totalSupply (in ETH per token)
     *      sqrtPriceX96 = sqrt(inverted_price) * 2^96
     *      tick = log1.0001(sqrtPrice)
     */
    function _mcapToTick(
        uint256 mcap,
        uint256 totalSupply
    ) internal pure returns (int24) {
        // Calculate inverted ratio (token/ETH = totalSupply/MCAP)
        uint256 ratioX96 = FullMath.mulDiv(totalSupply, FixedPoint96.Q96, mcap);
        
        // Take square root
        uint256 sqrtRatioX48 = _sqrt(ratioX96);
        
        // Scale to Q96
        uint256 sqrtPriceX96 = sqrtRatioX48 * (1 << 48);
        
        // Convert to tick
        int24 tick = TickMath.getTickAtSqrtPrice(uint160(sqrtPriceX96));
        
        return tick;
    }
    
    /**
     * @notice Mint a position manually (fallback if not minted at launch)
     * @dev All positions are normally minted at launch. This is a safety fallback.
     *      Uses modifyLiquidities (requires PoolManager to NOT be locked).
     * @param poolId Pool identifier
     * @param positionIndex Position index (0-4)
     */
    function mintNextPosition(
        PoolId poolId,
        uint256 positionIndex
    ) external nonReentrant {
        PoolState storage state = poolStates[poolId];
        require(positionIndex < 5, "Invalid position");
        require(!state.positionMinted[positionIndex], "Already minted");
        
        // Get pre-calculated ranges
        (int24[5] memory tickLowers, int24[5] memory tickUppers, uint256[5] memory allocations) = 
            _calculatePositionRanges(state.startingMCAP, state.totalSupply);
        
        // Get pool key
        LaunchInfo memory info = launchByPoolId[poolId];
        
        // Pre-check: ensure liquidity will be > 0 at current price
        (uint160 curSqrtPrice,,,) = poolManager.getSlot0(poolId);
        uint160 sqrtLower = TickMath.getSqrtPriceAtTick(tickLowers[positionIndex]);
        uint160 sqrtUpper = TickMath.getSqrtPriceAtTick(tickUppers[positionIndex]);
        
        // Add recycled ETH if available
        uint256 ethToAdd = state.recycledETH;
        
        uint128 liq = LiquidityAmounts.getLiquidityForAmounts(
            curSqrtPrice, sqrtLower, sqrtUpper, ethToAdd, allocations[positionIndex]
        );
        require(liq > 0, "Position liquidity still 0 at current price");
        
        state.recycledETH = 0;
        
        // Mint position via V4 PositionManager
        uint256 tokenId = _mintPositionViaManager(
            info.poolKey,
            tickLowers[positionIndex],
            tickUppers[positionIndex],
            allocations[positionIndex],
            ethToAdd
        );
        
        // Store NFT token ID and mapping
        state.positionTokenIds[positionIndex] = tokenId;
        state.positionMinted[positionIndex] = true;
        tokenIdToPoolId[tokenId] = poolId;  // Store reverse mapping for withdrawal
        
        emit PositionMinted(poolId, positionIndex, tokenId, allocations[positionIndex]);
    }
    
    // mintNextPositionWithoutUnlock removed — all positions minted at launch
    
    /**
     * @notice Retire old position and recycle ETH
     * @dev Only Hook can trigger retirement
     * @param poolId Pool identifier
     * @param positionIndex Position index to retire (0-4)
     */
    function retireOldPosition(
        PoolId poolId,
        uint256 positionIndex
    ) external nonReentrant {
        require(msg.sender == address(hook), "Only hook");
        PoolState storage state = poolStates[poolId];
        require(positionIndex < 5, "Invalid position");
        require(state.positionMinted[positionIndex], "Not minted");
        require(!state.positionRetired[positionIndex], "Already retired");
        
        uint256 tokenId = state.positionTokenIds[positionIndex];
        require(tokenId != 0, "Invalid token ID");
        
        // Withdraw liquidity from position
        (uint256 ethRecovered, uint256 tokensRecovered) = _withdrawPositionViaManager(tokenId);
        
        // Store recycled ETH for next position
        state.recycledETH += ethRecovered;
        
        // Mark as retired
        state.positionRetired[positionIndex] = true;
        
        emit PositionRetired(poolId, positionIndex, tokenId, ethRecovered, tokensRecovered);
    }
    
    /**
     * @notice Internal: Mint position via V4 PositionManager
     * @param key Pool key
     * @param tickLower Lower tick bound
     * @param tickUpper Upper tick bound
     * @param tokenAmount Token amount
     * @param ethAmount ETH amount
     * @return tokenId NFT token ID of minted position
     */
    function _mintPositionViaManager(
        PoolKey memory key,
        int24 tickLower,
        int24 tickUpper,
        uint256 tokenAmount,
        uint256 ethAmount
    ) internal returns (uint256 tokenId) {
        address token = Currency.unwrap(key.currency1);
        
        // Get current price for liquidity calculation
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(key.toId());
        uint160 sqrtPriceLowerX96 = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtPriceUpperX96 = TickMath.getSqrtPriceAtTick(tickUpper);
        
        // Calculate liquidity
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceLowerX96,
            sqrtPriceUpperX96,
            ethAmount,
            tokenAmount
        );
        
        require(liquidity > 0, "Liquidity must be > 0");
        
        // Approve tokens for Permit2 and PositionManager
        ClawclickToken(token).approve(PERMIT2, tokenAmount);
        IAllowanceTransfer(PERMIT2).approve(
            token,
            positionManager,
            type(uint160).max,
            type(uint48).max
        );
        
        // Build PositionManager mint actions
        bytes memory actions = abi.encodePacked(
            uint8(Actions.MINT_POSITION),
            uint8(Actions.CLOSE_CURRENCY),
            uint8(Actions.CLOSE_CURRENCY)
        );
        
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(
            key,
            tickLower,
            tickUpper,
            uint256(liquidity),
            uint128(ethAmount),
            uint128(tokenAmount),
            address(this),
            bytes("")
        );
        params[1] = abi.encode(key.currency0);
        params[2] = abi.encode(key.currency1);
        
        bytes memory unlockData = abi.encode(actions, params);
        uint256 deadline = block.timestamp + 1 hours;
        
        // Execute mint
        IPositionManager(positionManager).modifyLiquidities{value: ethAmount}(unlockData, deadline);
        
        // Get newly minted token ID
        tokenId = IPositionManager(positionManager).nextTokenId() - 1;
        
        return tokenId;
    }
    
    // _mintPositionWithoutUnlock removed — all positions minted at launch via _mintPositionViaManager
    
    /**
     * @notice Internal: Withdraw position via V4 PositionManager
     * @param tokenId NFT token ID to withdraw
     * @return ethAmount ETH recovered
     * @return tokenAmount Tokens recovered
     */
    function _withdrawPositionViaManager(
        uint256 tokenId
    ) internal returns (uint256 ethAmount, uint256 tokenAmount) {
        // Get position liquidity
        uint128 liquidity = IPositionManager(positionManager).getPositionLiquidity(tokenId);
        require(liquidity > 0, "No liquidity");
        
        // FIX: Get PoolKey from stored mapping
        PoolId poolId = tokenIdToPoolId[tokenId];
        require(PoolId.unwrap(poolId) != bytes32(0), "PoolId not found");
        
        LaunchInfo storage launch = launchByPoolId[poolId];
        PoolKey memory key = launch.poolKey;
        
        uint256 ethBefore = address(this).balance;
        address token = Currency.unwrap(key.currency1);
        uint256 tokenBefore = ClawclickToken(token).balanceOf(address(this));
        
        // Build withdraw actions (decrease + collect + burn)
        bytes memory actions = abi.encodePacked(
            uint8(Actions.DECREASE_LIQUIDITY),
            uint8(Actions.BURN_POSITION),
            uint8(Actions.CLOSE_CURRENCY),
            uint8(Actions.CLOSE_CURRENCY)
        );
        
        bytes[] memory params = new bytes[](4);
        params[0] = abi.encode(tokenId, uint256(liquidity), uint128(0), uint128(0), bytes(""));
        params[1] = abi.encode(tokenId, uint128(0), uint128(0), bytes(""));
        params[2] = abi.encode(key.currency0);
        params[3] = abi.encode(key.currency1);
        
        bytes memory unlockData = abi.encode(actions, params);
        uint256 deadline = block.timestamp + 1 hours;
        
        // Execute withdraw
        IPositionManager(positionManager).modifyLiquidities(unlockData, deadline);
        
        // Calculate recovered amounts
        ethAmount = address(this).balance - ethBefore;
        tokenAmount = ClawclickToken(token).balanceOf(address(this)) - tokenBefore;
        
        return (ethAmount, tokenAmount);
    }

    /*//////////////////////////////////////////////////////////////
                         LIQUIDITY PROVISION (POSITIONMANAGER)
    //////////////////////////////////////////////////////////////*/
    
    /*//////////////////////////////////////////////////////////////
                         DEPRECATED (OLD SYSTEM)
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice DEPRECATED - Pools are now activated at launch with bootstrap ETH
     * @dev Kept for interface compatibility but reverts
     */
    function activatePool(PoolKey calldata) external payable {
        revert("Pools activated at launch");
    }
    
    /**
     * @notice DEPRECATED - Dev activation no longer needed
     * @dev Kept for interface compatibility but reverts
     */
    function activateAndSwapDev(PoolKey calldata) external payable {
        revert("Use regular launch flow");
    }
    
    /**
     * @notice DEPRECATED - No dev override in new system
     * @dev Kept for interface compatibility but reverts
     */
    function clearDevOverride(PoolKey calldata) external {
        revert("No dev override in new system");
    }
    
    /**
     * @notice Check dev token balance to enforce 15% cap
     * @dev Can be called by anyone to verify dev hasn't exceeded cap
     * @param poolId Pool ID
     * @param devAddress Developer address
     */
    function checkDevCap(PoolId poolId, address devAddress) external view returns (bool) {
        address token = poolStates[poolId].token;
        uint256 devBalance = ClawclickToken(token).balanceOf(devAddress);
        uint256 maxDevTokens = (TOTAL_SUPPLY * MAX_DEV_SUPPLY_BPS) / BPS;
        return devBalance <= maxDevTokens;
    }
    
    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    function setFees(uint256 _premiumFee, uint256 _microFee) external onlyOwner {
        premiumFee = _premiumFee;
        microFee = _microFee;
        emit FeesUpdated(_premiumFee, _microFee);
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    function getLaunchByToken(address token) external view returns (LaunchInfo memory) {
        return launchByToken[token];
    }
    
    function getLaunchByPoolId(PoolId poolId) external view returns (LaunchInfo memory) {
        return launchByPoolId[poolId];
    }
    
    function poolActivated(PoolId poolId) external view returns (bool) {
        return poolStates[poolId].activated;
    }
    
    function positionTokenId(PoolId poolId) external view returns (uint256) {
        // Return P1 token ID for backward compatibility with tests
        return poolStates[poolId].positionTokenIds[0];
    }
    
    function getPositionTokenIds(PoolId poolId) external view returns (uint256[5] memory) {
        return poolStates[poolId].positionTokenIds;
    }
    
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
    
    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }
    
    function getTokenAtIndex(uint256 index) external view returns (address) {
        return allTokens[index];
    }
    
    function getFee(bool isPremium) external view returns (uint256) {
        return isPremium ? premiumFee : microFee;
    }
    
    /**
     * @notice Preview sqrtPrice for a given target MCAP
     * @dev Useful for UI to show expected price before launch
     */
    function previewSqrtPrice(uint256 targetMcapETH) external pure returns (uint160) {
        return _calculateSqrtPrice(targetMcapETH);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/
    
    function _validateParams(CreateParams calldata params) internal pure {
        if (bytes(params.name).length == 0) revert EmptyName();
        if (bytes(params.symbol).length == 0) revert EmptySymbol();
        if (bytes(params.name).length > 64) revert NameTooLong();
        if (bytes(params.symbol).length > 12) revert SymbolTooLong();
        if (params.beneficiary == address(0)) revert ZeroBeneficiary();
        if (params.targetMcapETH < MIN_TARGET_MCAP || params.targetMcapETH > MAX_TARGET_MCAP) {
            revert InvalidTargetMcap();
        }
    }
    
    function _createPoolKey(address token) internal view returns (PoolKey memory) {
        // ETH (address(0)) is always currency0 (lower address)
        Currency currency0 = Currency.wrap(address(0));  // Native ETH
        Currency currency1 = Currency.wrap(token);
        
        // Dynamic fee flag (0x800000) - hook returns actual fee
        uint24 dynamicFeeFlag = 0x800000;
        
        return PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: dynamicFeeFlag,
            tickSpacing: 60,     // Standard tick spacing for dynamic fee pools
            hooks: IHooks(address(hook))
        });
    }
    
    /*//////////////////////////////////////////////////////////////
                         LP FEE COLLECTION
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Collect accrued LP fees from a specific position to treasury
     * @param poolId Pool identifier
     * @param positionIndex Position index (0-4)
     */
    function collectFeesFromPosition(PoolId poolId, uint256 positionIndex) external onlyOwner nonReentrant {
        PoolState storage state = poolStates[poolId];
        require(positionIndex < 5, "Invalid position");
        require(state.positionMinted[positionIndex], "Position not minted");
        require(!state.positionRetired[positionIndex], "Position retired");
        
        uint256 tokenId = state.positionTokenIds[positionIndex];
        require(tokenId != 0, "No position");
        
        LaunchInfo storage info = launchByPoolId[poolId];
        PoolKey memory key = info.poolKey;
        
        uint256 ethBefore = address(this).balance;
        uint256 tokenBefore = ClawclickToken(info.token).balanceOf(address(this));
        
        // Collect fees without removing liquidity
        bytes memory actions = abi.encodePacked(
            uint8(Actions.DECREASE_LIQUIDITY),
            uint8(Actions.CLOSE_CURRENCY),
            uint8(Actions.CLOSE_CURRENCY)
        );
        
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(tokenId, uint256(0), uint128(0), uint128(0), bytes(""));
        params[1] = abi.encode(key.currency0);
        params[2] = abi.encode(key.currency1);
        
        bytes memory unlockData = abi.encode(actions, params);
        uint256 deadline = block.timestamp + 1 hours;
        
        IPositionManager(positionManager).modifyLiquidities(unlockData, deadline);
        
        uint256 ethGained = address(this).balance - ethBefore;
        uint256 tokenGained = ClawclickToken(info.token).balanceOf(address(this)) - tokenBefore;
        
        // Send fees to treasury
        if (ethGained > 0) {
            (bool ok,) = config.treasury().call{value: ethGained}("");
            require(ok, "ETH transfer failed");
        }
        if (tokenGained > 0) {
            ClawclickToken(info.token).transfer(config.treasury(), tokenGained);
        }
    }

    receive() external payable {}
}
