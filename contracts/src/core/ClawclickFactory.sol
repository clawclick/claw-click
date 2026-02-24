// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
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
import {BootstrapETH} from "../utils/BootstrapETH.sol";
import {PriceMath} from "../libraries/PriceMath.sol";

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
    
    /// @notice Bootstrap funding contract (provides free first launches)
    BootstrapETH public immutable bootstrapETH;
    
    /// @notice Total launches created
    uint256 public totalLaunches;
    
    /// @notice Launch info by token address
    mapping(address => LaunchInfo) internal _launchByToken;
    
    /// @notice Launch info by pool ID
    mapping(PoolId => LaunchInfo) internal _launchByPoolId;
    
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
    
    /// @notice Fee split configuration for creator's 70% share
    /// @dev Splits the creator's 70% across up to 5 wallets (platform 30% unchanged)
    struct FeeSplit {
        address[5] wallets;       // Up to 5 beneficiary wallets
        uint16[5] percentages;    // Percentages in BPS (must sum to 10000 = 100%)
        uint8 count;              // Number of active wallets (0-5)
    }
    
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
        FeeSplit feeSplit;        // Fee split configuration
    }
    
    struct CreateParams {
        string name;
        string symbol;
        address beneficiary;
        address agentWallet;
        uint256 targetMcapETH;    // 1-10 ETH target
        FeeSplit feeSplit;        // Optional: split creator's 70% across multiple wallets
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
        string symbol
    );
    
    event LaunchFeePaid(address indexed user, uint256 amount);
    event FreeBootstrapUsed(address indexed creator, uint256 amount);
    event LiquidityAdded(address indexed token, PoolId indexed poolId, uint256 tokenAmount, uint256 liquidityMinted);
    event LiquidityRepositioned(address indexed token, PoolId indexed poolId, uint256 oldTokenId, uint256 newTokenId, int24 tickLower, int24 tickUpper);
    event PoolActivated(PoolId indexed poolId, bool isDevActivation, uint256 liquidityMinted);
    event PositionMinted(PoolId indexed poolId, uint256 indexed positionIndex, uint256 tokenId, uint256 tokenAmount);
    event PositionRetired(PoolId indexed poolId, uint256 indexed positionIndex, uint256 tokenId, uint256 ethRecovered, uint256 tokensRecovered);
    event FeesCollectedFromPosition(PoolId indexed poolId, uint256 indexed positionIndex, uint256 tokenId, uint256 ethAmount, uint256 tokenAmount);
    event FeeSplitDistributed(PoolId indexed poolId, address indexed wallet, uint256 amount);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error InsufficientBootstrap();
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
    error InvalidFeeSplit();
    error ZeroAddressInSplit();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    constructor(
        ClawclickConfig _config,
        IPoolManager _poolManager,
        ClawclickHook _hook,
        address _positionManager,
        BootstrapETH _bootstrapETH,
        address _owner
    ) Ownable(_owner) {
        config = _config;
        poolManager = _poolManager;
        hook = _hook;
        positionManager = _positionManager;
        bootstrapETH = _bootstrapETH;
    }

    /*//////////////////////////////////////////////////////////////
                          RECEIVE FUNCTION
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Receive ETH from BootstrapETH contract and PoolManager
     * @dev Accepts ETH from bootstrap contract (launch flow) and PoolManager (swaps)
     */
    receive() external payable {
        // Accept ETH from bootstrap contract or PoolManager
        require(
            msg.sender == address(bootstrapETH) || msg.sender == address(poolManager),
            "Only bootstrap or poolManager"
        );
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
        
        // Validate bootstrap requirement
        uint256 minBootstrap = config.MIN_BOOTSTRAP_ETH();
        uint256 bootstrapAmount;
        
        // Check if user sent enough ETH
        if (msg.value >= minBootstrap) {
            // User provided bootstrap directly
            bootstrapAmount = msg.value;
        } else {
            // Try free bootstrap from BootstrapETH contract
            if (address(bootstrapETH) != address(0) && bootstrapETH.isEligible(msg.sender)) {
                // Request bootstrap from contract
                bool success = bootstrapETH.requestBootstrap(msg.sender, minBootstrap);
                require(success, "Bootstrap request failed");
                bootstrapAmount = minBootstrap;
                emit FreeBootstrapUsed(msg.sender, minBootstrap);
            } else {
                revert InsufficientBootstrap();
            }
        }
        
        // Inline validation (saves function call overhead)
        if (bytes(params.name).length > 32) revert NameTooLong();
        if (bytes(params.name).length == 0) revert EmptyName();
        if (bytes(params.symbol).length > 10) revert SymbolTooLong();
        if (bytes(params.symbol).length == 0) revert EmptySymbol();
        if (params.beneficiary == address(0)) revert ZeroBeneficiary();
        if (params.targetMcapETH < MIN_TARGET_MCAP || params.targetMcapETH > MAX_TARGET_MCAP) {
            revert InvalidTargetMcap();
        }
        
        // ✅ Validate fee split (if specified)
        if (params.feeSplit.count > 0) {
            if (params.feeSplit.count > 5) revert InvalidFeeSplit();
            
            uint256 totalPercentage = 0;
            for (uint8 i = 0; i < params.feeSplit.count; i++) {
                if (params.feeSplit.wallets[i] == address(0)) revert ZeroAddressInSplit();
                totalPercentage += params.feeSplit.percentages[i];
            }
            
            // Percentages must sum to exactly 10000 BPS (100% of creator's 70%)
            if (totalPercentage != BPS) revert InvalidFeeSplit();
        }
        
        // 1. Deploy token (supply minted to factory for liquidity provision)
        token = address(new ClawclickToken(
            params.name,
            params.symbol,
            address(this),  // Factory receives tokens to add liquidity
            params.beneficiary,
            params.agentWallet
        ));
        
        // 2. Calculate deterministic sqrtPrice from target MCAP (via external library)
        uint256 totalSupply = TOTAL_SUPPLY;
        uint160 sqrtPriceX96 = PriceMath.calculateSqrtPrice(params.targetMcapETH, totalSupply);
        
        // 3. Create pool key
        PoolKey memory key = _createPoolKey(token);
        poolId = key.toId();
        
        // 4. Initialize pool at calculated price
        poolManager.initialize(key, sqrtPriceX96);
        
        // 5. Register launch with hook
        hook.registerLaunch(key, token, params.beneficiary, params.targetMcapETH, sqrtPriceX96);
        
        // 6. Calculate position ranges (via external library)
        (int24[5] memory tickLowers, int24[5] memory tickUppers, uint256[5] memory allocations) = 
            PriceMath.calculatePositionRanges(params.targetMcapETH, totalSupply);
        
        // 7. Mint positions at launch
        //    P1: tokens + bootstrap ETH (full-range, always succeeds)
        //    P2-P5: token-only, one-sided liquidity — may have 0 liquidity at
        //    certain MCAP tiers due to tick rounding. Deferred positions can be
        //    minted later via mintNextPosition when price enters range.
        uint256[5] memory posTokenIds;
        bool[5] memory mintedFlags;
        
        for (uint256 i = 0; i < 5; i++) {
            uint256 ethForPosition = (i == 0) ? bootstrapAmount : 0;
            
            // Pre-check: will this position have non-zero liquidity?
            uint160 sqrtLower = TickMath.getSqrtPriceAtTick(tickLowers[i]);
            uint160 sqrtUpper = TickMath.getSqrtPriceAtTick(tickUppers[i]);
            uint128 liq = LiquidityAmounts.getLiquidityForAmounts(
                sqrtPriceX96, sqrtLower, sqrtUpper, ethForPosition, allocations[i]
            );
            
            if (liq > 0) {
                posTokenIds[i] = _mintPositionViaManager(
                    key,
                    tickLowers[i],
                    tickUppers[i],
                    allocations[i],
                    ethForPosition
                );
                mintedFlags[i] = true;
            }
            // else: position deferred — mintNextPosition() when price enters range
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
        
        // Store reverse mappings for minted positions only
        for (uint256 i = 0; i < 5; i++) {
            if (mintedFlags[i]) {
                tokenIdToPoolId[posTokenIds[i]] = poolId;
            }
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
            feeSplit: params.feeSplit
        });
        
        _launchByToken[token] = info;
        _launchByPoolId[poolId] = info;
        allTokens.push(token);
        totalLaunches++;
        
        emit LiquidityAdded(token, poolId, allocations[0], posTokenIds[0]);
        
        emit TokenLaunched(
            token,
            params.beneficiary,
            msg.sender,
            poolId,
            params.targetMcapETH,
            sqrtPriceX96,
            params.name,
            params.symbol
        );
        
        return (token, poolId);
    }

    /*//////////////////////////////////////////////////////////////
                    MULTI-POSITION LIQUIDITY SYSTEM
    //////////////////////////////////////////////////////////////*/ 
    // Math functions moved to PriceMath.sol library to reduce bytecode
    
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
        
        // Get pre-calculated ranges from library
        (int24[5] memory tickLowers, int24[5] memory tickUppers, uint256[5] memory allocations) = 
            PriceMath.calculatePositionRanges(state.startingMCAP, state.totalSupply);
        
        // Get pool key
        LaunchInfo memory info = _launchByPoolId[poolId];
        
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
        
        LaunchInfo storage launch = _launchByPoolId[poolId];
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
                         CREATOR FIRST-BUY PRIVILEGE
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Clear dev activation override - allows creator to buy up to 15% in first minute
     * @dev Creator wallet can make ONE first buy within 1 minute of launch for up to 15% supply
     * @param poolId Pool ID to clear override for
     */
    function clearDevOverride(PoolId poolId) external {
        LaunchInfo storage info = _launchByPoolId[poolId];
        
        // Must be a valid launch
        require(info.token != address(0), "Launch not found");
        
        // Only creator or factory owner can call
        require(
            msg.sender == info.creator || msg.sender == owner(),
            "Only creator or owner"
        );
        
        // Check if 1 minute has passed since launch
        require(
            block.timestamp >= info.createdAt + 1 minutes,
            "First-buy window still active"
        );
        
        // Clear the override flag
        ClawclickHook(hook).setActivationInProgress(poolId, false);
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
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    // View functions removed to save bytecode - use public mappings directly:
    // - launchByToken[token] instead of getLaunchByToken()
    // - launchByPoolId[poolId] instead of getLaunchByPoolId()
    // - poolStates[poolId].positionTokenIds instead of getPositionTokenIds()
    // - allTokens array instead of getAllTokens()
    
    function launchByToken(address token) external view returns (LaunchInfo memory) {
        return _launchByToken[token];
    }
    
    function launchByPoolId(PoolId poolId) external view returns (LaunchInfo memory) {
        return _launchByPoolId[poolId];
    }
    
    function poolActivated(PoolId poolId) external view returns (bool) {
        return poolStates[poolId].activated;
    }
    
    function positionTokenId(PoolId poolId) external view returns (uint256) {
        // Return P1 token ID for backward compatibility with tests
        return poolStates[poolId].positionTokenIds[0];
    }
    
    function getTokenCount() external view returns (uint256) {
        return allTokens.length;
    }
    
    function getTokenAtIndex(uint256 index) external view returns (address) {
        return allTokens[index];
    }
    
    /**
     * @notice Preview sqrtPrice for a given target MCAP
     * @dev Useful for UI to show expected price before launch
     */
    function previewSqrtPrice(uint256 targetMcapETH) external pure returns (uint160) {
        return PriceMath.calculateSqrtPrice(targetMcapETH, TOTAL_SUPPLY);
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/ 
    // _validateParams removed - validation inlined in createLaunch()
    
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
     * @notice Collect accrued LP fees from a specific position with 70/30 split
     * @dev Callable by token creator or ecosystem deployer - distributes ETH and tokens with 70/30 split
     * @param poolId Pool identifier
     * @param positionIndex Position index (0-4)
     * 
     * NOTE: LP fees are collected in both ETH and tokens (standard for two-sided AMM pools).
     * Both currencies are distributed using the same 70/30 split as Phase 1 hook taxes.
     */
    function collectFeesFromPosition(PoolId poolId, uint256 positionIndex) external nonReentrant {
        PoolState storage state = poolStates[poolId];
        require(positionIndex < 5, "Invalid position");
        require(state.positionMinted[positionIndex], "Position not minted");
        require(!state.positionRetired[positionIndex], "Position retired");
        
        uint256 tokenId = state.positionTokenIds[positionIndex];
        require(tokenId != 0, "No position");
        
        LaunchInfo storage info = _launchByPoolId[poolId];
        PoolKey memory key = info.poolKey;
        
        // ✅ ACCESS CONTROL: Token creator OR ecosystem deployer can claim
        require(
            msg.sender == info.creator || 
            msg.sender == info.beneficiary ||
            msg.sender == owner(),
            "Only creator, beneficiary, or owner"
        );
        
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
        
        // ✅ 70/30 SPLIT ON ETH FEES: Exactly like Phase 1 hook taxes
        if (ethGained > 0) {
            uint256 beneficiaryETH = (ethGained * 7000) / BPS; // 70%
            uint256 platformETH = ethGained - beneficiaryETH;   // 30%
            
            // Pay platform first (30%)
            if (platformETH > 0) {
                (bool ok,) = config.treasury().call{value: platformETH}("");
                require(ok, "Platform ETH transfer failed");
            }
            
            // Pay creator(s) (70%) - check for fee split wallets
            if (beneficiaryETH > 0) {
                if (info.feeSplit.count > 0) {
                    // Split 70% across multiple wallets (exactly like Phase 1 hook taxes)
                    for (uint8 i = 0; i < info.feeSplit.count; i++) {
                        address wallet = info.feeSplit.wallets[i];
                        uint256 walletShare = (beneficiaryETH * info.feeSplit.percentages[i]) / BPS;
                        
                        if (walletShare > 0) {
                            (bool ok,) = wallet.call{value: walletShare}("");
                            require(ok, "Wallet ETH transfer failed");
                            emit FeeSplitDistributed(poolId, wallet, walletShare);
                        }
                    }
                } else {
                    // Single beneficiary gets all 70%
                    (bool ok,) = info.beneficiary.call{value: beneficiaryETH}("");
                    require(ok, "Beneficiary ETH transfer failed");
                }
            }
        }
        
        // ✅ 70/30 SPLIT ON TOKEN FEES: Exactly like Phase 1 hook taxes
        if (tokenGained > 0) {
            uint256 beneficiaryTokens = (tokenGained * 7000) / BPS; // 70%
            uint256 platformTokens = tokenGained - beneficiaryTokens; // 30%
            
            // Pay platform first (30%)
            if (platformTokens > 0) {
                ClawclickToken(info.token).transfer(config.treasury(), platformTokens);
            }
            
            // Pay creator(s) (70%) - check for fee split wallets
            if (beneficiaryTokens > 0) {
                if (info.feeSplit.count > 0) {
                    // Split 70% across multiple wallets (exactly like Phase 1 hook taxes)
                    for (uint8 i = 0; i < info.feeSplit.count; i++) {
                        address wallet = info.feeSplit.wallets[i];
                        uint256 walletShare = (beneficiaryTokens * info.feeSplit.percentages[i]) / BPS;
                        
                        if (walletShare > 0) {
                            ClawclickToken(info.token).transfer(wallet, walletShare);
                        }
                    }
                } else {
                    // Single beneficiary gets all 70%
                    ClawclickToken(info.token).transfer(info.beneficiary, beneficiaryTokens);
                }
            }
        }
        
        emit FeesCollectedFromPosition(poolId, positionIndex, tokenId, ethGained, tokenGained);
    }
}
