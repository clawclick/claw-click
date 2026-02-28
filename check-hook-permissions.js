/**
 * Check if hook address has correct Uniswap V4 permission flags
 */

const hookAddress = '0xCD7568392159C4860ea4b9b14c5f41e720173404'

// In Uniswap V4, the hook address itself encodes permissions
// The rightmost 14 bits of the address indicate which hooks are enabled:
// Bit 0: beforeInitialize
// Bit 1: afterInitialize  
// Bit 2: beforeAddLiquidity
// Bit 3: afterAddLiquidity
// Bit 4: beforeRemoveLiquidity
// Bit 5: afterRemoveLiquidity
// Bit 6: beforeSwap
// Bit 7: afterSwap
// Bit 8: beforeDonate
// Bit 9: afterDonate
// Bit 10-13: reserved

const addressBigInt = BigInt(hookAddress)
const permissions = Number(addressBigInt & BigInt(0x3FFF)) // Last 14 bits

console.log('\n🔍 Hook Address Permission Analysis\n')
console.log('Hook Address:', hookAddress)
console.log('Address as BigInt:', addressBigInt.toString())
console.log('Permission Bits (last 14 bits):', permissions.toString(2).padStart(14, '0'))
console.log('')

const flags = {
  beforeInitialize: (permissions & (1 << 0)) !== 0,
  afterInitialize: (permissions & (1 << 1)) !== 0,
  beforeAddLiquidity: (permissions & (1 << 2)) !== 0,
  afterAddLiquidity: (permissions & (1 << 3)) !== 0,
  beforeRemoveLiquidity: (permissions & (1 << 4)) !== 0,
  afterRemoveLiquidity: (permissions & (1 << 5)) !== 0,
  beforeSwap: (permissions & (1 << 6)) !== 0,
  afterSwap: (permissions & (1 << 7)) !== 0,
  beforeDonate: (permissions & (1 << 8)) !== 0,
  afterDonate: (permissions & (1 << 9)) !== 0,
}

console.log('Permission Flags:')
console.log('  beforeInitialize:', flags.beforeInitialize ? '✅' : '❌')
console.log('  afterInitialize:', flags.afterInitialize ? '✅' : '❌')
console.log('  beforeAddLiquidity:', flags.beforeAddLiquidity ? '✅' : '❌')
console.log('  afterAddLiquidity:', flags.afterAddLiquidity ? '✅' : '❌')
console.log('  beforeRemoveLiquidity:', flags.beforeRemoveLiquidity ? '✅' : '❌')
console.log('  afterRemoveLiquidity:', flags.afterRemoveLiquidity ? '✅' : '❌')
console.log('  beforeSwap:', flags.beforeSwap ? '✅' : '❌')
console.log('  afterSwap:', flags.afterSwap ? '✅' : '❌')
console.log('  beforeDonate:', flags.beforeDonate ? '✅' : '❌')
console.log('  afterDonate:', flags.afterDonate ? '✅' : '❌')
console.log('')

// ClawclickHook should have these permissions enabled:
// - afterInitialize (for tracking pool creation)
// - beforeSwap (for tax calculation)
// - afterSwap (for fee collection)
// - afterAddLiquidity (for position tracking)
// - afterRemoveLiquidity (for position tracking)

const requiredFlags = ['afterInitialize', 'beforeSwap', 'afterSwap', 'afterAddLiquidity', 'afterRemoveLiquidity']
const missingFlags = requiredFlags.filter(flag => !flags[flag])

if (missingFlags.length > 0) {
  console.log('❌ PROBLEM: Hook address missing required permission flags!')
  console.log('   Missing:', missingFlags.join(', '))
  console.log('')
  console.log('🔧 SOLUTION: Redeploy hook with CREATE2 using correct salt to get address with required flags')
  console.log('')
} else {
  console.log('✅ Hook address has all required permissions')
  console.log('')
}

// Calculate what the last byte should be for our required permissions
const requiredPermissions = 
  (1 << 1) | // afterInitialize
  (1 << 3) | // afterAddLiquidity
  (1 << 5) | // afterRemoveLiquidity
  (1 << 6) | // beforeSwap
  (1 << 7)   // afterSwap

console.log('Required Permissions Bitmask:', requiredPermissions.toString(2).padStart(14, '0'), `(${requiredPermissions})`)
console.log('Current Permissions Bitmask: ', permissions.toString(2).padStart(14, '0'), `(${permissions})`)
console.log('')

if (permissions !== requiredPermissions) {
  console.log('⚠️  Address permissions mismatch!')
  console.log('   Need to find CREATE2 salt that produces address ending in:', requiredPermissions.toString(16).padStart(4, '0'))
}
