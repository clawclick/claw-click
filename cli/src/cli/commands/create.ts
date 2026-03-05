/**
 * `clawclick create` — One-liner: init + deploy
 *
 * Usage:
 *   clawclick create --name "MyAgent" --symbol "AGNT" --creator-key 0x...
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { runInit } from './init'
import { runDeploy } from './deploy'

export function createCommand(): Command {
  const cmd = new Command('create')
    .description('Create and deploy an agent in one step (init + deploy)')
    .requiredOption('-n, --name <name>', 'Agent / token name')
    .requiredOption('-s, --symbol <symbol>', 'Token symbol')
    .option('--network <network>', 'Network: mainnet | sepolia', 'sepolia')
    .option('--mcap <eth>', 'Starting MCAP in ETH', '5')
    .option('--dev-buy <percent>', 'Dev buy percent', '0')
    .option('--creator-key <key>', 'Creator private key (or env CLAWCLICK_CREATOR_KEY)')
    .option('--rpc <url>', 'RPC URL override')
    .action(async (opts) => {
      await runCreate(opts)
    })

  return cmd
}

export async function runCreate(opts: any): Promise<void> {
  console.log(chalk.bold('Creating and deploying agent in one step...\n'))

  // Step 1: Init
  await runInit({
    name: opts.name,
    symbol: opts.symbol,
    network: opts.network || 'sepolia',
    mcap: opts.mcap || '5',
    devBuy: opts.devBuy || '0',
    creatorKey: opts.creatorKey || process.env.CLAWCLICK_CREATOR_KEY,
    funlan: true,
    force: true,
  })

  console.log('')

  // Step 2: Deploy
  await runDeploy({
    creatorKey: opts.creatorKey || process.env.CLAWCLICK_CREATOR_KEY,
    rpc: opts.rpc,
  })
}
