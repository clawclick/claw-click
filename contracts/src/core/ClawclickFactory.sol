// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {FullMath} from "v4-core/src/libraries/FullMath.sol";
import {FixedPoint96} from "v4-core/src/libraries/FixedPoint96.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {Actions} from "v4-periphery/src/libraries/Actions.sol";

import {ClawclickToken} from "./ClawclickToken.sol";
import {ClawclickConfig} from "./ClawclickConfig.sol";
import {ClawclickHook} from "./ClawclickHook_V4.sol";
import {ClawclickLPLocker} from "./ClawclickLPLocker.sol";

/// @notice Permit2 interface for allowance management
interface IPermit2 {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

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
    using CurrencyLibrary for Currency;

    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Permit2 contract address (canonical deployment)
    address constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    
    /// @notice Total supply per token (1 billion with 18 decimals)
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    
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
    
    /// @notice LP Locker
    ClawclickLPLocker public immutable lpLocker;
    
    /// @notice Position Manager (for LP NFT minting)
    IPositionManager public immutable positionManager;
    
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
    event LPLocked(address indexed token, uint256 positionId);

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
        ClawclickLPLocker _lpLocker,
        IPositionManager _positionManager,
        address _owner
    ) Ownable(_owner) {
        config = _config;
        poolManager = _poolManager;
        hook = _hook;
        lpLocker = _lpLocker;
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
        
        // 6. Add one-sided out-of-range liquidity (token-only, below price)
        uint256 tokenId = _addBootstrapLiquidity(key, token, sqrtPriceX96);
        
        // 7. Lock LP NFT permanently in LPLocker
        _lockLPPosition(token, tokenId, key);
        
        // 8. Store launch info
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
    
    /**
     * @notice Add full-range liquidity via PositionManager (mints LP NFT)
     * @dev Uses Uniswap v4 PositionManager to mint ERC-721 LP position
     *      NFT represents ownership of the liquidity position
     *      NFT will be transferred to LPLocker for permanent locking
     * @param key Pool key
     * @param token Token address
     * @return tokenId The minted LP NFT token ID
     */
    /**
     * @notice Add one-sided bootstrap liquidity (token-only, out-of-range below price)
     * @dev Places liquidity entirely below current price to avoid ETH requirement
     *      Position contains 100% tokens, 0% ETH
     *      Liquidity activates when price moves down (first buy)
     * @param key Pool key
     * @param token Token address
     * @param sqrtPriceX96 Current pool price
     * @return tokenId LP NFT token ID
     */
    function _addBootstrapLiquidity(
        PoolKey memory key,
        address token,
        uint160 sqrtPriceX96
    ) internal returns (uint256 tokenId) {
        // Calculate current tick from sqrtPrice
        int24 currentTick = TickMath.getTickAtSqrtPrice(sqrtPriceX96);
        
        // Align to tickSpacing (200)
        int24 tickSpacing = key.tickSpacing;
        int24 alignedTick = (currentTick / tickSpacing) * tickSpacing;
        
        // Place position BELOW current price (token-only, no ETH required)
        // tickUpper = just below current price
        // tickLower = minimum tick
        int24 tickLower = TICK_LOWER;  // -887200 (close to MIN_TICK)
        int24 tickUpper = alignedTick - tickSpacing;  // Just below current price
        
        // Sanity check: ensure valid range
        require(tickLower < tickUpper, "Invalid tick range");
        
        // Approve PositionManager to spend ALL tokens
        // NOTE: For out-of-range position below price, position contains ONLY tokens
        // Approve both PoolManager (for settlement) and PositionManager (for liquidity operations)
        ClawclickToken(token).approve(address(poolManager), TOTAL_SUPPLY);
        ClawclickToken(token).approve(address(positionManager), TOTAL_SUPPLY);
        // Approve Permit2 (required by PositionManager)
        ClawclickToken(token).approve(PERMIT2, type(uint256).max);
        // Set Permit2 allowance for PositionManager (max amount, far future expiration)
        IPermit2(PERMIT2).approve(token, address(positionManager), type(uint160).max, type(uint48).max);
        
        // For out-of-range positions below price:
        // - amount0 (ETH) = 0
        // - amount1 (tokens) = all available  
        // - liquidity determines token amount via: amount1 = L * (1/sqrt(Pa) - 1/sqrt(Pb))
        // Use conservative liquidity to ensure we don't exceed TOTAL_SUPPLY
        
        // Calculate safe liquidity: use 1e18 as seed (PositionManager will adjust based on maxAmounts)
        uint256 safeLiquidity = 1e18;
        
        // Encode SETTLE + SETTLE + MINT_POSITION_FROM_DELTAS actions
        // Pattern from v4-periphery tests: settle currencies first, then mint from deltas
        // Actions are encoded as bytes (uint8), not uint256
        bytes memory actions = abi.encodePacked(
            uint8(Actions.SETTLE),              // Settle currency0 (ETH) - will be 0 for out-of-range
            uint8(Actions.SETTLE),              // Settle currency1 (tokens)
            uint8(Actions.MINT_POSITION_FROM_DELTAS)  // Mint from settled deltas
        );
        
        // Encode action parameters
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(key.currency0, uint256(0), true); // SETTLE ETH: 0 amount, payerIsUser=true
        params[1] = abi.encode(key.currency1, TOTAL_SUPPLY, true); // SETTLE tokens: full supply, payerIsUser=true  
        params[2] = abi.encode(
            key,                    // PoolKey
            tickLower,              // tickLower (minimum)
            tickUpper,              // tickUpper (below current price)
            uint128(TOTAL_SUPPLY),  // amount0Max (slippage tolerance for currency0)
            uint128(TOTAL_SUPPLY),  // amount1Max (slippage tolerance for currency1)
            address(this),          // owner (Factory receives NFT, explicitly)
            bytes("")               // hookData (empty)
        );
        
        // Call PositionManager to mint LP NFT
        // NO ETH REQUIRED - position is entirely out-of-range below price
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory unlockData = abi.encode(actions, params);
        
        positionManager.modifyLiquidities{value: 0}(unlockData, deadline);
        
        // Get the minted token ID
        tokenId = positionManager.nextTokenId() - 1;
        
        emit LiquidityAdded(token, key.toId(), TOTAL_SUPPLY, tokenId);
        
        return tokenId;
    }
    
    /**
     * @notice Lock LP NFT permanently in LPLocker
     * @dev Transfers LP NFT to LPLocker contract (irreversible)
     *      LPLocker has NO function to remove, burn, or transfer the NFT
     *      This permanently locks the liquidity - CANNOT be removed
     * @param token Token address  
     * @param tokenId LP NFT token ID
     * @param key Pool key for position tracking
     */
    function _lockLPPosition(address token, uint256 tokenId, PoolKey memory key) internal {
        // Encode token address AND PoolKey for LPLocker
        bytes memory data = abi.encode(token, key);
        
        // Transfer LP NFT from Factory to LPLocker
        // LPLocker's onERC721Received will be called automatically
        IERC721(address(positionManager)).safeTransferFrom(
            address(this),
            address(lpLocker),
            tokenId,
            data
        );
        
        // LPLocker now holds the NFT permanently
        // No function exists to remove it
        emit LPLocked(token, tokenId);
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    function setFees(uint256 _premiumFee, uint256 _microFee) external onlyOwner {
        premiumFee = _premiumFee;
        microFee = _microFee;
        emit FeesUpdated(_premiumFee, _microFee);
    }

    /**
     * @notice Approve PositionManager to manage LP positions on behalf of Factory
     * @dev Must be called once after deployment to enable liquidity operations
     */
    function approvePositionManager() external onlyOwner {
        IERC721(address(positionManager)).setApprovalForAll(address(this), true);
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
        Currency currency0 = CurrencyLibrary.ADDRESS_ZERO;  // Native ETH
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
}
