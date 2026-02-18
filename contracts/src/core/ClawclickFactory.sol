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
    
    /// @notice Full range tick bounds (valid for tickSpacing=200)
    /// @dev Must be multiples of tickSpacing: -887220 % 200 != 0, so we use -887200
    int24 public constant TICK_LOWER = -887200; // Closest valid tick to MIN_TICK (-887272)
    int24 public constant TICK_UPPER = 887200;  // Closest valid tick to MAX_TICK (887272)

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
    
    /// @notice LP NFT token IDs by pool ID
    mapping(PoolId => uint256) public positionTokenId;
    
    /// @notice Pool activation status (true after first swap mints liquidity)
    mapping(PoolId => bool) public poolActivated;
    
    /// @notice Last epoch at which repositioning was performed
    mapping(PoolId => uint256) public lastRepositionedEpoch;
    
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
        
        // Validate fee
        uint256 requiredFee = params.isPremium ? premiumFee : microFee;
        if (msg.value < requiredFee) revert InsufficientFee();
        
        // Refund excess ETH
        if (msg.value > requiredFee) {
            (bool ok,) = msg.sender.call{value: msg.value - requiredFee}("");
            require(ok, "Refund failed");
        }
        
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
        
        // 5. Register launch with hook (BEFORE adding liquidity)
        hook.registerLaunch(key, token, params.beneficiary, params.targetMcapETH, sqrtPriceX96);
        
        // 6. Pool initialized with NO liquidity - awaits first-buy activation
        // First swap will trigger Factory.activatePool() which mints balanced position
        
        // 7. Store launch info
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
        
        // 9. Send launch fee to treasury
        (bool success,) = config.treasury().call{value: requiredFee}("");
        if (!success) revert FeeTransferFailed();
        
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
                         LIQUIDITY PROVISION (POSITIONMANAGER)
    //////////////////////////////////////////////////////////////*/
    
    /*//////////////////////////////////////////////////////////////
                        FIRST-BUY ACTIVATION
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Activate pool by minting balanced tight position
     * @dev Anyone can activate by providing ETH (uses Factory's tokens for balance)
     *      Must be called before first swap, otherwise swaps will revert
     * @param key Pool key
     */
    function activatePool(
        PoolKey calldata key
    ) external payable nonReentrant {
        PoolId poolId = key.toId();
        require(!poolActivated[poolId], "Already activated");
        require(msg.value > 0, "ETH required");
        
        // Mark activated BEFORE minting liquidity (prevent reentrancy)
        poolActivated[poolId] = true;
        _mintInitialTightPosition(key, msg.value);
    }
    
    /**
     * @notice Dev path: Activate pool and enable override for dev swap
     * @dev Only launch creator can call. Enables tax/limit bypass for dev.
     *      Dev must then call Uniswap v4 Universal Router to execute swap.
     *      After swap, call clearDevOverride() to re-enable protections.
     * 
     *      Uniswap v4 Universal Router (Sepolia): 0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af
     * 
     * @param key Pool key
     */
    function activateAndSwapDev(
        PoolKey calldata key
    ) external payable nonReentrant {
        PoolId poolId = key.toId();
        LaunchInfo storage info = launchByPoolId[poolId];
        
        require(msg.sender == info.creator, "Only creator");
        require(!poolActivated[poolId], "Already activated");
        require(msg.value > 0, "ETH required");
        
        // ✅ SECURITY: Mark activated BEFORE any external calls
        poolActivated[poolId] = true;
        
        // Set override flag in hook (bypass tax + limits for dev swap)
        hook.setActivationInProgress(poolId, true);
        
        // Mint tight balanced liquidity
        _mintInitialTightPosition(key, msg.value);
        
        emit PoolActivated(poolId, true, positionTokenId[poolId]);
        
        // NOTE: Dev must now execute swap via Uniswap v4 Universal Router
        // Router address (Sepolia): 0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af
        // After swap completes, call clearDevOverride() to re-enable protections
    }
    
    /**
     * @notice Clear dev override flag after swap completes
     * @dev Only launch creator can call. Re-enables tax + limits.
     * @param key Pool key
     */
    function clearDevOverride(PoolKey calldata key) external nonReentrant {
        PoolId poolId = key.toId();
        LaunchInfo storage info = launchByPoolId[poolId];
        
        require(msg.sender == info.creator, "Only creator");
        require(poolActivated[poolId], "Not activated");
        
        // Clear override flag (re-enable tax + limits)
        hook.setActivationInProgress(poolId, false);
    }
    
    /**
     * @notice Check dev token balance to enforce 15% cap
     * @dev Can be called by anyone to verify dev hasn't exceeded cap
     * @param poolId Pool ID
     * @param devAddress Developer address
     */
    function checkDevCap(PoolId poolId, address devAddress) external view returns (bool) {
        address token = launchByPoolId[poolId].token;
        uint256 devBalance = ClawclickToken(token).balanceOf(devAddress);
        uint256 maxDevTokens = (TOTAL_SUPPLY * MAX_DEV_SUPPLY_BPS) / BPS;
        return devBalance <= maxDevTokens;
    }
    
    /**
     * @notice Calculate token amount for balanced mint given ETH amount
     * @dev tokenAmount = ethAmount * (sqrtPrice^2 / 2^192)
     */
    function _calculateTokenAmountFromETH(
        PoolKey memory key,
        uint256 ethAmount
    ) internal view returns (uint256 tokenAmount) {
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(key.toId());

        uint256 intermediate = FullMath.mulDiv(
            ethAmount,
            uint256(sqrtPriceX96),
            uint256(1 << 96)
        );

        tokenAmount = FullMath.mulDiv(
            intermediate,
            uint256(sqrtPriceX96),
            uint256(1 << 96)
        );
    }

    /**
     * @notice Mint initial concentrated NFT position for epoch 0
     * @dev Uses PositionManager (factory owns LP NFT)
     */
    function _mintInitialTightPosition(
        PoolKey memory key,
        uint256 ethAmount
    ) internal {
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(key.toId());
        int24 currentTick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);
        int24 spacing = key.tickSpacing;
        
        // Align current tick to tickSpacing
        int24 alignedTick = (currentTick / spacing) * spacing;
        
        // Wide initial range: ±140 spacings around current price
        int24 tickLower = alignedTick - spacing * 140;
        int24 tickUpper = alignedTick + spacing * 140;
        if (tickLower < TICK_LOWER) tickLower = TICK_LOWER;
        if (tickUpper > TICK_UPPER) tickUpper = TICK_UPPER;
        
        // Calculate balanced token amount
        uint256 tokenAmount = _calculateTokenAmountFromETH(key, ethAmount);
        address token = Currency.unwrap(key.currency1);
        
        // Calculate liquidity
        uint160 sqrtPriceLowerX96 = TickMath.getSqrtPriceAtTick(tickLower);
        uint160 sqrtPriceUpperX96 = TickMath.getSqrtPriceAtTick(tickUpper);
        
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmounts(
            sqrtPriceX96,
            sqrtPriceLowerX96,
            sqrtPriceUpperX96,
            ethAmount,
            tokenAmount
        );
        
        require(liquidity > 0, "Liquidity must be > 0");
        
        // Approve Permit2 then PositionManager pull rights
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

        IPositionManager(positionManager).modifyLiquidities{value: ethAmount}(unlockData, deadline);

        uint256 tokenId = IPositionManager(positionManager).nextTokenId() - 1;
        positionTokenId[key.toId()] = tokenId;
        lastRepositionedEpoch[key.toId()] = hook.getCurrentEpoch(key.toId());

        emit LiquidityAdded(token, key.toId(), tokenAmount, tokenId);
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
            tickSpacing: 200,     // Wide ticks for full-range efficiency
            hooks: IHooks(address(hook))
        });
    }
    
    /*//////////////////////////////////////////////////////////////
                         NFT REPOSITIONING (SAFE)
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Reposition LP NFT based on current epoch width policy
     * @dev Safety: decrease+burn+mint are in one atomic modifyLiquidities call.
     *      If mint fails, entire tx reverts and old position remains intact.
     */
    function repositionByEpoch(PoolKey calldata key) external onlyOwner nonReentrant {
        PoolId poolId = key.toId();
        require(poolActivated[poolId], "Pool not activated");

        uint256 oldTokenId = positionTokenId[poolId];
        require(oldTokenId != 0, "No position exists");

        uint256 currentEpoch = hook.getCurrentEpoch(poolId);
        int24 spacing = key.tickSpacing;
        int24 width;

        // Graduated pools get full-range LP — no more epoch transitions,
        // tax is 0%, so it behaves as a normal AMM pool.
        if (hook.isGraduated(poolId)) {
            width = TICK_UPPER;  // will be clamped to [TICK_LOWER, TICK_UPPER]
        } else {
            // Epoch-based widening: wide ranges that grow each epoch
            if (currentEpoch == 0) {
                width = spacing * 140;        // ±140 tick spacings
            } else if (currentEpoch == 1) {
                width = spacing * 160;        // ±160 tick spacings
            } else if (currentEpoch == 2) {
                width = spacing * 180;        // ±180 tick spacings
            } else {
                width = TICK_UPPER;           // Full range
            }
        }

        _repositionWithWidth(key, width);
        lastRepositionedEpoch[poolId] = currentEpoch;
    }

    /**
     * @notice Internal safe NFT reposition (atomic)
     * @dev Never leaves pool without LP: all actions are one transaction.
     */
    function _repositionWithWidth(PoolKey memory key, int24 width) internal {
        PoolId poolId = key.toId();
        uint256 oldTokenId = positionTokenId[poolId];
        require(oldTokenId != 0, "No position");

        uint128 oldLiquidity = IPositionManager(positionManager).getPositionLiquidity(oldTokenId);
        require(oldLiquidity > 0, "No liquidity");

        int24 tickLower;
        int24 tickUpper;

        if (width >= TICK_UPPER) {
            // Full-range position (graduation) — skip aligned-tick math
            tickLower = TICK_LOWER;
            tickUpper = TICK_UPPER;
        } else {
            (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
            int24 currentTick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);
            int24 spacing = key.tickSpacing;
            int24 alignedTick = (currentTick / spacing) * spacing;

            tickLower = alignedTick - width;
            tickUpper = alignedTick + width;
            if (tickLower < TICK_LOWER) tickLower = TICK_LOWER;
            if (tickUpper > TICK_UPPER) tickUpper = TICK_UPPER;
        }

        if (tickLower >= tickUpper) revert InvalidParams();

        // Atomic sequence: decrease old -> burn old -> mint new from deltas -> close currencies
        bytes memory actions = abi.encodePacked(
            uint8(Actions.DECREASE_LIQUIDITY),
            uint8(Actions.BURN_POSITION),
            uint8(Actions.MINT_POSITION_FROM_DELTAS),
            uint8(Actions.CLOSE_CURRENCY),
            uint8(Actions.CLOSE_CURRENCY)
        );

        bytes[] memory params = new bytes[](5);
        params[0] = abi.encode(oldTokenId, uint256(oldLiquidity), uint128(0), uint128(0), bytes(""));
        params[1] = abi.encode(oldTokenId, uint128(0), uint128(0), bytes(""));
        params[2] = abi.encode(
            key,
            tickLower,
            tickUpper,
            uint128(type(uint128).max),
            uint128(type(uint128).max),
            address(this),
            bytes("")
        );
        params[3] = abi.encode(key.currency0);
        params[4] = abi.encode(key.currency1);

        bytes memory unlockData = abi.encode(actions, params);
        uint256 deadline = block.timestamp + 1 hours;

        IPositionManager(positionManager).modifyLiquidities(unlockData, deadline);

        uint256 newTokenId = IPositionManager(positionManager).nextTokenId() - 1;
        require(newTokenId != 0, "Invalid new position");
        positionTokenId[poolId] = newTokenId;

        address token = Currency.unwrap(key.currency1);
        emit LiquidityRepositioned(token, poolId, oldTokenId, newTokenId, tickLower, tickUpper);
    }

    /**
     * @notice Collect accrued LP fees to treasury
     */
    function collectFees(PoolId poolId) external onlyOwner nonReentrant {
        uint256 tokenId = positionTokenId[poolId];
        require(tokenId != 0, "No position");

        LaunchInfo storage info = launchByPoolId[poolId];
        PoolKey memory key = info.poolKey;

        uint256 ethBefore = address(this).balance;
        uint256 tokenBefore = ClawclickToken(info.token).balanceOf(address(this));

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

        if (ethGained > 0) {
            (bool ok,) = config.treasury().call{value: ethGained}("");
            require(ok, "ETH transfer failed");
        }
        if (tokenGained > 0) {
            ClawclickToken(info.token).transfer(config.treasury(), tokenGained);
        }
    }

    /**
     * @notice Check if reposition is needed
     * @dev Trigger conditions:
     *      1. Graduated pool that hasn't been repositioned to full range yet
     *      2. currentTick within 5 spacings of LP boundary (tick proximity)
     */
    function needsReposition(PoolId poolId) external view returns (bool needed, uint256 currentEpoch, uint256 lastEpoch) {
        currentEpoch = hook.getCurrentEpoch(poolId);
        lastEpoch = lastRepositionedEpoch[poolId];

        uint256 tokenId = positionTokenId[poolId];
        if (tokenId == 0) {
            needed = currentEpoch > lastEpoch;
            return (needed, currentEpoch, lastEpoch);
        }

        // Graduated pools always need one final reposition to full range
        if (hook.isGraduated(poolId)) {
            PositionInfo gInfo = IPositionManager(positionManager).positionInfo(tokenId);
            // Already full-range? No need.
            needed = gInfo.tickLower() != TICK_LOWER || gInfo.tickUpper() != TICK_UPPER;
            return (needed, currentEpoch, lastEpoch);
        }

        PositionInfo info = IPositionManager(positionManager).positionInfo(tokenId);
        int24 tickLower = info.tickLower();
        int24 tickUpper = info.tickUpper();

        // If position is fully exhausted (price moved past range), always reposition
        uint128 liq = IPositionManager(positionManager).getPositionLiquidity(tokenId);
        if (liq == 0) {
            needed = true;
            return (needed, currentEpoch, lastEpoch);
        }

        PoolKey memory key = launchByPoolId[poolId].poolKey;
        (uint160 sqrtPriceX96,,,) = poolManager.getSlot0(poolId);
        int24 currentTick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);
        int24 buffer = key.tickSpacing * 5;

        needed = currentTick >= tickUpper - buffer || currentTick <= tickLower + buffer;
    }

    receive() external payable {}
}
