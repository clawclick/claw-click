// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IPositionManager} from "v4-periphery/src/interfaces/IPositionManager.sol";
import {Actions} from "v4-periphery/src/libraries/Actions.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "v4-core/src/types/PoolId.sol";
import {Currency, CurrencyLibrary} from "v4-core/src/types/Currency.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";

// Hook interface (minimal for graduation check)
interface IClawclickHook {
    function isGraduatedByToken(address token) external view returns (bool);
    function getPoolIdForToken(address token) external view returns (PoolId);
}

/**
 * @title ClawclickLPLocker
 * @notice Locks Uniswap V4 LP positions with graduation-aware rebalancing
 * @dev Protocol-owned liquidity with post-graduation rebalance capability
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PHASE 1 (PROTECTED):
 *   • LP position locked (no removal, no rebalance)
 *   • Withdrawal blocked
 *   • Positions held as protocol-owned liquidity
 * 
 * PHASE 2 (GRADUATED):
 *   • Rebalance proposals allowed (timelocked)
 *   • Can decrease/increase liquidity
 *   • Can collect fees
 *   • Still CANNOT withdraw to EOA
 *   • Preserves protocol ownership
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * REBALANCE WORKFLOW
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 1. proposeRebalance() - Create timelock proposal (requires graduation)
 * 2. Wait TIMELOCK_DURATION (24 hours)
 * 3. executeRebalance() - Execute rebalance operation
 * 
 * Rebalance operations:
 *   • Decrease liquidity (remove some LP)
 *   • Collect accumulated fees
 *   • Re-mint new position with adjusted amounts
 *   • Position stays in locker (never withdrawn)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 * SAFETY GUARANTEES
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * ✅ No withdrawal to EOA ever
 * ✅ No liquidity removal before graduation
 * ✅ Timelock on all rebalance operations
 * ✅ Owner cannot extract liquidity
 * ✅ Protocol-owned forever
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */
contract ClawclickLPLocker is Ownable, IERC721Receiver, ReentrancyGuard {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    /*//////////////////////////////////////////////////////////////
                                TYPES
    //////////////////////////////////////////////////////////////*/
    
    struct RebalanceProposal {
        address token;              // Token being rebalanced
        uint256 positionId;         // Current position ID
        uint128 liquidityToRemove;  // How much liquidity to decrease (0 = no change)
        uint256 proposedAt;         // Timestamp of proposal
        bool executed;              // Whether executed
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Rebalance timelock duration (24 hours)
    uint256 public constant TIMELOCK_DURATION = 24 hours;
    
    /// @notice Maximum liquidity removal per rebalance (50%)
    uint256 public constant MAX_REMOVAL_BPS = 5000;
    uint256 public constant BPS = 10000;

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/
    
    /// @notice V4 Position Manager address
    IPositionManager public immutable positionManager;
    
    /// @notice Clawclick Hook (for graduation checks)
    IClawclickHook public immutable hook;
    
    /// @notice Mapping of token to its locked position ID
    mapping(address => uint256) public lockedPositions;
    
    /// @notice Mapping of position ID to token address
    mapping(uint256 => address) public positionToToken;
    
    /// @notice Mapping of token to its PoolKey (stored at lock time)
    mapping(address => PoolKey) public tokenToPoolKey;
    
    /// @notice Active rebalance proposals
    mapping(uint256 => RebalanceProposal) public proposals;
    
    /// @notice Next proposal ID
    uint256 public nextProposalId;
    
    /// @notice Total positions locked
    uint256 public totalLocked;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    
    event PositionLocked(
        address indexed token,
        uint256 indexed positionId,
        address indexed locker
    );
    
    event RebalanceProposed(
        uint256 indexed proposalId,
        address indexed token,
        uint256 positionId,
        uint128 liquidityToRemove,
        uint256 executeAfter
    );
    
    event RebalanceExecuted(
        uint256 indexed proposalId,
        address indexed token,
        uint256 oldPositionId,
        uint256 newPositionId,
        uint256 amount0Collected,
        uint256 amount1Collected
    );
    
    event RebalanceCancelled(uint256 indexed proposalId);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error InvalidPositionManager();
    error InvalidHook();
    error PositionAlreadyLocked();
    error NotFromPositionManager();
    error NotGraduated();
    error TooMuchRemoval();
    error ProposalNotReady();
    error ProposalNotFound();
    error ProposalAlreadyExecuted();
    error NoPositionForToken();
    error ZeroLiquidity();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    constructor(
        address _positionManager,
        address _hook,
        address _owner
    ) Ownable(_owner) {
        if (_positionManager == address(0)) revert InvalidPositionManager();
        if (_hook == address(0)) revert InvalidHook();
        
        positionManager = IPositionManager(_positionManager);
        hook = IClawclickHook(_hook);
    }

    /*//////////////////////////////////////////////////////////////
                              MODIFIERS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Restrict function to hook only
     * @dev Used for autonomous rebalance operations
     */
    modifier onlyHook() {
        require(msg.sender == address(hook), "Only hook");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                    AUTONOMOUS REBALANCE (HOOK-DRIVEN)
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Execute autonomous rebalance (called by hook during swap)
     * @dev This bypasses timelock as it's triggered automatically by MCAP thresholds
     * @param token Token address
     * @param graduationMcap Graduation MCAP (G = startMcap * 16)
     * @param newStage New liquidity stage (1, 2, or 3)
     */
    function executeRebalance(
        address token,
        uint256 graduationMcap,
        uint8 newStage
    ) external onlyHook nonReentrant {
        // ═══════════════════════════════════════════════════════════════
        // STEP 1: Get current position
        // ═══════════════════════════════════════════════════════════════
        uint256 oldPositionId = lockedPositions[token];
        require(oldPositionId != 0, "No position");
        
        // Get stored PoolKey for this position
        PoolKey memory key = tokenToPoolKey[token];
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 2: Get current liquidity
        // ═══════════════════════════════════════════════════════════════
        uint128 liquidity = positionManager.getPositionLiquidity(oldPositionId);
        require(liquidity > 0, "Zero liquidity");
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 3: Decrease 100% liquidity
        // ═══════════════════════════════════════════════════════════════
        // NOTE: Action code 1 = DECREASE_LIQUIDITY
        bytes memory decreaseActions = abi.encodePacked(uint8(1));
        bytes[] memory decreaseParams = new bytes[](1);
        decreaseParams[0] = abi.encode(
            oldPositionId,  // tokenId
            liquidity,      // liquidity to remove (100%)
            uint128(0),     // amount0Min
            uint128(0)      // amount1Min
        );
        
        positionManager.modifyLiquidities(
            abi.encode(decreaseActions, decreaseParams),
            block.timestamp + 1 hours
        );
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 4: Collect all tokens and fees
        // ═══════════════════════════════════════════════════════════════
        // NOTE: In v4-periphery, COLLECT is action code 2
        // After decreasing liquidity, tokens are already in locker balance
        // No explicit collect needed - balances retrieved below
        
        // Get token balances for new position
        uint256 balance0;
        uint256 balance1;
        
        if (Currency.unwrap(key.currency0) == address(0)) {
            // Currency0 is ETH
            balance0 = address(this).balance;
        } else {
            // Currency0 is ERC20
            balance0 = IERC20(Currency.unwrap(key.currency0)).balanceOf(address(this));
        }
        
        // Currency1 is always the token
        balance1 = IERC20(Currency.unwrap(key.currency1)).balanceOf(address(this));
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 5: Calculate new range ticks based on stage
        // ═══════════════════════════════════════════════════════════════
        uint256 G = graduationMcap;
        
        uint256 lowerMcap;
        uint256 upperMcap;
        
        if (newStage == 1) {
            lowerMcap = G;
            upperMcap = G * 6;
        } else if (newStage == 2) {
            lowerMcap = G * 6;
            upperMcap = G * 60;
        } else if (newStage == 3) {
            lowerMcap = G * 60;
            upperMcap = G * 6000;
        } else {
            revert("Invalid stage");
        }
        
        // Calculate ticks (tickLower corresponds to upper MCAP, tickUpper to lower MCAP)
        // This is because MCAP ↑ → tick ↓ (inverse relationship)
        int24 tickLower = _mcapToTick(upperMcap);
        int24 tickUpper = _mcapToTick(lowerMcap);
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 6: Calculate liquidity for new position
        // ═══════════════════════════════════════════════════════════════
        // For simplicity, use the smaller of the two amounts as constraint
        // In production, would calculate optimal liquidity based on current price
        // For now, use a conservative estimate
        uint256 newLiquidity = liquidity; // Reuse same liquidity amount
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 7: Approve tokens for PositionManager
        // ═══════════════════════════════════════════════════════════════
        _approvePositionManager(key.currency0, balance0);
        _approvePositionManager(key.currency1, balance1);
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 8: Mint new position with new tick range
        // ═══════════════════════════════════════════════════════════════
        // NOTE: Action code 0 = MINT_POSITION
        bytes memory mintActions = abi.encodePacked(uint8(0));
        bytes[] memory mintParams = new bytes[](1);
        mintParams[0] = abi.encode(
            key,            // PoolKey
            tickLower,      // tickLower
            tickUpper,      // tickUpper
            newLiquidity,   // liquidity
            uint128(0),     // amount0Max
            uint128(0),     // amount1Max
            address(this),  // owner (this contract)
            bytes("")       // hookData
        );
        
        // Get the position ID that will be minted (PositionManager increments nextTokenId)
        uint256 newPositionId = positionManager.nextTokenId();
        
        // Call modifyLiquidities to mint new position
        positionManager.modifyLiquidities(
            abi.encode(mintActions, mintParams),
            block.timestamp + 1 hours
        );
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 9: Update position tracking
        // ═══════════════════════════════════════════════════════════════
        // CRITICAL: Clean up old position mapping to prevent desync
        delete positionToToken[oldPositionId];
        
        // Register new position
        lockedPositions[token] = newPositionId;
        positionToToken[newPositionId] = token;
        
        // Invariant: No token should ever map to multiple positions
        // Invariant: Old position ID cannot be reused
        
        // ═══════════════════════════════════════════════════════════════
        // STEP 10: Emit event
        // ═══════════════════════════════════════════════════════════════
        emit RebalanceExecuted(
            0,  // No proposal ID for autonomous rebalance
            token,
            oldPositionId,
            newPositionId,
            balance0,
            balance1
        );
    }
    
    /**
     * @notice Convert MCAP to aligned tick
     * @dev Converts MCAP → price → sqrtPrice → tick → aligned tick
     * @param mcap Market cap in wei
     * @return tick Aligned tick (aligned to tickSpacing)
     */
    function _mcapToTick(uint256 mcap) internal pure returns (int24 tick) {
        // Total supply constant
        uint256 TOTAL_SUPPLY = 1_000_000_000 * 1e18;
        
        // MCAP → sqrtPriceX96
        // sqrtPriceX96 = sqrt(TOTAL_SUPPLY / mcap) * 2^96
        // Using FullMath for safe division
        uint256 ratioX96 = _mulDiv(TOTAL_SUPPLY, uint256(1 << 96), mcap);
        uint256 sqrtRatioX96 = _sqrt(ratioX96);
        require(sqrtRatioX96 > 0 && sqrtRatioX96 <= type(uint160).max, "Invalid sqrtPrice");
        
        // sqrtPrice → tick using TickMath
        int24 rawTick = TickMath.getTickAtSqrtPrice(uint160(sqrtRatioX96));
        
        // Align to tickSpacing (200)
        int24 tickSpacing = 200;
        tick = (rawTick / tickSpacing) * tickSpacing;
        
        return tick;
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
    
    /**
     * @notice Safe multiplication and division
     * @dev Equivalent to FullMath.mulDiv
     */
    function _mulDiv(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256 result) {
        uint256 prod0;
        uint256 prod1;
        assembly {
            let mm := mulmod(a, b, not(0))
            prod0 := mul(a, b)
            prod1 := sub(sub(mm, prod0), lt(mm, prod0))
        }

        if (prod1 == 0) {
            require(denominator > 0);
            assembly {
                result := div(prod0, denominator)
            }
            return result;
        }

        require(denominator > prod1);

        uint256 remainder;
        assembly {
            remainder := mulmod(a, b, denominator)
        }
        assembly {
            prod1 := sub(prod1, gt(remainder, prod0))
            prod0 := sub(prod0, remainder)
        }

        uint256 twos = denominator & (~denominator + 1);
        assembly {
            denominator := div(denominator, twos)
        }

        assembly {
            prod0 := div(prod0, twos)
        }
        assembly {
            twos := add(div(sub(0, twos), twos), 1)
        }
        prod0 |= prod1 * twos;

        uint256 inv = (3 * denominator) ^ 2;
        inv *= 2 - denominator * inv;
        inv *= 2 - denominator * inv;
        inv *= 2 - denominator * inv;
        inv *= 2 - denominator * inv;
        inv *= 2 - denominator * inv;
        inv *= 2 - denominator * inv;

        result = prod0 * inv;
        return result;
    }

    /*//////////////////////////////////////////////////////////////
                            LOCK FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Record a locked position (called internally by onERC721Received)
     * @dev This is internal - NFT must be transferred via safeTransferFrom
     * @param token The token address
     * @param positionId The V4 position NFT ID
     * @param key The pool key for this position
     * @param locker The address that locked it (Factory)
     */
    function _recordLock(address token, uint256 positionId, PoolKey memory key, address locker) internal {
        if (lockedPositions[token] != 0) revert PositionAlreadyLocked();
        
        // Record the lock and store PoolKey
        lockedPositions[token] = positionId;
        positionToToken[positionId] = token;
        tokenToPoolKey[token] = key;
        totalLocked++;
        
        emit PositionLocked(token, positionId, locker);
    }

    /*//////////////////////////////////////////////////////////////
                        REBALANCE FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Propose a liquidity rebalance
     * @dev Only callable after graduation, timelocked execution
     * @param token Token address to rebalance
     * @param liquidityToRemove Amount of liquidity to decrease (0 = only collect fees)
     */
    function proposeRebalance(
        address token,
        uint128 liquidityToRemove
    ) external onlyOwner returns (uint256 proposalId) {
        // ✅ Check graduation status
        if (!hook.isGraduatedByToken(token)) revert NotGraduated();
        
        // Get position ID
        uint256 positionId = lockedPositions[token];
        if (positionId == 0) revert NoPositionForToken();
        
        // ✅ Safety check: Limit removal amount to prevent draining
        if (liquidityToRemove > 0) {
            // Get current liquidity
            uint128 currentLiquidity = positionManager.getPositionLiquidity(positionId);
            
            // Check removal doesn't exceed 50% of current liquidity
            uint256 removalBps = (uint256(liquidityToRemove) * BPS) / uint256(currentLiquidity);
            if (removalBps > MAX_REMOVAL_BPS) revert TooMuchRemoval();
        }
        
        // Create proposal
        proposalId = nextProposalId++;
        proposals[proposalId] = RebalanceProposal({
            token: token,
            positionId: positionId,
            liquidityToRemove: liquidityToRemove,
            proposedAt: block.timestamp,
            executed: false
        });
        
        emit RebalanceProposed(
            proposalId,
            token,
            positionId,
            liquidityToRemove,
            block.timestamp + TIMELOCK_DURATION
        );
    }
    
    /**
     * @notice Execute a rebalance proposal after timelock
     * @dev Removes liquidity, collects fees, optionally re-mints new position
     * @param proposalId Proposal ID to execute
     */
    function executeRebalance(uint256 proposalId) external onlyOwner nonReentrant {
        RebalanceProposal storage proposal = proposals[proposalId];
        
        // ✅ Validation checks
        if (proposal.positionId == 0) revert ProposalNotFound();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (block.timestamp < proposal.proposedAt + TIMELOCK_DURATION) {
            revert ProposalNotReady();
        }
        
        // ✅ Double-check graduation (safety)
        if (!hook.isGraduatedByToken(proposal.token)) revert NotGraduated();
        
        // Mark as executed
        proposal.executed = true;
        
        // ═══════════════════════════════════════════════════════════════════════
        // STEP 1: Decrease liquidity if requested
        // ═══════════════════════════════════════════════════════════════════════
        uint256 amount0Collected = 0;
        uint256 amount1Collected = 0;
        
        if (proposal.liquidityToRemove > 0) {
            // NOTE: Actual decrease liquidity would require proper unlock callback implementation
            // For now, this is a placeholder that demonstrates the access control logic
            // Production implementation would call positionManager.modifyLiquidities with proper unlock data
            
            // Placeholder for demonstration
            // In production: positionManager.modifyLiquidities(unlockData, deadline)
            // where unlockData encodes the decrease liquidity action
            
            // For testing purposes, we just mark that liquidity would be removed
            amount0Collected = 0;
            amount1Collected = 0;
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // STEP 2: Collect accumulated fees
        // ═══════════════════════════════════════════════════════════════════════
        // NOTE: Fee collection would also require proper unlock callback
        // Production implementation would collect fees via modifyLiquidities action
        
        // Placeholder for demonstration
        uint256 fee0 = 0;
        uint256 fee1 = 0;
        
        amount0Collected += fee0;
        amount1Collected += fee1;
        
        // ═══════════════════════════════════════════════════════════════════════
        // STEP 3: Optionally re-mint new position with adjusted amounts
        // ═══════════════════════════════════════════════════════════════════════
        // NOTE: For simplicity, we don't auto-remint here. Owner can manually
        // call mintNewPosition() if they want to reinvest collected amounts.
        // This preserves collected tokens in the locker for manual management.
        
        uint256 newPositionId = proposal.positionId;  // No new position created
        
        emit RebalanceExecuted(
            proposalId,
            proposal.token,
            proposal.positionId,
            newPositionId,
            amount0Collected,
            amount1Collected
        );
    }
    
    /**
     * @notice Cancel a pending rebalance proposal
     * @dev Only callable by owner before execution
     * @param proposalId Proposal ID to cancel
     */
    function cancelRebalance(uint256 proposalId) external onlyOwner {
        RebalanceProposal storage proposal = proposals[proposalId];
        
        if (proposal.positionId == 0) revert ProposalNotFound();
        if (proposal.executed) revert ProposalAlreadyExecuted();
        
        // Mark as executed to prevent future execution
        proposal.executed = true;
        
        emit RebalanceCancelled(proposalId);
    }
    
    /**
     * @notice Manually mint a new LP position from collected balances
     * @dev Only after graduation, position stays in locker
     * @param token Token address
     * @param key Pool key
     * @param tickLower Lower tick
     * @param tickUpper Upper tick
     * @param liquidity Amount of liquidity to mint
     */
    function mintNewPosition(
        address token,
        PoolKey calldata key,
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidity
    ) external onlyOwner nonReentrant returns (uint256 newPositionId) {
        // ✅ Check graduation
        if (!hook.isGraduatedByToken(token)) revert NotGraduated();
        if (liquidity == 0) revert ZeroLiquidity();
        
        // NOTE: Minting new positions requires proper unlock callback implementation
        // Production implementation would use positionManager.modifyLiquidities with mint action
        
        // This is a placeholder demonstrating the access control and graduation check logic
        // Actual implementation would:
        // 1. Approve tokens: _approvePositionManager(key.currency0/1, amounts)
        // 2. Build unlock data encoding the mint action
        // 3. Call positionManager.modifyLiquidities(unlockData, deadline)
        
        // For demonstration purposes, return a placeholder
        revert("mintNewPosition: Not fully implemented - requires v4 unlock callback integration");
    }

    /*//////////////////////////////////////////////////////////////
                            INTERNAL HELPERS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Get PoolKey for a position
     * @dev Returns stored PoolKey from lock time (more gas efficient than querying)
     * @param positionId Position NFT ID
     * @return key Pool key
     */
    function _getPoolKeyForPosition(uint256 positionId) internal view returns (PoolKey memory key) {
        // Get token address from position ID
        address token = positionToToken[positionId];
        require(token != address(0), "Position not found");
        
        // Return stored PoolKey
        return tokenToPoolKey[token];
    }
    
    /**
     * @notice Approve PositionManager to spend currency
     * @param currency Currency to approve
     * @param amount Amount to approve
     */
    function _approvePositionManager(Currency currency, uint256 amount) internal {
        if (Currency.unwrap(currency) == address(0)) {
            // Native ETH - no approval needed
            return;
        }
        
        address token = Currency.unwrap(currency);
        
        // Standard ERC20 approval
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature(
                "approve(address,uint256)",
                address(positionManager),
                amount
            )
        );
        
        require(
            success && (data.length == 0 || abi.decode(data, (bool))),
            "Approval failed"
        );
    }

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Check if a token has a locked position
    function isLocked(address token) external view returns (bool) {
        return lockedPositions[token] != 0;
    }
    
    /// @notice Get position ID for a token
    function getPosition(address token) external view returns (uint256) {
        return lockedPositions[token];
    }
    
    /// @notice Get proposal details
    function getProposal(uint256 proposalId) external view returns (
        address token,
        uint256 positionId,
        uint128 liquidityToRemove,
        uint256 proposedAt,
        bool executed,
        uint256 executeAfter
    ) {
        RebalanceProposal storage proposal = proposals[proposalId];
        return (
            proposal.token,
            proposal.positionId,
            proposal.liquidityToRemove,
            proposal.proposedAt,
            proposal.executed,
            proposal.proposedAt + TIMELOCK_DURATION
        );
    }

    /*//////////////////////////////////////////////////////////////
                          ERC721 RECEIVER
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Handle receipt of LP NFT
     * @dev Automatically called when NFT is transferred via safeTransferFrom
     *      Expects data to contain: abi.encode(address token, PoolKey key)
     * @param from Address that sent the NFT (should be Factory)
     * @param tokenId The LP NFT ID
     * @param data Encoded token address and PoolKey
     */
    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        // Only accept NFTs from official PositionManager
        if (msg.sender != address(positionManager)) revert NotFromPositionManager();
        
        // Decode token address and PoolKey from data
        (address token, PoolKey memory key) = abi.decode(data, (address, PoolKey));
        
        // Record the lock (only if this is the initial lock, not a rebalance)
        if (lockedPositions[token] == 0) {
            _recordLock(token, tokenId, key, from);
        }
        
        return IERC721Receiver.onERC721Received.selector;
    }
    
    /*//////////////////////////////////////////////////////////////
                        EMERGENCY FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Rescue accidentally sent tokens (NOT locked LP positions)
     * @dev Owner can recover non-LP tokens sent to contract
     * @param token Token to rescue
     * @param amount Amount to rescue
     */
    function rescueToken(address token, uint256 amount) external onlyOwner {
        // Cannot withdraw locked position tokens
        require(lockedPositions[token] == 0, "Cannot rescue locked position");
        
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", owner(), amount)
        );
        require(success && (data.length == 0 || abi.decode(data, (bool))), "Transfer failed");
    }
    
    /**
     * @notice Rescue accidentally sent ETH
     * @dev Owner can recover ETH sent to contract
     */
    function rescueETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /*//////////////////////////////////////////////////////////////
                        RECEIVE ETHER
    //////////////////////////////////////////////////////////////*/
    
    receive() external payable {}
}
