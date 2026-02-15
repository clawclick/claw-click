# 🔒 CLAWCLICK PRODUCTION CONTRACTS

**Version:** 1.0.0  
**Status:** Production Ready  
**Network:** Ethereum Mainnet (Sepolia testnet first)

---

## 📂 CONTRACT STRUCTURE

```
src/
├── core/               # Core protocol contracts (REQUIRED)
├── interfaces/         # Public interfaces (REQUIRED)
├── periphery/          # Optional helper contracts
└── utils/              # Deployment utilities
```

---

## 🎯 CORE CONTRACTS (Required for Mainnet)

### 1. **ClawclickConfig.sol**
- **Purpose:** Global protocol configuration
- **Deploy Order:** 1st
- **Constructor:**
  ```solidity
  constructor(address _treasury, uint256 _platformShareBps)
  ```
- **Post-Deploy Actions:**
  - Set tax tiers for each MCAP target (1-10 ETH)
  - Set factory address (after factory deployment)
- **Key Functions:**
  - `setTaxTier(uint256 targetMcapETH, uint256 startingTaxBps)` - Admin
  - `setFactory(address _factory)` - Admin
  - `setTreasury(address _treasury)` - Admin
  - `setPlatformShareBps(uint256 _platformShareBps)` - Admin
- **Immutable After Setup:** Tax tiers (deterministic for users)

---

### 2. **ClawclickHook_V4.sol**
- **Purpose:** Uniswap V4 hook implementing progressive tax, limits, graduation
- **Deploy Order:** 2nd (after Config, before LPLocker)
- **Special Requirements:** 
  - **MUST use CREATE2 deployment**
  - Hook address must have valid permission flags
  - Use HookMiner.sol to find valid salt
- **Constructor:**
  ```solidity
  constructor(
      IPoolManager _poolManager,
      ClawclickConfig _config
  )
  ```
- **Post-Deploy:** Call `setLPLocker()` after LPLocker deployment (one-time only)
- **Hook Permissions Required:**
  - `beforeSwap` ✅
  - `afterSwap` ✅
  - `beforeAddLiquidity` ✅
  - `afterAddLiquidity` ✅
- **Key Mechanics:**
  - Progressive tax based on MCAP growth (50% → 1%)
  - Transaction limits that scale with MCAP
  - 70/30 fee distribution
  - Graduation at 4x MCAP (sustained 1 hour)
  - Zero pool fee (all fees via hook delta)

---

### 3. **ClawclickLPLocker.sol**
- **Purpose:** Locks LP NFTs, enables post-graduation rebalancing
- **Deploy Order:** 3rd (after Hook)
- **Constructor:**
  ```solidity
  constructor(
      IPositionManager _positionManager,
      IClawclickHook _hook
  )
  ```
- **Note:** Takes Hook address from previous deployment step
- **Key Features:**
  - Permanently locks LP positions (no withdrawal to EOA)
  - Enables rebalance proposals after graduation
  - 24-hour timelock on rebalance execution
  - Protocol-owned liquidity forever
- **Protected Operations:**
  - `proposeRebalance()` - Requires graduation
  - `executeRebalance()` - Requires timelock expiry
  - `cancelRebalance()` - Owner only

---

### 4. **ClawclickFactory.sol**
- **Purpose:** Token launch factory (creates tokens + pools)
- **Deploy Order:** 4th (last)
- **Constructor:**
  ```solidity
  constructor(
      ClawclickConfig _config,
      IPoolManager _poolManager,
      IPositionManager _positionManager,
      ClawclickHook _hook,
      ClawclickLPLocker _lpLocker
  )
  ```
- **Main Function:**
  ```solidity
  function createLaunch(
      string memory name,
      string memory symbol,
      uint256 targetMcapETH,    // 1-10 ETH
      address beneficiary,
      address agentWallet
  ) external payable returns (address token, PoolId poolId)
  ```
- **Launch Flow:**
  1. Deploy ClawclickToken (1B supply)
  2. Calculate deterministic sqrtPrice from target MCAP
  3. Initialize Uniswap V4 pool with hook
  4. Add full-range liquidity (100% token, 0 ETH)
  5. Lock LP NFT in ClawclickLPLocker
  6. Register launch with hook
- **Fee Structure:**
  - Premium launches: Higher fee
  - Micro launches: Lower fee
  - Configurable by owner

---

### 5. **ClawclickToken.sol**
- **Purpose:** Standard ERC-20 token (deployed per launch)
- **Deploy Order:** N/A (deployed by Factory)
- **Constructor:**
  ```solidity
  constructor(
      string memory _name,
      string memory _symbol,
      address _hook,
      address _beneficiary,
      address _agentWallet
  )
  ```
- **Properties:**
  - Total supply: 1,000,000,000 tokens (1B)
  - Decimals: 18
  - Minted to factory on creation
  - Immutable references (hook, beneficiary, agentWallet)
- **Note:** Minimal token - all logic in hook

---

## 🔌 INTERFACES (Public APIs)

### **IClawclickFactory.sol**
- Public interface for Factory contract
- Used by frontends and integrators
- Key structs: `LaunchInfo`, `CreateParams`

### **IClawclickHook.sol**
- Public interface for Hook contract
- Used for querying tax rates, limits, stats
- Key structs: `TokenLaunch`

---

## 🛠️ PERIPHERY (Optional)

### **ClawclickRouter.sol**
- **Purpose:** User-friendly swap router
- **Deploy:** Optional (can use Uniswap's native router)
- **Benefits:**
  - Simplified swap interface
  - Built-in slippage protection
  - ETH wrapping/unwrapping
  - Gas optimized
- **Functions:**
  - `buyExactIn()` - Buy tokens with exact ETH
  - `sellExactIn()` - Sell exact tokens for ETH
  - `buyExactOut()` - Buy exact tokens (variable ETH)
  - `sellExactOut()` - Sell tokens for exact ETH

---

## 🧰 UTILS (Deployment Tools)

### **BaseHook.sol**
- Base contract for Uniswap V4 hooks
- Provides empty implementations of all hook functions
- Required by ClawclickHook_V4.sol

### **HookMiner.sol**
- OFF-CHAIN utility for finding valid CREATE2 salts
- **⚠️ DO NOT CALL FROM CONTRACTS** (unbounded loop)
- Use in Foundry scripts to pre-compute deployment salt
- **Usage:**
  ```solidity
  (address hookAddress, bytes32 salt) = HookMiner.find(
      deployer,
      requiredFlags,
      creationCode,
      constructorArgs
  );
  ```

---

## 📚 EXTERNAL DEPENDENCIES (lib/)

### **forge-std** (Foundry testing framework)
- **Version:** Latest
- **Purpose:** Testing only (NOT deployed)
- **Used in:** All test files

### **openzeppelin-contracts**
- **Version:** v5.0.0
- **Purpose:** Security utilities
- **Used Contracts:**
  - `Ownable.sol` - Access control
  - `ReentrancyGuard.sol` - Reentrancy protection
  - `ERC20.sol` - Token standard
  - `IERC721.sol` - NFT interface (LP positions)
- **Note:** These are compiled INTO your contracts, not deployed separately

### **v4-core** (Uniswap V4 core)
- **Version:** Latest v4
- **Purpose:** Pool management, types, libraries
- **Used Contracts:**
  - `IPoolManager.sol` - Pool manager interface
  - `PoolKey.sol` - Pool key struct
  - `BalanceDelta.sol` - Delta types
  - `FullMath.sol` - Overflow-safe math
  - `TickMath.sol` - Tick calculations
- **Note:** Already deployed on mainnet (reference by address)

### **v4-periphery** (Uniswap V4 periphery)
- **Version:** Latest v4
- **Purpose:** Position management
- **Used Contracts:**
  - `IPositionManager.sol` - LP position manager
  - `Actions.sol` - Action encoding
- **Note:** Already deployed on mainnet (reference by address)

---

## 🔗 DEPENDENCY GRAPH

```
ClawclickFactory
├── ClawclickConfig
├── ClawclickHook_V4
│   ├── ClawclickConfig
│   ├── ClawclickLPLocker
│   ├── BaseHook
│   └── v4-core (PoolManager)
├── ClawclickLPLocker
│   ├── v4-periphery (PositionManager)
│   └── ClawclickHook_V4 (interface)
└── ClawclickToken (deployed per launch)
```

---

## 🎯 MAINNET DEPLOYMENT REQUIREMENTS

### Uniswap V4 Addresses (Mainnet)
- **PoolManager:** `TBD` (get from Uniswap docs)
- **PositionManager:** `TBD` (get from Uniswap docs)

### Configuration
- **Treasury Address:** Platform multisig
- **Platform Share:** 3000 (30%)
- **Tax Tiers:**
  - 1 ETH → 5000 bps (50%)
  - 2 ETH → 4000 bps (40%)
  - 5 ETH → 2000 bps (20%)
  - 10 ETH → 500 bps (5%)

### Gas Estimates (Mainnet)
- Config deployment: ~500k gas
- Hook deployment: ~3M gas
- LPLocker deployment: ~800k gas
- Factory deployment: ~2.5M gas
- Token launch (via Factory): ~2M gas per launch

---

## 🚀 DEPLOYMENT SEQUENCE ⚠️ CORRECTED

**Note:** Hook constructor takes (PoolManager, Config) ONLY. LPLocker is set post-deployment via `setLPLocker()`.

1. Deploy `ClawclickConfig` with treasury + owner
2. **Tax tiers are set automatically in constructor** (immutable, cannot change)
3. Mine valid CREATE2 salt using `HookMiner.sol` (off-chain)
4. Deploy `ClawclickHook_V4` with salt, PoolManager, Config
5. Deploy `ClawclickLPLocker` with PositionManager + Hook address (from step 4)
6. Wire Hook → LPLocker: Call `Hook.setLPLocker(LPLockerAddress)` (one-time only)
7. Deploy `ClawclickFactory` with all addresses (Config, PoolManager, PositionManager, Hook, LPLocker)
8. Set Factory address on Config: Call `Config.setFactory(FactoryAddress)`
9. Verify all contracts on Etherscan
10. Test with 1 launch on Sepolia
11. Deploy to Mainnet

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### Code Verification
- [ ] All tests passing (`forge test`)
- [ ] No compiler warnings (`forge build`)
- [ ] Gas profiling reviewed
- [ ] Coverage >95%

### Configuration
- [ ] Treasury address confirmed
- [ ] Platform share confirmed (30%)
- [ ] Tax tiers finalized
- [ ] Uniswap V4 addresses confirmed (Sepolia/Mainnet)

### Security
- [ ] Reentrancy guards verified
- [ ] Access control reviewed
- [ ] Integer overflow protection confirmed
- [ ] External call safety validated

### Deployment
- [ ] Deployment wallet funded (gas)
- [ ] RPC endpoints tested
- [ ] Etherscan API key ready (verification)
- [ ] CREATE2 salt pre-computed for hook

---

## 📞 SUPPORT

- **GitHub:** https://github.com/openclaw/clawclick
- **Docs:** https://docs.claw.click
- **Discord:** https://discord.gg/openclaw

---

_Production ready as of February 15, 2026_  
_No additional contracts needed for mainnet deployment_
