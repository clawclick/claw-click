/**
 * Find CREATE2 salt for hook deployment
 * Deployer: 0xEA9aabe224d3c26E643703C319778cf1B44996b2 (Sepolia)
 */

const { ethers } = require('ethers')
const fs = require('fs')

// Read hook bytecode
const hookArtifact = JSON.parse(fs.readFileSync('./contracts/out/ClawclickHook_V4.sol/ClawclickHook.json'))
const hookBytecode = hookArtifact.bytecode.object

// Sepolia config
const CREATE2_DEPLOYER = '0xEA9aabe224d3c26E643703C319778cf1B44996b2'
const POOL_MANAGER = '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543'
const CONFIG = '0xf01514F68Df33689046F6Dd4184edCaA54fF4492'

// Encode constructor args
const constructorArgs = ethers.AbiCoder.defaultAbiCoder().encode(
  ['address', 'address'],
  [POOL_MANAGER, CONFIG]
)

// Full init code
const initCode = hookBytecode + constructorArgs.slice(2)
const initCodeHash = ethers.keccak256(initCode)

console.log('Searching for salt...')
console.log('Deployer:', CREATE2_DEPLOYER)
console.log('Init Code Hash:', initCodeHash)
console.log('')

// Search for salt
for (let i = 0; i < 100000; i++) {
  const salt = ethers.zeroPadValue(ethers.toBeHex(i), 32)
  
  const address = ethers.getCreate2Address(
    CREATE2_DEPLOYER,
    salt,
    initCodeHash
  )
  
  const addressBigInt = BigInt(address)
  const permissions = Number(addressBigInt & BigInt(0x3FFF))
  
  if (permissions === 234) {
    console.log('FOUND!')
    console.log('Salt:', i)
    console.log('Address:', address)
    console.log('Permissions:', permissions)
    break
  }
  
  if (i % 10000 === 0 && i > 0) {
    console.log('Checked', i, 'salts...')
  }
}
