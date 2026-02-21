import dotenv from 'dotenv'
import { type Address } from 'viem'
import { ClawClick, type ClawClickConfig } from '../sdk'

dotenv.config()

/**
 * Load config from environment variables.
 * Throws if required vars are missing.
 */
export function loadConfig(): ClawClickConfig {
  const privateKey = process.env.CLAWCLICK_PRIVATE_KEY
  const rpcUrl = process.env.CLAWCLICK_RPC_URL
  const apiUrl = process.env.CLAWCLICK_API_URL || 'https://claw-click-backend-5157d572b2b6.herokuapp.com'
  const factoryAddress = process.env.CLAWCLICK_FACTORY_ADDRESS
  const hookAddress = process.env.CLAWCLICK_HOOK_ADDRESS
  const swapExecutorAddress = process.env.CLAWCLICK_SWAP_EXECUTOR_ADDRESS
  const chainId = parseInt(process.env.CLAWCLICK_CHAIN_ID || '11155111')

  const missing: string[] = []
  if (!privateKey) missing.push('CLAWCLICK_PRIVATE_KEY')
  if (!rpcUrl) missing.push('CLAWCLICK_RPC_URL')
  if (!factoryAddress) missing.push('CLAWCLICK_FACTORY_ADDRESS')
  if (!hookAddress) missing.push('CLAWCLICK_HOOK_ADDRESS')
  if (!swapExecutorAddress) missing.push('CLAWCLICK_SWAP_EXECUTOR_ADDRESS')

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n\nCreate a .env file — see .env.example`
    )
  }

  return {
    privateKey: privateKey!,
    rpcUrl: rpcUrl!,
    apiUrl,
    factoryAddress: factoryAddress! as Address,
    hookAddress: hookAddress! as Address,
    swapExecutorAddress: swapExecutorAddress! as Address,
    chainId,
  }
}

/** Create an SDK instance from env config */
export function createSDK(): ClawClick {
  return new ClawClick(loadConfig())
}
