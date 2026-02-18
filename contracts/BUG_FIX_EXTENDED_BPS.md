# Bug Fix: Extended Basis Points for Token Allocations

## Problem
Token allocations were off by 10x:
- **P4**: Got 117.2M tokens, expected 11.72M (10x too high)
- **P5**: Got 39M tokens, expected 3.9M (10x too high)

## Root Cause
Token allocations use **extended basis points** (100% = 100000) for fine-grained geometric decay:
- P1: 75000 bps = 75%
- P2: 18750 bps = 18.75%
- P3: 4688 bps = 4.688%
- P4: 1172 bps = 1.172%
- P5: 390 bps = 0.390%

But the code was dividing by `BPS = 10000` (standard basis points), resulting in 10x higher allocations:
- P4: 1172 / 10000 = 11.72% ❌ (should be 1.172%)
- P5: 390 / 10000 = 3.9% ❌ (should be 0.39%)

## Solution
Created separate constants in `ClawclickConfig.sol`:
```solidity
/// @notice Standard basis points for fees, shares, overlaps, limits
uint256 public constant BPS = 10000;

/// @notice Extended basis points for token allocations (finer granularity)
uint256 public constant EXTENDED_BPS = 100000;
```

Updated `ClawclickFactory.sol` to use `EXTENDED_BPS` for token allocations:
```solidity
tokenAllocations[0] = (totalSupply * config.POSITION_1_ALLOCATION_BPS()) / config.EXTENDED_BPS();
tokenAllocations[1] = (totalSupply * config.POSITION_2_ALLOCATION_BPS()) / config.EXTENDED_BPS();
// ... etc
```

Updated tests in `MP_06_PositionMintingTest.sol` to use `EXTENDED_BPS`.

## Why Two Constants?
- **BPS (10000)**: Used for fees, platform shares, position overlaps, limits (5% = 500 bps)
- **EXTENDED_BPS (100000)**: Used only for token allocations to support precise geometric decay (1.172% = 1172 extended bps)

Using extended BPS only for allocations avoids breaking existing fee/share/overlap calculations.

## Files Changed
1. `src/core/ClawclickConfig.sol` - Added EXTENDED_BPS constant
2. `src/core/ClawclickFactory.sol` - Use EXTENDED_BPS for allocations
3. `script/tests/MP_06_PositionMintingTest.sol` - Updated P2-P5 allocation tests

## Test Impact
Fixes 6 failing tests:
- test_P2TokenAllocation() ✅
- test_P3TokenAllocation() ✅
- test_P4TokenAllocation() ✅
- test_P5TokenAllocation() ✅
- (2 more related allocation tests)

## Verification
After fix, token allocations:
- P1: 750M tokens (75%)
- P2: 187.5M tokens (18.75%)
- P3: 46.88M tokens (4.688%)
- P4: 11.72M tokens (1.172%)
- P5: 3.9M tokens (0.390%)
- **TOTAL**: 1,000M tokens (100%) ✅
