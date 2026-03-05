/**
 * `clawclick memory` — Store and query agent memory on-chain
 *
 * Subcommands:
 *   upload <file>  — Store file contents directly on-chain via MemoryStorage
 *   list           — List memory entries
 *   get <index>    — Get specific memory entry
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import * as fs from 'fs'
import * as path from 'path'
import { parseEther, keccak256 } from 'viem'
import { loadConfig, createReader, createWriter } from '../../wallet'
import { getMemoryCount, getMemory, storeMemory, updateBirthCertMemory } from '../../chain'

/** Minimum ETH the agent wallet needs for the updateMemory() call */
const AGENT_GAS_FUND = '0.0005'

export function memoryCommand(): Command {
  const cmd = new Command('memory')
    .description('Manage agent memory (on-chain via MemoryStorage)')

  // ── upload ──
  cmd
    .command('upload <file>')
    .description('Store memory on-chain + update birth certificate (auto-immortalize)')
    .option('--creator-key <key>', 'Creator private key (pays gas; overrides config / env)')
    .option('--skip-immortalize', 'Skip the birth certificate updateMemory() call')
    .option('--rpc <url>', 'Custom RPC URL')
    .action(async (file: string, opts) => {
      const filePath = path.resolve(file)
      if (!fs.existsSync(filePath)) {
        console.log(chalk.red(`File not found: ${filePath}`))
        process.exit(1)
      }

      const config = loadConfig()

      // Need creator key for gas
      const creatorKey = (opts.creatorKey || config.creatorPrivateKey || process.env.CLAWCLICK_CREATOR_KEY) as `0x${string}` | undefined
      if (!creatorKey) {
        console.log(chalk.red('Creator private key required (pays gas)'))
        console.log(chalk.dim('  Provide via --creator-key, config, or CLAWCLICK_CREATOR_KEY'))
        process.exit(1)
      }

      // Need agent key for signing the memory content
      const agentKey = config.agentPrivateKey as `0x${string}` | undefined
      if (!agentKey) {
        console.log(chalk.red('Agent private key not found in config'))
        console.log(chalk.dim('  Run `clawclick init` first to generate agent wallet'))
        process.exit(1)
      }

      const text = fs.readFileSync(filePath, 'utf-8')
      if (!text.trim()) {
        console.log(chalk.red('File is empty'))
        process.exit(1)
      }

      const spinner = ora('Storing memory on-chain...').start()
      try {
        const publicClient = createReader(config.network, opts.rpc)
        const walletClient = createWriter(creatorKey, config.network, opts.rpc)

        const txHash = await storeMemory(
          publicClient,
          walletClient,
          config.network,
          config.agentWallet as `0x${string}`,
          agentKey,
          text,
        )

        spinner.succeed('Memory stored on-chain')
        console.log(`  Text: ${chalk.cyan(text.length > 80 ? text.slice(0, 80) + '…' : text)}`)
        console.log(`  Tx:   ${chalk.dim(txHash)}`)

        // Auto-update birth certificate (sets immortalized = true)
        if (!opts.skipImmortalize) {
          const immortalizeSpinner = ora('Updating birth certificate (immortalizing)...').start()
          try {
            const memoryCID = keccak256(new TextEncoder().encode(text) as unknown as Uint8Array)
            const agentWalletClient = createWriter(agentKey, config.network, opts.rpc)

            // Check if agent wallet has enough ETH for gas — if not, fund it from creator
            const agentBalance = await publicClient.getBalance({ address: config.agentWallet as `0x${string}` })
            const minGas = parseEther(AGENT_GAS_FUND)
            if (agentBalance < minGas) {
              const fundSpinner = ora(`Funding agent wallet with ${AGENT_GAS_FUND} ETH for gas...`).start()
              try {
                const chain = walletClient.chain
                const account = walletClient.account!
                const fundTx = await walletClient.sendTransaction({
                  to: config.agentWallet as `0x${string}`,
                  value: minGas,
                  chain,
                  account,
                })
                await publicClient.waitForTransactionReceipt({ hash: fundTx })
                fundSpinner.succeed(`Funded agent wallet with ${AGENT_GAS_FUND} ETH`)
                console.log(`  Fund Tx: ${chalk.dim(fundTx)}`)
              } catch (fundErr: any) {
                fundSpinner.fail('Failed to fund agent wallet')
                console.error(chalk.red(fundErr.message))
                console.log(chalk.dim(`  Manually send ETH to ${config.agentWallet} and run again`))
                return
              }
            }

            const immortalizeTx = await updateBirthCertMemory(
              publicClient,
              agentWalletClient,
              config.network,
              memoryCID,
            )
            immortalizeSpinner.succeed('Agent immortalized! 🔥')
            console.log(`  Birth cert Tx: ${chalk.dim(immortalizeTx)}`)
          } catch (err: any) {
            immortalizeSpinner.fail('Birth certificate update failed')
            console.error(chalk.red(err.message))
          }
        }
      } catch (err: any) {
        spinner.fail('Memory upload failed')
        console.error(chalk.red(err.message))
      }
    })

  // ── list ──
  cmd
    .command('list')
    .description('List all memory entries for this agent')
    .option('--rpc <url>', 'Custom RPC URL')
    .action(async (opts) => {
      const config = loadConfig()
      const spinner = ora('Fetching memory entries...').start()

      try {
        const client = createReader(config.network, opts.rpc)
        const agentWallet = config.agentWallet as `0x${string}`

        const count = await getMemoryCount(client, config.network, agentWallet)
        spinner.succeed(`${count.toString()} memory entries`)

        for (let i = 0n; i < count; i++) {
          const mem = await getMemory(client, config.network, agentWallet, i)
          const preview = mem.fullText
            ? (mem.fullText.length > 60 ? mem.fullText.slice(0, 60) + '…' : mem.fullText)
            : mem.ipfsCID
          console.log(`  [${i}] ${chalk.cyan(preview)} — ${new Date(Number(mem.timestamp) * 1000).toLocaleDateString()}`)
        }
      } catch (err: any) {
        spinner.fail('Failed to list memories')
        console.error(chalk.red(err.message))
      }
    })

  // ── get ──
  cmd
    .command('get <index>')
    .description('Get a specific memory entry')
    .option('--rpc <url>', 'Custom RPC URL')
    .action(async (index: string, opts) => {
      const config = loadConfig()

      try {
        const client = createReader(config.network, opts.rpc)
        const agentWallet = config.agentWallet as `0x${string}`

        const mem = await getMemory(client, config.network, agentWallet, BigInt(index))
        console.log(`  Timestamp:    ${new Date(Number(mem.timestamp) * 1000).toLocaleString()}`)
        if (mem.fullText) {
          console.log(`  Full text:    ${chalk.cyan(mem.fullText)}`)
        }
        if (mem.ipfsCID) {
          console.log(`  CID/Hash:     ${chalk.dim(mem.ipfsCID)}`)
        }
        console.log(`  Content hash: ${chalk.dim(mem.contentHash)}`)
      } catch (err: any) {
        console.error(chalk.red(err.message))
      }
    })

  return cmd
}
