# 📚 EXTERNAL DEPENDENCIES REFERENCE

**Project:** ClawClick Deep Sea Engine  
**Date:** February 2026

---

## 📦 lib/ Folder Contents

This folder contains external dependencies installed via Foundry. These are NOT deployed separately - they're either compiled into your contracts or referenced as already-deployed mainnet addresses.

---

## 1. forge-std

**Repository:** https://github.com/foundry-rs/forge-std  
**Purpose:** Foundry testing framework  
**Usage:** Testing ONLY  
**Deployment:** ❌ Not deployed (testing infrastructure)

### Used In:
- All test files (`*.t.sol`)
- Test utilities and helpers
- Foundry scripts

### Key Imports:
```solidity
import "forge-std/Test.sol";
import "forge-std/console.sol";
import "forge-std/Vm.sol";
```

---

## 2. openzeppelin-contracts

**Repository:** https://github.com/OpenZeppelin/openzeppelin-contracts  
**Version:** v5.0.0  
**Purpose:** Industry-standard security utilities  
**Usage:** Compiled INTO your contracts  
**Deployment:** ✅ Compiled in (not deployed separately)

### Used Contracts:

#### `Ownable.sol`
- **Used By:** ClawclickConfig, ClawclickLPLocker
- **Purpose:** Access control (admin functions)
- **Functions:** `onlyOwner` modifier, `owner()`, `transferOwnership()`

#### `ReentrancyGuard.sol`
- **Used By:** ClawclickFactory, ClawclickLPLocker, ClawclickHook_V4
- **Purpose:** Prevent reentrancy attacks
- **Functions:** `nonReentrant` modifier

#### `ERC20.sol`
- **Used By:** ClawclickToken
- **Purpose:** Standard ERC-20 token implementation
- **Functions:** `transfer()`, `approve()`, `balanceOf()`, etc.

#### `IERC721.sol`
- **Used By:** ClawclickLPLocker, ClawclickFactory
- **Purpose:** NFT interface (Uniswap V4 LP positions are ERC-721)
- **Functions:** `ownerOf()`, `transferFrom()`, `safeTransferFrom()`

#### `IERC20.sol`
- **Used By:** ClawclickRouter, ClawclickHook_V4
- **Purpose:** ERC-20 interface for token interactions
- **Functions:** `balanceOf()`, `transfer()`, `approve()`

### Key Imports:
```solidity
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
```

---

## 3. v4-core

**Repository:** https://github.com/Uniswap/v4-core  
**Version:** Latest Uniswap V4  
**Purpose:** Uniswap V4 core protocol  
**Usage:** Referenced (already deployed on mainnet)  
**Deployment:** ❌ Already on mainnet (use deployed address)

### Critical: Mainnet Addresses Needed
- **PoolManager:** `TBD` (get from Uniswap docs)
- Network: Ethereum Mainnet / Sepolia

### Used Contracts:

#### `IPoolManager.sol`
- **Used By:** ALL core contracts
- **Purpose:** Core pool management interface
- **Functions:** `initialize()`, `swap()`, `modifyLiquidity()`, `unlock()`
- **Deployment:** Already deployed - reference by address

#### Type Definitions:
- `PoolKey` - Pool identification struct
- `PoolId` - Pool ID type
- `Currency` - Token/ETH currency type
- `BalanceDelta` - Token delta from operations
- `BeforeSwapDelta` - Hook return type for beforeSwap
- `Slot0` - Pool state struct

#### Libraries:
- `FullMath` - Overflow-safe math (mulDiv)
- `TickMath` - Tick <-> sqrtPrice conversions
- `SafeCast` - Safe type casting
- `Hooks` - Hook permission validation
- `FixedPoint96` - Q64.96 fixed-point constants
- `StateLibrary` - Pool state queries

### Key Imports:
```solidity
import "v4-core/src/interfaces/IPoolManager.sol";
import "v4-core/src/types/PoolKey.sol";
import "v4-core/src/types/BalanceDelta.sol";
import "v4-core/src/libraries/FullMath.sol";
import "v4-core/src/libraries/TickMath.sol";
```

### Why FullMath Is Critical:
```solidity
// WRONG (overflows for large pools):
uint256 mcap = (sqrtPrice * sqrtPrice * totalSupply) / (2**192);

// CORRECT (FullMath prevents overflow):
uint256 priceX96 = FullMath.mulDiv(sqrtPrice, sqrtPrice, FixedPoint96.Q96);
uint256 mcap = FullMath.mulDiv(priceX96, totalSupply, FixedPoint96.Q96);
```

---

## 4. v4-periphery

**Repository:** https://github.com/Uniswap/v4-periphery  
**Version:** Latest Uniswap V4  
**Purpose:** Position management utilities  
**Usage:** Referenced (already deployed on mainnet)  
**Deployment:** ❌ Already on mainnet (use deployed address)

### Critical: Mainnet Addresses Needed
- **PositionManager:** `TBD` (get from Uniswap docs)
- Network: Ethereum Mainnet / Sepolia

### Used Contracts:

#### `IPositionManager.sol`
- **Used By:** ClawclickFactory, ClawclickLPLocker
- **Purpose:** LP position (NFT) management
- **Functions:** `mint()`, `increaseLiquidity()`, `decreaseLiquidity()`, `collect()`
- **Deployment:** Already deployed - reference by address

#### `Actions.sol`
- **Used By:** ClawclickFactory, ClawclickLPLocker
- **Purpose:** Encode position management actions
- **Functions:** Action constants and encoding helpers

### Key Imports:
```solidity
import "v4-periphery/src/interfaces/IPositionManager.sol";
import "v4-periphery/src/libraries/Actions.sol";
```

---

## 🔗 Dependency Graph

```
ClawClick Contracts
│
├── OpenZeppelin (compiled in)
│   ├── Ownable
│   ├── ReentrancyGuard
│   ├── ERC20
│   └── IERC721
│
├── Uniswap v4-core (reference address)
│   ├── IPoolManager ← NEED MAINNET ADDRESS
│   ├── PoolKey, PoolId, Currency
│   ├── BalanceDelta, BeforeSwapDelta
│   └── FullMath, TickMath, Hooks
│
└── Uniswap v4-periphery (reference address)
    ├── IPositionManager ← NEED MAINNET ADDRESS
    └── Actions
```

---

## 🚀 Deployment Requirements

### Before Deployment, Get These Addresses:

#### **Sepolia Testnet:**
- [ ] Uniswap V4 PoolManager
- [ ] Uniswap V4 PositionManager

#### **Ethereum Mainnet:**
- [ ] Uniswap V4 PoolManager
- [ ] Uniswap V4 PositionManager

### Where to Find Them:
- **Official Docs:** https://docs.uniswap.org/contracts/v4/overview
- **GitHub:** https://github.com/Uniswap/v4-deployments
- **Etherscan:** Search "Uniswap V4 PoolManager"

---

## 📝 Version Management

### Foundry Installation:
```bash
cd contracts
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts@v5.0.0
forge install Uniswap/v4-core
forge install Uniswap/v4-periphery
```

### Update Dependencies:
```bash
forge update
```

### Lock Versions:
All versions are tracked in:
- `foundry.toml` (remappings)
- `remappings.txt` (import paths)
- Git submodules in `.gitmodules`

---

## ⚠️ Important Notes

### DO NOT Deploy These
- `forge-std` → Testing only
- `openzeppelin-contracts` → Compiled into your contracts
- `v4-core` → Already on mainnet
- `v4-periphery` → Already on mainnet

### DO Deploy These
- `ClawclickConfig`
- `ClawclickHook_V4`
- `ClawclickLPLocker`
- `ClawclickFactory`
- `ClawclickToken` (per launch, via factory)

### Compiler Settings
```toml
[profile.default]
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 1000000
via_ir = true
```

---

## 🔍 Verification

### Check Installed Dependencies:
```bash
ls lib/
```

Expected output:
```
forge-std/
openzeppelin-contracts/
v4-core/
v4-periphery/
```

### Verify Remappings:
```bash
cat remappings.txt
```

Should show:
```
@openzeppelin/=lib/openzeppelin-contracts/
v4-core/=lib/v4-core/
v4-periphery/=lib/v4-periphery/
forge-std/=lib/forge-std/src/
```

---

## 📚 References

- **OpenZeppelin Docs:** https://docs.openzeppelin.com/contracts/5.x/
- **Uniswap V4 Docs:** https://docs.uniswap.org/contracts/v4/overview
- **Foundry Book:** https://book.getfoundry.sh/

---

_All dependencies installed and configured correctly as of February 15, 2026_
