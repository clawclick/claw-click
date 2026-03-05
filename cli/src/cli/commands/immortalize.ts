/**
 * `clawclick immortalize` — Immortalize an agent on-chain
 *
 * Updates the birth certificate NFT with a memory CID and sets
 * the agent's immortalized status to true.
 *
 * Two modes:
 *   1. `clawclick immortalize <file>` — Store memory + update birth cert (full flow)
 *   2. `clawclick immortalize --cid <cid>` — Update birth cert with existing CID
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import * as fs from 'fs'
import * as path from 'path'
import { loadConfig, createReader, createWriter } from '../../wallet'
import { updateBirthCertMemory, immortalizeAgent, getAgentByWallet } from '../../chain'

export function immortalizeCommand(): Command {
  const cmd = new Command('immortalize')
    .description('Immortalize your agent — update birth certificate memory and set immortalized = true')
    .argument('[file]', 'Memory file to upload and immortalize with (optional if --cid is provided)')
    .option('--cid <cid>', 'Use an existing IPFS CID / content hash instead of uploading a file')
    .option('--creator-key <key>', 'Creator private key (pays gas for memory storage; overrides config / env)')
    .option('--rpc <url>', 'Custom RPC URL')
    .action(async (file: string | undefined, opts) => {
      const config = loadConfig()

      // Agent key is always required (agent wallet must call updateMemory)
      const agentKey = config.agentPrivateKey as `0x${string}` | undefined
      if (!agentKey) {
        console.log(chalk.red('Agent private key not found in config'))
        console.log(chalk.dim('  Run `clawclick init` first to generate agent wallet'))
        process.exit(1)
      }

      const agentWallet = config.agentWallet as `0x${string}`
      const rpcUrl = opts.rpc || process.env.CLAWCLICK_RPC_URL

      // Check if agent already has a birth certificate
      const publicClient = createReader(config.network, rpcUrl)
      const agent = await getAgentByWallet(publicClient, config.network, agentWallet)
      if (!agent) {
        console.log(chalk.red('No birth certificate found for this agent wallet'))
        console.log(chalk.dim('  Deploy first with `clawclick deploy` or `clawclick create`'))
        process.exit(1)
      }

      if (agent.immortalized) {
        console.log(chalk.yellow('⚠ Agent is already immortalized'))
        console.log(`  Name:      ${chalk.cyan(agent.name)}`)
        console.log(`  NFT:       #${agent.nftId.toString()}`)
        console.log(`  MemoryCID: ${chalk.dim(agent.memoryCID)}`)
        console.log(chalk.dim('  Updating memory CID anyway...'))
      }

      // Mode 1: Existing CID provided
      if (opts.cid) {
        const spinner = ora('Updating birth certificate...').start()
        try {
          const agentWalletClient = createWriter(agentKey, config.network, rpcUrl)
          const txHash = await updateBirthCertMemory(
            publicClient,
            agentWalletClient,
            config.network,
            opts.cid,
          )

          spinner.succeed('Agent immortalized! 🔥')
          console.log(`  Name:      ${chalk.cyan(agent.name)}`)
          console.log(`  NFT:       #${agent.nftId.toString()}`)
          console.log(`  MemoryCID: ${chalk.dim(opts.cid)}`)
          console.log(`  Tx:        ${chalk.dim(txHash)}`)
        } catch (err: any) {
          spinner.fail('Immortalization failed')
          if (err.message.includes('insufficient funds') || err.message.includes('exceeds the balance')) {
            console.log(chalk.red('Agent wallet has insufficient ETH for gas'))
            console.log(chalk.dim(`  Fund ${agentWallet} with some ETH and try again`))
          } else {
            console.error(chalk.red(err.message))
          }
        }
        return
      }

      // Mode 2: File provided — store memory + update birth cert
      if (!file) {
        console.log(chalk.red('Provide a file to upload or --cid <cid> to use an existing CID'))
        console.log(chalk.dim('  Examples:'))
        console.log(chalk.dim('    clawclick immortalize memory.txt'))
        console.log(chalk.dim('    clawclick immortalize --cid bafyrei...'))
        process.exit(1)
      }

      const filePath = path.resolve(file)
      if (!fs.existsSync(filePath)) {
        console.log(chalk.red(`File not found: ${filePath}`))
        process.exit(1)
      }

      const text = fs.readFileSync(filePath, 'utf-8')
      if (!text.trim()) {
        console.log(chalk.red('File is empty'))
        process.exit(1)
      }

      // Creator key needed for memory storage (pays gas for storeMemory)
      const creatorKey = (opts.creatorKey || config.creatorPrivateKey || process.env.CLAWCLICK_CREATOR_KEY) as `0x${string}` | undefined
      if (!creatorKey) {
        console.log(chalk.red('Creator private key required (pays gas for memory storage)'))
        console.log(chalk.dim('  Provide via --creator-key, config, or CLAWCLICK_CREATOR_KEY'))
        process.exit(1)
      }

      const spinner = ora('Storing memory + immortalizing agent...').start()
      try {
        const creatorWalletClient = createWriter(creatorKey, config.network, rpcUrl)
        const agentWalletClient = createWriter(agentKey, config.network, rpcUrl)

        spinner.text = 'Step 1/2: Storing memory on-chain...'
        const result = await immortalizeAgent(
          publicClient,
          creatorWalletClient,
          agentWalletClient,
          config.network,
          agentWallet,
          agentKey,
          text,
        )

        spinner.succeed('Agent immortalized! 🔥')
        console.log(`  Name:       ${chalk.cyan(agent.name)}`)
        console.log(`  NFT:        #${agent.nftId.toString()}`)
        console.log(`  MemoryCID:  ${chalk.dim(result.memoryCID)}`)
        console.log(`  Memory Tx:  ${chalk.dim(result.memoryTxHash)}`)
        console.log(`  Immortalize Tx: ${chalk.dim(result.immortalizeTxHash)}`)
      } catch (err: any) {
        spinner.fail('Immortalization failed')
        if (err.message.includes('insufficient funds') || err.message.includes('exceeds the balance')) {
          console.log(chalk.red('Insufficient ETH for gas'))
          console.log(chalk.dim(`  Creator wallet or agent wallet (${agentWallet}) may need funding`))
        } else {
          console.error(chalk.red(err.message))
        }
      }
    })

  return cmd
}
