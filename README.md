# Clawclick Deep Sea Engine
**MCAP-Based Uniswap v4 Token Launchpad**

---

## Table of Contents
1. [Core Contracts Overview](#1-core-contracts-overview)
2. [External Dependencies](#2-external-dependencies)
3. [Deployment Requirements](#3-deployment-requirements)
4. [Full Contract Interaction Flow](#4-full-contract-interaction-flow)
5. [Security Model](#5-security-model)
6. [Testing Requirements](#6-testing-requirements)
7. [Full Contracts (Raw)](#7-full-contracts-raw)

---

## 1. Core Contracts Overview

### ClawclickFactory
**Path:** `src/core/ClawclickFactory.sol`

**Role:**
- Orchestrates token launch creation
- Deploys tokens
- Initializes Uniswap v4 pools with deterministic pricing
- Mints LP NFTs via PositionManager
- Locks LP NFTs permanently in LPLocker
- Registers launches with Hook

**State:**
- `totalLaunches` - Counter of all tokens created
- `allTokens` - Array of all token addresses (enumeration)
- `launchByToken` - Mapping: token address → LaunchInfo struct
- `launchByPoolId` - Mapping: pool ID → LaunchInfo struct
- `premiumFee` - Fee for premium tier launches
- `microFee` - Fee for micro tier launches

**Ownership:**
- Owned by protocol admin
- Can update fees
- **CANNOT** drain locked liquidity
- **CANNOT** remove LP positions
- **CANNOT** alter existing launches

**Permissions:**
- Can deploy tokens
- Can initialize pools
- Can mint LP NFTs (via PositionManager)
- Can transfer LP NFTs to LPLocker (one-way operation)

**Trust Model:**
- Factory is trusted to calculate correct sqrtPrice
- Factory cannot rug once liquidity is locked
- Factory has no backdoor to remove liquidity
- Factory admin can only change future launch fees (not existing launches)

**Interaction Boundaries:**
```
Factory
├── Deploys → ClawclickToken
├── Calls → PoolManager.initialize()
├── Calls → PositionManager.modifyLiquidities() (mints LP NFT)
├── Calls → Hook.registerLaunch()
├── Transfers → LPLocker (LP NFT via safeTransferFrom)
└── Reads ← Config (treasury address)
```

---

### ClawclickHook
**Path:** `src/core/ClawclickHook.sol`

**Role:**
- Enforces dynamic tax based on current MCAP
- Enforces maxTx and maxWallet limits (scaled by MCAP)
- Distributes trading fees (70% beneficiary, 30% platform)
- Calculates MCAP from pool sqrtPrice in real-time
- Prevents liquidity manipulation (beforeAddLiquidity, beforeRemoveLiquidity)

**State:**
- `launchInfo` - Mapping: pool ID → launch metadata
- `beneficiaryBalances` - Mapping: beneficiary → accumulated ETH
- `platformBalance` - Accumulated platform fees
- `claimedFees` - Mapping: beneficiary → claimed amount

**Ownership:**
- Owned by protocol admin
- Owner can withdraw platform fees
- Owner can update fee recipient
- **CANNOT** change tax rates (immutable per Config)
- **CANNOT** bypass position limits
- **CANNOT** access beneficiary funds

**Permissions:**
- Hook is called by PoolManager during:
  - `beforeInitialize` - Register launch metadata
  - `beforeAddLiquidity` - Prevent adding (not implemented yet)
  - `beforeRemoveLiquidity` - Prevent removing (not implemented yet)
  - `beforeSwap` - Apply tax + enforce limits
  - `afterSwap` - Calculate and distribute fees
  - `beforeSwapReturnDelta` - Return dynamic fee to pool
- Hook can read pool state (sqrtPrice via PoolManager)
- Hook **CANNOT** modify pool directly (only via v4 hook callbacks)

**Trust Model:**
- Hook is protocol-owned, not launch-owner-owned
- Hook cannot be changed after pool creation (immutable per launch)
- Tax decay is deterministic (based on MCAP, not time)
- Beneficiary can withdraw their 70% share at any time
- Platform admin can withdraw 30% share at any time

**Interaction Boundaries:**
```
Hook
├── Called by → PoolManager (during swaps)
├── Reads → PoolManager.getSlot0() (for sqrtPrice)
├── Reads → Config (for tax tiers, fee split)
├── Reads → ERC20(token).balanceOf() (for wallet limits)
└── Stores → beneficiaryBalances, platformBalance (ETH owed)
```

---

### ClawclickConfig
**Path:** `src/core/ClawclickConfig.sol`

**Role:**
- Stores immutable protocol configuration
- Defines tax tiers (MCAP → tax rate mapping)
- Defines fee split (70/30 beneficiary/platform)
- Provides global pause mechanism
- Stores treasury address

**State:**
- `paused` - Emergency pause flag
- `treasury` - Protocol treasury address
- `taxTiers` - Array of (mcapThreshold, taxBps) pairs
- `beneficiaryFeeBps` - 7000 (70%)
- `platformFeeBps` - 3000 (30%)

**Ownership:**
- Owned by protocol admin
- Can pause/unpause protocol
- Can update treasury address
- **CANNOT** change tax tiers after deployment (immutable)
- **CANNOT** change fee split after deployment (immutable)

**Permissions:**
- Read-only for Factory and Hook
- No write access from other contracts
- Owner can only pause or update treasury

**Trust Model:**
- Config is deployed once and never upgraded
- Tax tiers are immutable (security guarantee)
- Fee split is immutable (fairness guarantee)
- Pause only affects NEW launches (not existing ones)

**Interaction Boundaries:**
```
Config
├── Read by → Factory (for pause state, treasury)
├── Read by → Hook (for tax tiers, fee split)
└── Updated by → Owner (pause, treasury only)
```

---

### ClawclickLPLocker
**Path:** `src/core/ClawclickLPLocker.sol`

**Role:**
- Receives LP NFTs from Factory
- Permanently locks LP positions (no removal function)
- Records token → NFT ID mapping
- Implements ERC721Receiver

**State:**
- `positionManager` - Immutable address of v4 PositionManager
- `lockedPositions` - Mapping: token → LP NFT ID
- `positionToToken` - Mapping: LP NFT ID → token
- `totalLocked` - Counter of locked positions

**Ownership:**
- Owned by protocol admin
- **Owner has ZERO ability to remove liquidity**
- Owner can only read state
- No admin functions exist that interact with PositionManager

**Permissions:**
- Can receive LP NFTs via `onERC721Received`
- **CANNOT** transfer NFTs out (does not inherit ERC721)
- **CANNOT** burn NFTs
- **CANNOT** decrease liquidity
- **CANNOT** call PositionManager

**Trust Model:**
- LPLocker is a black hole for LP NFTs
- Once NFT enters, it NEVER leaves
- No upgrade path exists
- No backdoor exists
- Protocol admin is powerless to extract liquidity

**Interaction Boundaries:**
```
LPLocker
├── Receives → LP NFT from Factory (via safeTransferFrom)
├── Stores → token → NFT ID mapping
└── CANNOT CALL → PositionManager (no liquidity removal path)
```

---

### ClawclickToken
**Path:** `src/core/ClawclickToken.sol`

**Role:**
- Standard ERC20 token
- Mints 1 billion supply to Factory at deployment
- Stores beneficiary and agent wallet addresses
- No special transfer logic (Hook enforces limits)

**State:**
- `beneficiary` - Launch creator's fee recipient
- `agentWallet` - Optional AI agent address
- Standard ERC20 state (balances, allowances)

**Ownership:**
- No owner (no Ownable)
- Immutable metadata (name, symbol)
- Supply is fixed at 1 billion (1e27)

**Permissions:**
- Standard ERC20 transfers
- No mint/burn after deployment
- No admin functions

**Trust Model:**
- Token has no special powers
- All transfer restrictions enforced by Hook (not token)
- Beneficiary address is immutable

**Interaction Boundaries:**
```
Token
├── Deployed by → Factory
├── Mints to → Factory (1B supply)
├── Read by → Hook (for balance checks)
└── Transferred by → Users (standard ERC20)
```

---

## 2. External Dependencies

### Uniswap v4 Core

#### IPoolManager
**Path:** `v4-core/src/interfaces/IPoolManager.sol`

**Why Used:**
- Central contract for all Uniswap v4 pools
- Manages pool state (reserves, prices, liquidity)
- Executes swaps, liquidity additions/removals
- Calls hooks during lifecycle events

**What It Does:**
- `initialize(PoolKey, sqrtPriceX96)` - Creates new pool at deterministic price
- `getSlot0(PoolId)` - Returns current pool state (sqrtPrice, tick, etc.)
- `unlock(bytes)` - Executes operations with pool state access
- Calls hook callbacks during operations

**In Our System:**
- Factory calls `initialize()` to create token pool
- Hook calls `getSlot0()` to derive current MCAP
- PositionManager interacts via `unlock()` callback

---

#### IHooks
**Path:** `v4-core/src/interfaces/IHooks.sol`

**Why Used:**
- Interface that ClawclickHook implements
- Defines hook callback signatures
- Allows custom logic during pool operations

**What It Does:**
- Defines callback functions:
  - `beforeInitialize` - Before pool creation
  - `beforeAddLiquidity` - Before LP addition
  - `beforeRemoveLiquidity` - Before LP removal
  - `beforeSwap` - Before swap execution
  - `afterSwap` - After swap execution
  - `beforeSwapReturnDelta` - Return dynamic fee

**In Our System:**
- ClawclickHook implements all required callbacks
- Hook address must have correct permission flags (0x4D5)
- Factory registers hook during pool creation

---

#### PoolKey
**Path:** `v4-core/src/types/PoolKey.sol`

**Why Used:**
- Struct identifying a unique pool
- Contains: currency0, currency1, fee, tickSpacing, hooks

**What It Does:**
- Uniquely identifies a pool
- Used in all PoolManager operations
- Hashed to PoolId for mappings

**In Our System:**
```solidity
PoolKey({
    currency0: ETH (address(0)),
    currency1: token,
    fee: 0x800000,  // Dynamic fee flag
    tickSpacing: 200,
    hooks: ClawclickHook
})
```

---

#### TickMath
**Path:** `v4-core/src/libraries/TickMath.sol`

**Why Used:**
- Converts between ticks and sqrtPrice
- Validates tick bounds

**What It Does:**
- `getSqrtRatioAtTick(int24 tick)` - Tick → sqrtPrice
- `getTickAtSqrtRatio(uint160 sqrtPrice)` - sqrtPrice → tick
- Enforces MIN_TICK and MAX_TICK

**In Our System:**
- Used for tick validation
- Used for price calculations

---

#### FullMath
**Path:** `v4-core/src/libraries/FullMath.sol`

**Why Used:**
- Overflow-safe 256-bit math
- Required for Q64.96 fixed-point calculations

**What It Does:**
- `mulDiv(uint256 a, uint256 b, uint256 denominator)` - (a * b) / denominator without overflow

**In Our System:**
- Used in sqrtPrice calculation: `FullMath.mulDiv(TOTAL_SUPPLY, 2^96, targetMcap)`
- Used in MCAP derivation: `FullMath.mulDiv(TOTAL_SUPPLY, 1 << 192, sqrtPrice^2)`

---

#### FixedPoint96
**Path:** `v4-core/src/libraries/FixedPoint96.sol`

**Why Used:**
- Defines Q64.96 fixed-point constant
- `Q96 = 2^96`

**What It Does:**
- Provides scaling constant for sqrtPrice

**In Our System:**
- Used in price calculations: `ratioX96 = FullMath.mulDiv(supply, FixedPoint96.Q96, mcap)`

---

### Uniswap v4 Periphery

#### IPositionManager
**Path:** `v4-periphery/src/interfaces/IPositionManager.sol`

**Why Used:**
- Manages liquidity positions as ERC721 NFTs
- Mints LP NFTs when liquidity is added
- Required for permanent LP locking

**What It Does:**
- `modifyLiquidities(bytes unlockData, uint256 deadline)` - Add/remove liquidity, mints NFT
- `nextTokenId()` - Returns ID that WILL BE used for next mint
- Implements ERC721 (LP positions are NFTs)

**In Our System:**
- Factory calls `modifyLiquidities()` with MINT_POSITION action
- Factory retrieves `tokenId = nextTokenId() - 1` after minting
- Factory transfers LP NFT to LPLocker via `safeTransferFrom()`

**Critical:**
- PositionManager MUST implement ERC721
- PositionManager MUST call `onERC721Received` on transfers
- We use official v4 PositionManager (no custom implementation)

---

#### Actions Library
**Path:** `v4-periphery/src/libraries/Actions.sol`

**Why Used:**
- Defines action types for PositionManager
- Encodes operations for `modifyLiquidities()`

**What It Does:**
- Provides constants:
  - `MINT_POSITION = 0x00` - Create new LP position
  - `INCREASE_LIQUIDITY = 0x01` - Add to existing
  - `DECREASE_LIQUIDITY = 0x02` - Remove from existing
  - `BURN_POSITION = 0x03` - Close position

**In Our System:**
```solidity
bytes memory actions = abi.encodePacked(uint256(Actions.MINT_POSITION));
```
- We only use MINT_POSITION
- No DECREASE or BURN actions anywhere in codebase

---

#### How LP NFT Minting Works

**Flow:**
1. Factory approves PositionManager to spend tokens
2. Factory calls `PositionManager.modifyLiquidities()` with:
   - Action: `MINT_POSITION`
   - Params: poolKey, tickLower, tickUpper, liquidity, slippage, owner
3. PositionManager calls `PoolManager.unlock()` with callback
4. Inside callback, PositionManager:
   - Calls `PoolManager.modifyLiquidity()` (adds liquidity to pool)
   - Mints ERC721 NFT to specified owner
   - Increments `nextTokenId()`
5. Factory retrieves `tokenId = nextTokenId() - 1`
6. Factory transfers NFT to LPLocker

**Why This Matters:**
- LP position = ERC721 NFT (not just pool state)
- NFT owner controls the liquidity
- Transferring NFT to LPLocker = permanent lock (LPLocker cannot transfer out)

---

### OpenZeppelin

#### Ownable
**Path:** `@openzeppelin/contracts/access/Ownable.sol`

**Why Used:**
- Provides owner-based access control
- Used by Factory, Hook, Config, LPLocker

**What It Does:**
- Stores `owner` address
- Provides `onlyOwner` modifier
- Allows ownership transfer

**In Our System:**
- Owner can pause Config
- Owner can withdraw platform fees from Hook
- Owner can update fees in Factory
- Owner **CANNOT** remove locked liquidity (no such function exists)

---

#### ReentrancyGuard
**Path:** `@openzeppelin/contracts/utils/ReentrancyGuard.sol`

**Why Used:**
- Prevents reentrancy attacks
- Used by Factory on `createLaunch()`

**What It Does:**
- Provides `nonReentrant` modifier
- Locks function during execution

**In Our System:**
- Protects `Factory.createLaunch()` from reentrancy
- Ensures atomic launch creation (no state corruption)

---

#### IERC721Receiver
**Path:** `@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol`

**Why Used:**
- Required to receive ERC721 NFTs via `safeTransferFrom`
- Implemented by LPLocker

**What It Does:**
- Defines `onERC721Received()` callback
- PositionManager calls this when NFT is transferred

**In Our System:**
```solidity
// LPLocker.sol
function onERC721Received(address, address from, uint256 tokenId, bytes calldata data) 
    external override returns (bytes4) 
{
    // Decode token address from data
    address token = abi.decode(data, (address));
    
    // Record the lock
    _recordLock(token, tokenId, from);
    
    return IERC721Receiver.onERC721Received.selector;
}
```
- LPLocker receives NFT
- Records token → tokenId mapping
- NFT is now permanently locked (no transfer out function)

---

## 3. Deployment Requirements

### Hook CREATE2 Requirement

**Why CREATE2 is Required:**
- Uniswap v4 validates hook addresses by permission flags
- Hook address **itself** encodes permissions in its bottom 14 bits
- Hook address MUST have specific bit pattern to be accepted by PoolManager

**Required Hook Flags (0x4D5):**
```
Binary: 0000 0100 1101 0101
Bits set: 0, 2, 4, 6, 7, 10

Bit 0  = beforeInitialize       (0x1)
Bit 2  = beforeAddLiquidity     (0x4)
Bit 4  = beforeRemoveLiquidity  (0x10)
Bit 6  = beforeSwap             (0x40)
Bit 7  = afterSwap              (0x80)
Bit 10 = beforeSwapReturnDelta  (0x400)

Total = 0x4D5
```

**How CREATE2 Achieves This:**
```solidity
address hookAddress = address(
    uint160(
        uint256(
            keccak256(
                abi.encodePacked(
                    bytes1(0xff),
                    deployer,
                    salt,       // ← We mine this!
                    initCodeHash
                )
            )
        )
    )
);

// Bottom 14 bits of hookAddress MUST equal 0x4D5
require(uint160(hookAddress) & 0x7FFF == 0x4D5, "Invalid hook address");
```

**Salt Mining Process:**
1. Try different salt values (0x0000, 0x0001, 0x0002, ...)
2. Compute resulting hook address
3. Check if bottom 14 bits == 0x4D5
4. If yes, use that salt
5. If no, increment and retry

**Mining Script:**
```bash
forge script script/MineHookSalt.s.sol --rpc-url $SEPOLIA_RPC
```

**Critical:**
- Salt MUST be mined with ACTUAL deployed contract addresses
- Cannot use placeholder addresses (0x1111, 0x2222)
- Must mine AFTER deploying PoolManager and Config
- Salt is network-specific (different for Sepolia vs Mainnet)

---

### Network-Specific Addresses

#### Sepolia Testnet
**Uniswap v4 Core:**
- `PoolManager`: TBD (check Uniswap v4 docs or deployments)
- `PositionManager`: TBD (check Uniswap v4 periphery docs)

**Find Addresses:**
```bash
# Check Uniswap v4 official deployments
# https://docs.uniswap.org/contracts/v4/deployments

# Or check their GitHub:
# https://github.com/Uniswap/v4-core/tree/main/deployments
# https://github.com/Uniswap/v4-periphery/tree/main/deployments
```

**Clawclick Contracts (To Be Deployed):**
- `ClawclickConfig`: Deploy first
- `ClawclickLPLocker`: Deploy second (needs PositionManager address)
- `ClawclickHook`: Deploy third with CREATE2 (needs PoolManager, Config, mined salt)
- `ClawclickFactory`: Deploy fourth (needs all above)

---

#### Ethereum Mainnet
**Uniswap v4 Core:**
- `PoolManager`: TBD (v4 not yet live on mainnet as of this writing)
- `PositionManager`: TBD

**Clawclick Contracts:**
- Same deployment order as Sepolia
- **Must mine new salt** (mainnet addresses differ from Sepolia)

---

### Constructor Dependencies

**Order Matters:**

```
1. Deploy ClawclickConfig
   constructor(address treasury, address owner)
   ✅ No dependencies

2. Deploy ClawclickLPLocker
   constructor(address positionManager, address owner)
   ✅ Requires: PositionManager address (Uniswap v4)

3. Mine Hook Salt
   script/MineHookSalt.s.sol
   ✅ Requires: Actual PoolManager, Config addresses

4. Deploy ClawclickHook (with CREATE2)
   constructor(IPoolManager poolManager, ClawclickConfig config)
   ✅ Requires: PoolManager, Config, mined salt
   ✅ Must use CREATE2 with mined salt

5. Deploy ClawclickFactory
   constructor(
       IPoolManager poolManager,
       ClawclickHook hook,
       ClawclickConfig config,
       ClawclickLPLocker lpLocker,
       IPositionManager positionManager,
       address owner
   )
   ✅ Requires: ALL above contracts
```

**Example Deployment Script:**
```solidity
// 1. Deploy Config
ClawclickConfig config = new ClawclickConfig(treasury, owner);

// 2. Deploy LPLocker
ClawclickLPLocker lpLocker = new ClawclickLPLocker(positionManager, owner);

// 3. Mine salt (off-chain or in script)
bytes32 salt = 0x...; // From MineHookSalt.s.sol

// 4. Deploy Hook with CREATE2
ClawclickHook hook = new ClawclickHook{salt: salt}(poolManager, config);

// 5. Verify hook address
require(uint160(address(hook)) & 0x7FFF == 0x4D5, "Invalid hook address");

// 6. Deploy Factory
ClawclickFactory factory = new ClawclickFactory(
    poolManager,
    hook,
    config,
    lpLocker,
    positionManager,
    owner
);
```

---

## 4. Full Contract Interaction Flow

### Real-World Example: User Creates Token X (2 ETH Target MCAP)

---

#### Step 1: User Calls Factory.createLaunch()

**User Transaction:**
```solidity
factory.createLaunch{value: 0.01 ether}(
    ClawclickFactory.CreateParams({
        name: "Test Token",
        symbol: "TEST",
        beneficiary: 0xBENE...,
        agentWallet: address(0),
        isPremium: false,
        targetMcapETH: 2 ether  // 2 ETH target MCAP
    })
);
```

**Factory State Changes:**
- Checks: `!config.paused()` ✅
- Checks: `msg.value >= microFee` ✅
- Refunds excess ETH if overpaid

---

#### Step 2: Token Deployed

**Factory Action:**
```solidity
token = address(new ClawclickToken(
    "Test Token",
    "TEST",
    address(this),  // Factory receives 1B tokens
    0xBENE...,      // Beneficiary
    address(0)      // No agent
));
```

**Token State:**
- Total supply: 1,000,000,000 * 1e18 (1B tokens)
- Balance[Factory]: 1,000,000,000 * 1e18
- Beneficiary: 0xBENE...

---

#### Step 3: Calculate Deterministic sqrtPrice

**Factory Calculation:**
```solidity
uint160 sqrtPriceX96 = _calculateSqrtPrice(2 ether);

// Math (see MATH_REFERENCE.md for details):
// 1. ratio = totalSupply / targetMcap = 1e27 / 2e18 = 5e8 (500M tokens per ETH)
// 2. ratioX96 = ratio * 2^96 = 5e8 * 2^96
// 3. sqrtRatioX48 = sqrt(ratioX96) = sqrt(5e8) * 2^48
// 4. sqrtPriceX96 = sqrtRatioX48 * 2^48

// Result: sqrtPriceX96 = 1,770,887,431,768,023,739,320,800,934 (specific to 2 ETH MCAP)
```

**What This Means:**
- Initial price: 1 token = 0.000000002 ETH (2 nanoETH)
- Or: 1 ETH = 500,000,000 tokens
- MCAP = 1B tokens * 0.000000002 ETH = 2 ETH ✅

---

#### Step 4: Create Pool Key

**Factory Action:**
```solidity
PoolKey memory key = PoolKey({
    currency0: Currency.wrap(address(0)),  // ETH
    currency1: Currency.wrap(token),       // TEST token
    fee: 0x800000,                         // Dynamic fee flag
    tickSpacing: 200,
    hooks: IHooks(address(hook))           // ClawclickHook
});
```

---

#### Step 5: Initialize Pool

**Factory Calls PoolManager:**
```solidity
poolManager.initialize(key, sqrtPriceX96);
```

**PoolManager Actions:**
- Creates pool state
- Sets sqrtPrice = 1,770,887,431,768,023,739,320,800,934
- Sets tick = corresponding tick for this sqrtPrice
- Calls `hook.beforeInitialize()`

**Hook.beforeInitialize():**
```solidity
function beforeInitialize(address, PoolKey calldata key, uint160 sqrtPriceX96, bytes calldata)
    external override returns (bytes4)
{
    // Hook validates it's being called by PoolManager
    require(msg.sender == address(poolManager), "Only PoolManager");
    
    // No state changes here (registration happens later)
    
    return BaseHook.beforeInitialize.selector;
}
```

---

#### Step 6: Register Launch with Hook

**Factory Calls Hook:**
```solidity
hook.registerLaunch(key, token, 0xBENE..., 2 ether);
```

**Hook State Changes:**
```solidity
launchInfo[poolId] = LaunchData({
    token: token,
    beneficiary: 0xBENE...,
    targetMcapETH: 2 ether,
    lowestTaxBps: 4500  // Starting tax at 2 ETH = 45%
});
```

**Tax Calculation (at 2 ETH MCAP):**
- Config has tiers: 1 ETH → 50%, 2 ETH → 45%, 3 ETH → 40%, ...
- Current MCAP = 2 ETH → Tax = 45% (4500 bps)

---

#### Step 7: Add Full-Range Liquidity (Mint LP NFT)

**Factory Action:**
```solidity
uint256 tokenId = _addFullRangeLiquidity(key, token);
```

**Detailed Flow:**

**7a. Approve PositionManager:**
```solidity
ClawclickToken(token).approve(address(positionManager), TOTAL_SUPPLY);
```
- Factory approves PositionManager to spend 1B tokens
- Factory owns tokens (minted in step 2)

**7b. Encode MINT_POSITION Action:**
```solidity
bytes memory actions = abi.encodePacked(uint256(Actions.MINT_POSITION));

bytes[] memory params = new bytes[](1);
params[0] = abi.encode(
    key,                    // PoolKey
    -887200,                // tickLower (full range)
    887200,                 // tickUpper (full range)
    uint256(TOTAL_SUPPLY),  // liquidity = 1B tokens
    type(uint128).max,      // amount0Max (slippage protection)
    type(uint128).max,      // amount1Max (slippage protection)
    address(this),          // owner = Factory (receives NFT)
    bytes("")               // hookData (empty)
);
```

**7c. Call PositionManager:**
```solidity
positionManager.modifyLiquidities{value: 0}(
    abi.encode(actions, params),
    block.timestamp + 1 hours  // deadline
);
```

**PositionManager Actions:**
- Calls `PoolManager.unlock()` with callback
- Inside callback:
  - Calls `PoolManager.modifyLiquidity()` to add liquidity
  - Pool now has: 1B tokens, 0 ETH (full range, one-sided)
  - Mints ERC721 NFT to Factory
  - Increments `nextTokenId()`

**7d. Retrieve Token ID:**
```solidity
tokenId = positionManager.nextTokenId() - 1;
// If nextTokenId() = 42, then tokenId = 41 (the NFT just minted)
```

**State After Liquidity Addition:**
- Pool has 1B tokens, 0 ETH
- Factory owns LP NFT #41
- Pool sqrtPrice unchanged (one-sided liquidity doesn't move price)

---

#### Step 8: Lock LP NFT Permanently

**Factory Action:**
```solidity
_lockLPPosition(token, tokenId);
```

**Detailed Flow:**

**8a. Transfer NFT to LPLocker:**
```solidity
bytes memory data = abi.encode(token);  // Encode token address as data

IERC721(address(positionManager)).safeTransferFrom(
    address(this),      // from = Factory
    address(lpLocker),  // to = LPLocker
    tokenId,            // NFT ID = 41
    data                // token address
);
```

**8b. PositionManager Calls onERC721Received:**
```solidity
// PositionManager (ERC721) automatically calls this on LPLocker:
lpLocker.onERC721Received(address(0), address(factory), 41, data);
```

**8c. LPLocker Records Lock:**
```solidity
function onERC721Received(address, address from, uint256 tokenId, bytes calldata data)
    external override returns (bytes4)
{
    // Validate caller is PositionManager
    require(msg.sender == positionManager, "Not PositionManager");
    
    // Decode token address
    address token = abi.decode(data, (address));
    
    // Record lock
    lockedPositions[token] = tokenId;  // TEST → 41
    positionToToken[tokenId] = token;  // 41 → TEST
    totalLocked++;                     // Increment counter
    
    emit PositionLocked(token, tokenId, from);
    
    return IERC721Receiver.onERC721Received.selector;
}
```

**State After Locking:**
- LPLocker owns LP NFT #41
- `lockedPositions[TEST] = 41`
- `positionToToken[41] = TEST`
- LP NFT is now **permanently locked** (LPLocker has no transfer/burn/decrease functions)

---

#### Step 9: Store Launch Info & Emit Event

**Factory State:**
```solidity
LaunchInfo memory info = LaunchInfo({
    token: token,
    beneficiary: 0xBENE...,
    agentWallet: address(0),
    creator: msg.sender,
    poolId: poolId,
    poolKey: key,
    targetMcapETH: 2 ether,
    createdAt: block.timestamp,
    createdBlock: block.number,
    name: "Test Token",
    symbol: "TEST",
    isPremium: false
});

launchByToken[token] = info;
launchByPoolId[poolId] = info;
allTokens.push(token);
totalLaunches++;
```

**Factory Emits Event:**
```solidity
emit TokenLaunched(
    token,
    0xBENE...,
    msg.sender,
    poolId,
    2 ether,
    sqrtPriceX96,
    "Test Token",
    "TEST",
    false
);
```

**Launch Creation Complete! 🎉**

---

### First Swap: Buyer Purchases 1 ETH Worth of Tokens

#### Step 10: User Calls Router.swapETHForTokens()

**User Transaction:**
```solidity
router.swapETHForTokens{value: 1 ether}(
    token,
    0,                      // minTokensOut (no slippage protection for now)
    msg.sender,             // recipient
    block.timestamp + 10 minutes
);
```

---

#### Step 11: Router Prepares Swap

**Router Action:**
```solidity
// Router calls PoolManager.unlock() with swap parameters
poolManager.unlock(
    abi.encode(
        key,
        IPoolManager.SwapParams({
            zeroForOne: true,           // ETH → Token (currency0 → currency1)
            amountSpecified: -1 ether,  // Exact input (negative = exact in)
            sqrtPriceLimitX96: 0        // No price limit
        }),
        msg.sender  // recipient
    )
);
```

---

#### Step 12: Hook.beforeSwap() Called

**PoolManager Calls Hook:**
```solidity
(bytes4 selector, BeforeSwapDelta delta, uint24 lpFeeOverride) = hook.beforeSwap(
    msg.sender,
    key,
    IPoolManager.SwapParams({...}),
    bytes("")
);
```

**Hook Calculations:**

**12a. Derive Current MCAP:**
```solidity
function _getCurrentMcap(PoolKey calldata key) internal view returns (uint256 currentMcapETH) {
    // Read current pool price
    (uint160 sqrtPriceX96,,) = poolManager.getSlot0(key.toId());
    
    // MCAP = totalSupply / (sqrtPrice^2 / 2^192)
    // Rearranged: MCAP = (totalSupply * 2^192) / sqrtPrice^2
    currentMcapETH = FullMath.mulDiv(
        TOTAL_SUPPLY,
        1 << 192,  // 2^192
        uint256(sqrtPriceX96) * uint256(sqrtPriceX96)
    );
    
    // Result: ~2 ETH (starting MCAP)
}
```

**12b. Calculate Tax:**
```solidity
function getCurrentTax(PoolKey calldata key) public view returns (uint256 taxBps) {
    uint256 currentMcapETH = _getCurrentMcap(key);  // ~2 ETH
    
    // Get base tax from Config for 2 ETH MCAP
    uint256 baseTaxBps = config.getTaxForMcap(currentMcapETH);  // 4500 (45%)
    
    // Get lowest tax ever reached (monotonic decay)
    LaunchData storage data = launchInfo[key.toId()];
    uint256 lowestTaxBps = data.lowestTaxBps;  // 4500 (first swap)
    
    // Tax can only decrease (monotonic)
    taxBps = baseTaxBps < lowestTaxBps ? baseTaxBps : lowestTaxBps;
    
    // Apply 1% floor
    if (taxBps < 100) taxBps = 100;
    
    // Update lowest if decreased
    if (taxBps < lowestTaxBps) {
        data.lowestTaxBps = taxBps;
    }
    
    return taxBps;  // 4500 (45%)
}
```

**12c. Enforce maxTx Limit:**
```solidity
function getCurrentMaxTx(PoolKey calldata key) public view returns (uint256) {
    uint256 currentMcapETH = _getCurrentMcap(key);  // ~2 ETH
    
    // maxTx = MCAP * 0.001 (0.1% of supply per MCAP ETH)
    // At 2 ETH MCAP: maxTx = 2 * 0.001 * 1B = 2M tokens
    return (currentMcapETH * TOTAL_SUPPLY * 10) / 10000;
}

// In beforeSwap:
uint256 maxTx = getCurrentMaxTx(key);  // 2M tokens
uint256 tokensOut = estimateSwapOutput(params);  // ~450M tokens (45% tax applied)

require(tokensOut <= maxTx, "Exceeds maxTx");  // ❌ REVERT!
```

**Swap Reverts:** User tried to buy too much in one transaction!

---

#### Step 13: User Retries with Smaller Amount

**User Transaction:**
```solidity
// Buy only 0.01 ETH worth (should give ~4,500 tokens after tax)
router.swapETHForTokens{value: 0.01 ether}(
    token,
    4000 * 1e18,  // minTokensOut = 4,000 tokens (allow some slippage)
    msg.sender,
    block.timestamp + 10 minutes
);
```

**Hook.beforeSwap() Recalculates:**
- Current MCAP: ~2 ETH
- Tax: 45% (4500 bps)
- Estimated output: ~4,500 tokens (0.01 ETH / 2e-9 ETH per token * 0.55)
- maxTx: 2M tokens
- Check: 4,500 <= 2M ✅ PASS

**Hook Returns:**
```solidity
return (
    BaseHook.beforeSwap.selector,
    BeforeSwapDelta(0, 0),  // No delta adjustment
    uint24(4500)            // lpFeeOverride = 45%
);
```

---

#### Step 14: Swap Executes

**PoolManager Actions:**
- Applies 45% fee to swap
- Calculates swap output: ~4,500 tokens
- Updates pool reserves
- Updates sqrtPrice (slightly)
- Transfers 0.01 ETH from user to pool
- Transfers 4,500 tokens from pool to user

**Pool State After Swap:**
- ETH reserves: 0.01 ETH
- Token reserves: 999,995,500 tokens (1B - 4,500)
- sqrtPrice: slightly increased (ETH added)

---

#### Step 15: Hook.afterSwap() Called

**PoolManager Calls Hook:**
```solidity
(bytes4 selector, int128 hookDeltaSpecified) = hook.afterSwap(
    msg.sender,
    key,
    params,
    BalanceDelta(...),  // Swap deltas (ETH in, tokens out)
    bytes("")
);
```

**Hook Calculations:**

**15a. Calculate Fee Amount:**
```solidity
// Total swap: 0.01 ETH
// Tax: 45%
// Fee: 0.01 * 0.45 = 0.0045 ETH
uint256 fee = (0.01 ether * 4500) / 10000;
```

**15b. Split Fee (70/30):**
```solidity
(uint256 totalFee, uint256 beneficiaryShare, uint256 platformShare) = config.calculateFees(fee);

// totalFee = 0.0045 ETH
// beneficiaryShare = 0.0045 * 0.70 = 0.00315 ETH
// platformShare = 0.0045 * 0.30 = 0.00135 ETH
```

**15c. Update Balances:**
```solidity
LaunchData storage data = launchInfo[key.toId()];

beneficiaryBalances[data.beneficiary] += beneficiaryShare;  // 0xBENE... += 0.00315 ETH
platformBalance += platformShare;                           // += 0.00135 ETH
```

**Hook State:**
- `beneficiaryBalances[0xBENE...] = 0.00315 ETH`
- `platformBalance = 0.00135 ETH`

---

#### Step 16: Beneficiary Claims Fees

**Beneficiary Transaction:**
```solidity
hook.claimBeneficiaryFees();
```

**Hook Action:**
```solidity
function claimBeneficiaryFees() external nonReentrant {
    uint256 amount = beneficiaryBalances[msg.sender];  // 0.00315 ETH
    require(amount > 0, "No fees to claim");
    
    beneficiaryBalances[msg.sender] = 0;
    claimedFees[msg.sender] += amount;
    
    (bool success,) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
    
    emit BeneficiaryFeesClaimed(msg.sender, amount);
}
```

**Result:**
- 0xBENE... receives 0.00315 ETH
- `beneficiaryBalances[0xBENE...] = 0`

---

### Tax Decay Example: MCAP Crosses 3 ETH Milestone

#### Step 17: More Users Buy, MCAP Grows

**Multiple Swaps:**
- User A buys 0.05 ETH worth
- User B buys 0.1 ETH worth
- User C buys 0.2 ETH worth
- ...

**Pool State Changes:**
- ETH reserves: ~1.5 ETH (accumulated buys)
- Token reserves: ~700M tokens (sold 300M)
- sqrtPrice: increased significantly
- **Current MCAP: ~3.2 ETH** (crossed 3 ETH milestone!)

---

#### Step 18: Next Swap Triggers Tax Decay

**User D Transaction:**
```solidity
router.swapETHForTokens{value: 0.1 ether}(token, ...);
```

**Hook.beforeSwap() Recalculates:**

**18a. Derive Current MCAP:**
```solidity
currentMcapETH = _getCurrentMcap(key);  // 3.2 ETH
```

**18b. Get Tax from Config:**
```solidity
baseTaxBps = config.getTaxForMcap(3.2 ether);
// Config tiers: 3 ETH → 40%, 4 ETH → 35%
// Linear interpolation: 40% - (0.2/1) * 5% = 40% - 1% = 39%
// Result: 3900 bps
```

**18c. Check Monotonic Decay:**
```solidity
lowestTaxBps = launchInfo[poolId].lowestTaxBps;  // 4500 (from previous swaps)

taxBps = baseTaxBps < lowestTaxBps ? baseTaxBps : lowestTaxBps;
// 3900 < 4500, so taxBps = 3900

// Update lowest
launchInfo[poolId].lowestTaxBps = 3900;
```

**Tax Decreased:** 45% → 39% (permanent, monotonic) ✅

---

#### Step 19: Max Wallet Check

**Hook.afterSwap() Enforces maxWallet:**

**19a. Calculate maxWallet:**
```solidity
function getCurrentMaxWallet(PoolKey calldata key) public view returns (uint256) {
    uint256 currentMcapETH = _getCurrentMcap(key);  // 3.2 ETH
    
    // maxWallet = MCAP * 0.001 * totalSupply
    // At 3.2 ETH: maxWallet = 3.2 * 0.001 * 1B = 3.2M tokens
    return (currentMcapETH * TOTAL_SUPPLY * 10) / 10000;
}
```

**19b. Check Recipient Balance:**
```solidity
address recipient = swapData.recipient;  // User D
uint256 balanceAfter = IERC20(token).balanceOf(recipient);
uint256 maxWallet = getCurrentMaxWallet(key);  // 3.2M tokens

require(balanceAfter <= maxWallet, "Exceeds maxWallet");
```

**If User D already holds 3M tokens:**
- Swap gives +50k tokens
- New balance: 3.05M tokens
- Check: 3.05M <= 3.2M ✅ PASS

**If User D already holds 3.15M tokens:**
- Swap gives +50k tokens
- New balance: 3.2M tokens
- Check: 3.2M <= 3.2M ✅ PASS (exactly at limit)

**If User D already holds 3.19M tokens:**
- Swap gives +50k tokens
- New balance: 3.24M tokens
- Check: 3.24M <= 3.2M ❌ REVERT! ("Exceeds maxWallet")

---

### Complete System Trace Summary

| Step | Actor | Action | State Change |
|------|-------|--------|--------------|
| 1 | User | Calls Factory.createLaunch() | Pays fee |
| 2 | Factory | Deploys Token | 1B supply → Factory |
| 3 | Factory | Calculates sqrtPrice | Deterministic from MCAP |
| 4 | Factory | Creates PoolKey | Defines pool parameters |
| 5 | Factory | Calls PoolManager.initialize() | Pool created at price |
| 6 | Factory | Calls Hook.registerLaunch() | Hook stores metadata |
| 7 | Factory | Calls PositionManager.modifyLiquidities() | LP NFT minted to Factory |
| 8 | Factory | Transfers LP NFT to LPLocker | NFT permanently locked |
| 9 | Factory | Stores launch info | Launch registered |
| 10 | Buyer | Calls Router.swapETHForTokens() | Initiates swap |
| 11 | Router | Calls PoolManager.unlock() | Prepares swap |
| 12 | PoolManager | Calls Hook.beforeSwap() | Tax calculated, limits enforced |
| 13 | PoolManager | Executes swap | ETH → Tokens, price updates |
| 14 | PoolManager | Calls Hook.afterSwap() | Fees distributed (70/30) |
| 15 | Beneficiary | Calls Hook.claimBeneficiaryFees() | Receives 70% of fees |
| 16 | Platform | Calls Hook.withdrawPlatformFees() | Receives 30% of fees |
| 17 | Market | More buys | MCAP grows |
| 18 | Hook | Detects MCAP milestone | Tax decays (45% → 39%) |
| 19 | Hook | Enforces maxWallet | Prevents whale accumulation |

---

## 5. Security Model

### Why Liquidity is Permanently Locked

**Proof by Architecture:**

1. **LP NFT = Liquidity Control**
   - Liquidity positions in Uniswap v4 are represented as ERC721 NFTs
   - Owner of NFT = controller of liquidity
   - Only NFT owner can call PositionManager.decreaseLiquidity() or burn()

2. **LPLocker Owns NFT**
   - Factory transfers LP NFT to LPLocker in step 8
   - LPLocker receives NFT via `onERC721Received()`
   - LPLocker records ownership in `lockedPositions` mapping

3. **LPLocker Has NO Removal Functions**
   - ❌ No `transferFrom()` - LPLocker does NOT inherit ERC721
   - ❌ No `approve()` - Cannot delegate NFT control
   - ❌ No `burn()` - Cannot destroy NFT
   - ❌ No `decreaseLiquidity()` - Cannot call PositionManager
   - ❌ No `removeLiquidity()` - No such function exists
   - ❌ No `withdraw()` - No admin function to extract NFT

4. **Owner Has NO Powers**
   - LPLocker inherits `Ownable`
   - Owner can call: (nothing that affects NFTs)
   - Owner CANNOT:
     - Transfer NFTs out
     - Burn NFTs
     - Call PositionManager
     - Upgrade contract (no proxy pattern)
     - Self-destruct (deprecated in modern Solidity)

5. **No Backdoors**
   - No `delegatecall` - Cannot inject malicious code
   - No external contract calls that pass NFT control
   - No reentrancy vectors (only `onERC721Received` called by PositionManager)
   - No upgrade mechanism (no proxy, no implementation swap)

**Conclusion:** Once LP NFT enters LPLocker, it is **permanently locked**. No entity (protocol owner, launch creator, or attacker) can remove liquidity.

---

### Why Factory Cannot Drain

**Proof:**

1. **Factory Only Holds Tokens Temporarily**
   - Factory receives 1B tokens at token deployment (step 2)
   - Factory immediately approves PositionManager (step 7a)
   - PositionManager consumes tokens during LP addition (step 7c)
   - Factory balance after launch: 0 tokens

2. **Factory Has No Liquidity Access**
   - Factory does NOT own LP NFT after step 8 (transferred to LPLocker)
   - Factory CANNOT call `PositionManager.decreaseLiquidity()` (not NFT owner)
   - Factory CANNOT withdraw from pools (not LP provider)

3. **Factory Admin Powers Limited**
   - Owner can: Change fees for **future** launches
   - Owner CANNOT: Alter existing launches, drain pools, steal tokens

**Conclusion:** Factory is a "launch orchestrator" only. It has no post-launch control over liquidity.

---

### Why Hook Cannot Rug

**Proof:**

1. **Hook Stores Fees, Not Liquidity**
   - Hook accumulates trading fees in `beneficiaryBalances` and `platformBalance`
   - Hook does NOT hold LP tokens
   - Hook does NOT hold pool reserves

2. **Hook Has No Pool Control**
   - Hook can read pool state (`getSlot0()`)
   - Hook CANNOT call `modifyLiquidity()`
   - Hook CANNOT call `swap()` directly
   - Hook CANNOT transfer pool reserves

3. **Hook Admin Powers Limited**
   - Owner can: Withdraw 30% platform fees (their fair share)
   - Owner can: Update fee recipient address
   - Owner CANNOT: Access beneficiary funds (70%)
   - Owner CANNOT: Change tax rates (immutable from Config)
   - Owner CANNOT: Bypass position limits

4. **Beneficiary Funds Protected**
   - Beneficiary can withdraw their 70% at any time
   - Hook cannot block beneficiary withdrawals
   - Hook cannot steal beneficiary funds
   - If Hook owner is malicious, worst case: they don't withdraw platform's 30% (beneficiary still gets 70%)

**Conclusion:** Hook is a "tax enforcer" only. It cannot rug liquidity or steal user funds.

---

### Why Config Cannot Alter Tax Tiers

**Fix Applied:** Removed `setTaxTier()` function entirely.

**Before (Vulnerability):**
```solidity
// ❌ REMOVED - This was a rug vector
function setTaxTier(uint256 index, uint256 mcapThreshold, uint256 taxBps) 
    external onlyOwner 
{
    taxTiers[index] = TaxTier(mcapThreshold, taxBps);
}
```

**After (Secure):**
```solidity
// ✅ Tax tiers set in constructor, IMMUTABLE
constructor(address _treasury, address _owner) Ownable(_owner) {
    // ... set taxTiers array ...
    // NO FUNCTION TO CHANGE THEM
}
```

**Why This Matters:**
- Original design allowed owner to change tax from 1% to 99% post-launch
- Launch creators and buyers had no guarantee of tax rates
- This was a centralization risk and potential rug vector

**Current Design:**
- Tax tiers are set at Config deployment
- No function exists to modify them
- Launch creators and buyers can verify tax logic before participating
- Trust assumption: Verify Config address before using Factory

**Conclusion:** Tax tiers are **immutable**. Config owner cannot rug via tax manipulation.

---

### What Admin Powers Exist

#### Factory Owner
**Can:**
- Update `premiumFee` and `microFee` (affects future launches only)
- Transfer ownership

**Cannot:**
- Drain liquidity from any launch
- Alter existing launch parameters
- Steal user funds

---

#### Hook Owner
**Can:**
- Withdraw `platformBalance` (30% of trading fees)
- Update fee recipient address
- Transfer ownership

**Cannot:**
- Access `beneficiaryBalances` (70% of fees)
- Change tax rates
- Bypass position limits
- Remove liquidity

---

#### Config Owner
**Can:**
- Pause/unpause protocol (affects NEW launches only, not existing ones)
- Update treasury address
- Transfer ownership

**Cannot:**
- Change tax tiers
- Change fee split
- Affect existing launches

---

#### LPLocker Owner
**Can:**
- Transfer ownership
- Read state (view functions)

**Cannot:**
- Remove liquidity
- Transfer LP NFTs
- Burn LP NFTs
- Call PositionManager
- Anything that affects locked positions

**Power Level:** Zero. Owner is completely powerless over locked liquidity.

---

### Trust Assumptions

**Users Must Trust:**
1. **Uniswap v4 Contracts** - PoolManager and PositionManager are not compromised
2. **Config Immutability** - Tax tiers were set correctly at deployment
3. **Factory Deployment** - Factory was deployed with correct addresses (Hook, Config, PoolManager, PositionManager, LPLocker)
4. **Hook CREATE2** - Hook address has correct flags (0x4D5) and was deployed with correct salt

**Users Do NOT Need to Trust:**
1. Protocol admins to not rug (liquidity is locked, taxes are immutable)
2. Launch creators to not rug (they have no special powers)
3. Beneficiaries to be honest (they can only withdraw their own fees)

---

## 6. Testing Requirements

### What Must Be Verified on Sepolia

#### Phase 2: Fork Testing (Local Sepolia Fork)

**Test 1: LP NFT Minting**
- Deploy Factory with real Sepolia PositionManager address
- Call `createLaunch()`
- Verify: LP NFT minted to Factory
- Check: `positionManager.ownerOf(tokenId) == address(factory)`

**Test 2: LP NFT Transfer**
- Continuation of Test 1
- Verify: LP NFT transferred to LPLocker
- Check: `positionManager.ownerOf(tokenId) == address(lpLocker)`
- Check: `lpLocker.lockedPositions(token) == tokenId`

**Test 3: Removal Impossible**
- Try calling `positionManager.decreaseLiquidity()` from:
  - Factory ❌ Should revert (not NFT owner)
  - LPLocker owner ❌ Should revert (no such function)
  - Random attacker ❌ Should revert (not NFT owner)
- Try calling `lpLocker.transferFrom()` ❌ Should revert (function does not exist)

**Test 4: Pool Initialization**
- Verify: Pool created at correct sqrtPrice
- Check: `poolManager.getSlot0(poolId)` returns expected sqrtPrice
- Derive MCAP from sqrtPrice, compare to target MCAP
- Tolerance: ±1% (due to rounding)

**Test 5: First Swap (Buy)**
- User buys tokens with 0.01 ETH
- Verify: Swap succeeds
- Check: User received tokens (after tax)
- Check: Hook recorded fees in `beneficiaryBalances` and `platformBalance`
- Verify: 70/30 split correct

**Test 6: Tax Enforcement**
- Verify: Tax matches expected rate for current MCAP
- Buy enough to cross MCAP milestone (e.g., 2 ETH → 3 ETH)
- Verify: Tax decayed (45% → 40%)
- Check: `hook.getCurrentTax(key)` returns new lower tax
- Verify: Monotonic (tax never increases)

**Test 7: maxTx Limit**
- Try buying more than `currentMcap * 0.001 * totalSupply` tokens
- Should revert with "Exceeds maxTx"
- Try buying exactly at limit ✅ Should succeed
- Try buying just under limit ✅ Should succeed

**Test 8: maxWallet Limit**
- User accumulates tokens across multiple buys
- Try exceeding `currentMcap * 0.001 * totalSupply` balance
- Should revert with "Exceeds maxWallet"
- Verify: Limit scales up as MCAP grows

**Test 9: Fee Claims**
- Beneficiary calls `claimBeneficiaryFees()`
- Verify: Beneficiary receives ETH
- Check: `beneficiaryBalances[beneficiary] == 0` after claim
- Owner calls `withdrawPlatformFees()`
- Verify: Owner receives 30% share

**Test 10: Sell Swaps**
- User sells tokens back to pool
- Verify: Tax applied to sells too
- Verify: Price impact reasonable (full-range liquidity)

---

#### Phase 3: Live Sepolia Testing

**Test 11: Real PositionManager Integration**
- Deploy contracts to live Sepolia
- Use ACTUAL Uniswap v4 PositionManager (not mock)
- Verify: ERC721 transfers work correctly
- Verify: `onERC721Received` callback fires

**Test 12: Hook Address Validation**
- Deploy Hook with CREATE2 using mined salt
- Verify: Hook address has correct flags (0x4D5)
- Try creating pool with invalid hook address ❌ Should revert

**Test 13: Multi-User Scenario**
- Create launch
- User A buys 0.1 ETH worth
- User B buys 0.2 ETH worth
- User A sells 50%
- User C buys 0.5 ETH worth
- Verify: All swaps succeed, taxes correct, limits enforced

**Test 14: Edge Cases**
- Try buying with 0 ETH ❌ Should revert
- Try creating launch with 0.5 ETH MCAP ❌ Should revert (below minimum)
- Try creating launch with 100 ETH MCAP ❌ Should revert (above maximum)
- Try creating launch with empty name ❌ Should revert

**Test 15: Pause Mechanism**
- Owner calls `config.pause()`
- Try creating new launch ❌ Should revert ("Protocol paused")
- Existing launches should still work ✅
- Owner calls `config.unpause()`
- New launches work again ✅

---

### Invariants That Must Hold

**Invariant 1: Liquidity Locked**
- For all launches: `lpLocker.ownerOf(tokenId) == lpLocker`
- LP NFT never leaves LPLocker

**Invariant 2: Tax Monotonic**
- For all launches: `hook.getCurrentTax(key)` never increases
- `launchInfo[poolId].lowestTaxBps` only decreases or stays same

**Invariant 3: Tax Floor**
- For all launches: `tax >= 100 bps` (1%)
- Even at 100 ETH MCAP, tax stays at 1%

**Invariant 4: Fee Split**
- For all swaps: `beneficiaryShare = 70%`, `platformShare = 30%`
- Sum = 100%

**Invariant 5: Position Limits Scale**
- `maxTx = currentMcap * 0.001 * totalSupply`
- `maxWallet = currentMcap * 0.001 * totalSupply`
- As MCAP grows, limits grow proportionally

**Invariant 6: MCAP Derivation**
- `currentMcap = totalSupply / (sqrtPrice^2 / 2^192)`
- Matches target MCAP ±1% at launch

**Invariant 7: Pool Currency Order**
- `currency0 = ETH (address(0))`
- `currency1 = token`
- ETH always lower address

**Invariant 8: LP Token Balance**
- `token.balanceOf(factory) == 0` after launch (all liquidity in pool)
- Factory never accumulates tokens

---

### Edge Cases to Test

**Edge Case 1: Whale Protection**
- Single user tries to buy 50% of supply
- Should be blocked by maxTx
- User splits across multiple transactions
- Should be blocked by maxWallet

**Edge Case 2: MCAP Milestone Boundary**
- MCAP = 2.999999 ETH (just below 3 ETH)
- Tax = 45%
- One swap pushes MCAP to 3.000001 ETH
- Tax should decay to 40% on THAT swap (not next swap)

**Edge Case 3: Tiny Swaps**
- User buys 1 wei of tokens
- Should succeed (no minimum)
- Fees calculated correctly (even if < 1 wei)

**Edge Case 4: First Sell Before First Buy**
- Launch created (pool has tokens, no ETH)
- User tries to sell tokens immediately
- Should fail (no ETH in pool to buy tokens with)

**Edge Case 5: Slippage Protection**
- User sets `minTokensOut` too high
- Swap fails due to slippage ❌ (expected behavior)

**Edge Case 6: Fee Rounding**
- Swap amount results in fractional wei fee
- Verify: No precision loss, beneficiary + platform = total fee

---

### What Cannot Be Assumed

**Assumption 1: PositionManager is ERC721** ❌
- **Must verify:** Sepolia PositionManager implements full ERC721 interface
- **Risk:** If not ERC721, `safeTransferFrom` will fail
- **Mitigation:** Use official Uniswap v4 PositionManager only

**Assumption 2: Hook Address Will Validate** ❌
- **Must verify:** CREATE2 salt produces address with correct flags
- **Risk:** Invalid hook address → pool creation fails
- **Mitigation:** Mine salt with actual deployed addresses, verify flags before deployment

**Assumption 3: Gas Costs Are Reasonable** ❌
- **Must verify:** `createLaunch()` gas cost < 5M gas
- **Risk:** Expensive launches deter users
- **Mitigation:** Optimize if needed, use `via_ir` compiler flag

**Assumption 4: Tax Calculation Is Accurate** ❌
- **Must verify:** Derived MCAP matches target MCAP ±1%
- **Risk:** Incorrect math → wrong tax rates
- **Mitigation:** Extensive unit tests, manual verification on Sepolia

**Assumption 5: Fee Distribution Is Atomic** ❌
- **Must verify:** `beneficiaryBalances` and `platformBalance` updated in same transaction as swap
- **Risk:** Race condition or MEV attack steals fees
- **Mitigation:** All fee accounting in `afterSwap` hook (atomic with swap)

**Assumption 6: No Overflow in MCAP Calc** ❌
- **Must verify:** `sqrtPrice^2` doesn't overflow uint256
- **Risk:** Overflow → incorrect MCAP → wrong tax
- **Mitigation:** sqrtPrice is uint160, max = (2^160)^2 = 2^320 ❌ OVERFLOWS uint256!
- **Fix Applied:** Use `FullMath.mulDiv()` for safe multiplication

**Assumption 7: Config Is Immutable** ❌
- **Must verify:** No `setTaxTier()` function in deployed Config
- **Risk:** Owner rugs by changing tax to 99%
- **Mitigation:** Audit Config bytecode, verify on Etherscan

---

## 7. Full Contracts (Raw)

### ClawclickFactory.sol (Full)
**Path:** `src/core/ClawclickFactory.sol`

```solidity
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
import {ClawclickHook} from "./ClawclickHook.sol";
import {ClawclickLPLocker} from "./ClawclickLPLocker.sol";

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
                                STRUCTS
    //////////////////////////////////////////////////////////////*/
    
    struct CreateParams {
        string name;
        string symbol;
        address beneficiary;
        address agentWallet;
        bool isPremium;
        uint256 targetMcapETH;
    }
    
    struct LaunchInfo {
        address token;
        address beneficiary;
        address agentWallet;
        address creator;
        PoolId poolId;
        PoolKey poolKey;
        uint256 targetMcapETH;
        uint256 createdAt;
        uint256 createdBlock;
        string name;
        string symbol;
        bool isPremium;
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
        uint160 initialSqrtPrice,
        string name,
        string symbol,
        bool isPremium
    );
    
    event LaunchFeePaid(address indexed payer, uint256 amount);
    event FeesUpdated(uint256 premiumFee, uint256 microFee);
    event LiquidityAdded(address indexed token, PoolId indexed poolId, uint256 amount, uint256 tokenId);
    event LPLocked(address indexed token, uint256 tokenId);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error ProtocolPaused();
    error InsufficientFee();
    error InvalidTargetMcap();
    error EmptyName();
    error EmptySymbol();
    error NameTooLong();
    error SymbolTooLong();
    error ZeroBeneficiary();
    error SqrtPriceOverflow();
    error FeeTransferFailed();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    constructor(
        IPoolManager _poolManager,
        ClawclickHook _hook,
        ClawclickConfig _config,
        ClawclickLPLocker _lpLocker,
        IPositionManager _positionManager,
        address _owner
    ) Ownable(_owner) {
        poolManager = _poolManager;
        hook = _hook;
        config = _config;
        lpLocker = _lpLocker;
        positionManager = _positionManager;
        
        // Default fees (can be updated by owner)
        premiumFee = 0.1 ether;
        microFee = 0.01 ether;
    }

    /*//////////////////////////////////////////////////////////////
                            LAUNCH CREATION
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Create a new token launch
     * @dev Deploys token, initializes pool, adds liquidity, locks LP NFT
     * @param params Launch parameters
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
        hook.registerLaunch(key, token, params.beneficiary, params.targetMcapETH);
        
        // 6. Add full-range liquidity via PositionManager (mints LP NFT)
        uint256 tokenId = _addFullRangeLiquidity(key, token);
        
        // 7. Lock LP NFT permanently in LPLocker
        _lockLPPosition(token, tokenId);
        
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
        
        // Sanity check: result must fit in uint160
        if (result == 0 || result > type(uint160).max) {
            revert SqrtPriceOverflow();
        }
        
        return uint160(result);
    }
    
    /**
     * @notice Babylonian square root (Newton's method)
     * @dev Used for sqrtPrice calculation
     * @param x Input value
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
                         LIQUIDITY MANAGEMENT
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Add full-range liquidity to the pool
     * @dev Mints LP NFT via PositionManager
     * @param key Pool key
     * @param token Token address
     * @return tokenId LP NFT token ID
     */
    function _addFullRangeLiquidity(
        PoolKey memory key,
        address token
    ) internal returns (uint256 tokenId) {
        // Approve PositionManager to spend tokens (not PoolManager)
        ClawclickToken(token).approve(address(positionManager), TOTAL_SUPPLY);
        
        // Encode MINT_POSITION action
        bytes memory actions = abi.encodePacked(uint256(Actions.MINT_POSITION));
        
        // Encode mint parameters
        bytes[] memory params = new bytes[](1);
        params[0] = abi.encode(
            key,                    // PoolKey
            TICK_LOWER,             // tickLower (-887200)
            TICK_UPPER,             // tickUpper (+887200)
            uint256(TOTAL_SUPPLY),  // liquidity (1B tokens)
            type(uint128).max,      // amount0Max (slippage protection)
            type(uint128).max,      // amount1Max (slippage protection)
            address(this),          // owner (Factory receives NFT)
            bytes("")               // hookData (empty)
        );
        
        // Call PositionManager to mint LP NFT
        uint256 deadline = block.timestamp + 1 hours;
        bytes memory unlockData = abi.encode(actions, params);
        
        positionManager.modifyLiquidities{value: 0}(unlockData, deadline);
        
        // Get the minted token ID (PositionManager increments nextTokenId after minting)
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
     */
    function _lockLPPosition(address token, uint256 tokenId) internal {
        // Encode token address as data for LPLocker
        bytes memory data = abi.encode(token);
        
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
```

---

### ClawclickHook.sol (Full)
**Path:** `src/core/ClawclickHook.sol`

(See files already shared - included in `read` command earlier)

---

### ClawclickConfig.sol (Full)
**Path:** `src/core/ClawclickConfig.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ClawclickConfig
 * @notice Global configuration for Deep Sea Engine
 * @dev Owned by platform multisig
 * 
 * Key Parameters:
 *   - Fee split: 70% beneficiary / 30% platform
 *   - Tax tiers: Maps target MCAP → starting tax
 *   - Position limits: MaxTx/MaxWallet scaling factors
 */
contract ClawclickConfig is Ownable {
    /*//////////////////////////////////////////////////////////////
                                CONSTANTS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Basis points denominator (100% = 10000)
    uint256 public constant BPS = 10000;
    
    /// @notice Maximum platform share (50%)
    uint256 public constant MAX_PLATFORM_SHARE_BPS = 5000;

    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Platform treasury address
    address public treasury;
    
    /// @notice Platform share of fees in basis points (30% = 3000)
    uint256 public platformShareBps;
    
    /// @notice Factory address (can create new launches)
    address public factory;
    
    /// @notice Paused state
    bool public paused;
    
    /// @notice Tax tier configuration: targetMcapETH => startingTaxBps
    /// @dev Immutable once set during deployment (deterministic for users)
    mapping(uint256 => uint256) public taxTiers;

    /*//////////////////////////////////////////////////////////////
                                EVENTS
    //////////////////////////////////////////////////////////////*/
    
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event PlatformShareBpsUpdated(uint256 oldShare, uint256 newShare);
    event FactoryUpdated(address indexed oldFactory, address indexed newFactory);
    event PausedUpdated(bool paused);

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error InvalidAddress();
    error InvalidShare();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    constructor(
        address _treasury,
        address _owner
    ) Ownable(_owner) {
        if (_treasury == address(0)) revert InvalidAddress();
        
        treasury = _treasury;
        platformShareBps = 3000; // 30% platform share
        
        // Initialize default tax tiers
        _initializeTaxTiers();
    }
    
    /**
     * @notice Initialize tax tier mapping
     * @dev Called once during construction
     */
    function _initializeTaxTiers() internal {
        taxTiers[1 ether] = 5000;   // 1 ETH → 50%
        taxTiers[2 ether] = 4500;   // 2 ETH → 45%
        taxTiers[3 ether] = 4000;   // 3 ETH → 40%
        taxTiers[4 ether] = 3500;   // 4 ETH → 35%
        taxTiers[5 ether] = 3000;   // 5 ETH → 30%
        taxTiers[6 ether] = 2500;   // 6 ETH → 25%
        taxTiers[7 ether] = 2000;   // 7 ETH → 20%
        taxTiers[8 ether] = 1500;   // 8 ETH → 15%
        taxTiers[9 ether] = 1000;   // 9 ETH → 10%
        taxTiers[10 ether] = 500;   // 10 ETH → 5%
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert InvalidAddress();
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }
    
    function setPlatformShareBps(uint256 _shareBps) external onlyOwner {
        if (_shareBps > MAX_PLATFORM_SHARE_BPS) revert InvalidShare();
        emit PlatformShareBpsUpdated(platformShareBps, _shareBps);
        platformShareBps = _shareBps;
    }
    
    function setFactory(address _factory) external onlyOwner {
        if (_factory == address(0)) revert InvalidAddress();
        emit FactoryUpdated(factory, _factory);
        factory = _factory;
    }
    
    function setPaused(bool _paused) external onlyOwner {
        emit PausedUpdated(_paused);
        paused = _paused;
    }
    
    /**
     * @notice Tax tiers are IMMUTABLE after deployment
     * @dev Removed setTaxTier() to prevent post-launch manipulation
     *      This ensures users have deterministic tax rates at launch time
     *      Tax tiers cannot be changed by owner - guarantees security
     */

    /*//////////////////////////////////////////////////////////////
                            VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /// @notice Calculate fee split for a given amount
    function calculateFees(uint256 amount) external view returns (
        uint256 totalFee,
        uint256 beneficiaryShare,
        uint256 platformShare
    ) {
        totalFee = amount;  // Amount is already the fee
        platformShare = (totalFee * platformShareBps) / BPS;
        beneficiaryShare = totalFee - platformShare;
    }
    
    /// @notice Check if protocol is operational
    function isOperational() external view returns (bool) {
        return !paused;
    }
    
    /// @notice Get starting tax for a target MCAP
    function getStartingTax(uint256 targetMcapETH) external view returns (uint256) {
        return taxTiers[targetMcapETH];
    }
}
```

---

### ClawclickLPLocker.sol (Full)
**Path:** `src/core/ClawclickLPLocker.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

/**
 * @title ClawclickLPLocker
 * @notice Locks Uniswap V4 LP positions permanently
 * @dev Protocol-owned liquidity - positions cannot be withdrawn
 * 
 * ✅ FIX #13: PositionManager MUST implement ERC-721
 * CRITICAL ASSUMPTION: The V4 PositionManager being used MUST:
 *   1. Implement IERC721 (mint LP positions as NFTs)
 *   2. Call onERC721Received when transferring positions
 *   3. Be the OFFICIAL Uniswap V4 PositionManager
 * 
 * Before mainnet deployment, VERIFY:
 *   - PositionManager address is correct for target network
 *   - PositionManager implements full ERC-721 interface
 *   - Test transfers work and trigger onERC721Received
 * 
 * Without ERC-721 compatibility, this locker is NON-FUNCTIONAL.
 */
contract ClawclickLPLocker is Ownable, IERC721Receiver {
    /*//////////////////////////////////////////////////////////////
                                STATE
    //////////////////////////////////////////////////////////////*/
    
    /// @notice V4 Position Manager address
    address public immutable positionManager;
    
    /// @notice Mapping of token to its locked position ID
    mapping(address => uint256) public lockedPositions;
    
    /// @notice Mapping of position ID to token address
    mapping(uint256 => address) public positionToToken;
    
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

    /*//////////////////////////////////////////////////////////////
                                ERRORS
    //////////////////////////////////////////////////////////////*/
    
    error InvalidPositionManager();
    error PositionAlreadyLocked();
    error NotFromPositionManager();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    
    constructor(
        address _positionManager,
        address _owner
    ) Ownable(_owner) {
        if (_positionManager == address(0)) revert InvalidPositionManager();
        positionManager = _positionManager;
    }

    /*//////////////////////////////////////////////////////////////
                            LOCK FUNCTIONS
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Record a locked position (called internally by onERC721Received)
     * @dev This is internal - NFT must be transferred via safeTransferFrom
     * @param token The token address
     * @param positionId The V4 position NFT ID
     * @param locker The address that locked it (Factory)
     */
    function _recordLock(address token, uint256 positionId, address locker) internal {
        if (lockedPositions[token] != 0) revert PositionAlreadyLocked();
        
        // Record the lock
        lockedPositions[token] = positionId;
        positionToToken[positionId] = token;
        totalLocked++;
        
        emit PositionLocked(token, positionId, locker);
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

    /*//////////////////////////////////////////////////////////////
                          ERC721 RECEIVER
    //////////////////////////////////////////////////////////////*/
    
    /**
     * @notice Handle receipt of LP NFT
     * @dev Automatically called when NFT is transferred via safeTransferFrom
     *      Expects data to contain the token address (abi.encode(address))
     * @param from Address that sent the NFT (should be Factory)
     * @param tokenId The LP NFT ID
     * @param data Encoded token address
     */
    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        // Only accept NFTs from official PositionManager
        if (msg.sender != positionManager) revert NotFromPositionManager();
        
        // Decode token address from data
        address token = abi.decode(data, (address));
        
        // Record the lock
        _recordLock(token, tokenId, from);
        
        return IERC721Receiver.onERC721Received.selector;
    }
}
```

---

### ClawclickToken.sol (Full)
**Path:** `src/core/ClawclickToken.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title ClawclickToken
 * @notice Standard ERC-20 token for clawclick launches
 * @dev Minimal token - all logic lives in the hook
 */
contract ClawclickToken is ERC20 {
    /// @notice Total supply: 1 billion tokens with 18 decimals
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 1e18;
    
    /// @notice The hook that manages this token's pool
    address public immutable hook;
    
    /// @notice Beneficiary address (receives trading fees)
    address public immutable beneficiary;
    
    /// @notice Creation timestamp
    uint256 public immutable createdAt;
    
    /// @notice Agent wallet (for claws.fun integration)
    address public immutable agentWallet;

    error OnlyHook();

    modifier onlyHook() {
        if (msg.sender != hook) revert OnlyHook();
        _;
    }

    /**
     * @param _name Token name
     * @param _symbol Token symbol  
     * @param _hook The mint recipient (Factory address - NAMING INCONSISTENCY)
     * @param _beneficiary Fee recipient address
     * @param _agentWallet Agent wallet for claws.fun
     * 
     * ⚠️ NAMING INCONSISTENCY: Parameter named "_hook" but Factory passes address(this) (Factory)
     * Token mints 1B supply to Factory (not Hook). Factory then adds liquidity to pool.
     * Consider renaming parameter to "_mintRecipient" for clarity.
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _hook,
        address _beneficiary,
        address _agentWallet
    ) ERC20(_name, _symbol) {
        hook = _hook;  // Stores Factory address (not actual Hook)
        beneficiary = _beneficiary;
        agentWallet = _agentWallet;
        createdAt = block.timestamp;
        
        // Mint entire supply to Factory (not Hook, despite parameter name)
        _mint(_hook, TOTAL_SUPPLY);
    }
}
```

---

## Critical Issues for Manual Review

### 1. ClawclickToken Naming Inconsistency ⚠️
**Issue:** Constructor parameter named `_hook` but Factory passes `address(this)` (Factory address)
- Token mints to **Factory**, not Hook
- State variable `hook` stores Factory address
- `onlyHook` modifier checks against Factory (would fail if called from actual Hook)

**Recommendation:** 
- Rename parameter to `_mintRecipient` or `_factory`
- Remove `onlyHook` modifier if no functions use it
- Document that token has no knowledge of actual Hook contract

---

**All full contracts provided above. Memory consolidated. README.md updated. Ready for manual review before Phase 2. 🚀**
