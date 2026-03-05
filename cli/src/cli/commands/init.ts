/**
 * `clawclick init` — Initialize a new agent project
 *
 * Generates agent wallet, writes clawclick.json config, optionally generates FUNLAN.
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import * as fs from 'fs'
import * as path from 'path'
import {
  generateAgentWallet,
  saveConfig,
  findConfig,
  type AgentConfig,
} from '../../wallet'
import { generateFunlanGrid, toFunlanMarkdown } from '../../funlan'
import type { Network } from '../../contracts'

export function initCommand(): Command {
  const cmd = new Command('init')
    .description('Initialize a new agent project with a fresh wallet')
    .option('--name <name>', 'Agent name')
    .option('--symbol <symbol>', 'Token symbol (1-10 chars)')
    .option('--network <network>', 'Network: sepolia or base', 'sepolia')
    .option('--mcap <eth>', 'Starting market cap in ETH', '5')
    .option('--dev-buy <percent>', 'Dev buy percentage (0-100)', '0')
    .option('--creator <address>', 'Creator wallet address')
    .option('--creator-key <key>', 'Creator private key (optional)')
    .option('--tax-wallets <wallets>', 'Comma-separated tax wallet addresses')
    .option('--tax-percentages <pcts>', 'Comma-separated tax percentages')
    .option('--no-funlan', 'Skip FUNLAN.md generation')
    .option('--force', 'Overwrite existing config')
    .action(async (opts) => {
      await runInit(opts)
    })
  return cmd
}

export async function runInit(opts: any): Promise<AgentConfig> {
  // Check for existing config
  const existing = findConfig()
  if (existing && !opts.force) {
    console.log(chalk.yellow(`⚠ Config already exists at ${existing}`))
    console.log(chalk.dim('  Use --force to overwrite'))
    process.exit(1)
  }

  // Interactive mode if required fields missing
  let name = opts.name
  let symbol = opts.symbol

  if (!name || !symbol) {
    try {
      // @ts-ignore - inquirer dynamic import
      const inquirer = await import('inquirer')
      const answers = await inquirer.default.prompt([
        ...(!name ? [{
          type: 'input' as const,
          name: 'name',
          message: 'Agent name:',
          validate: (v: string) => v.trim().length > 0 || 'Name is required',
        }] : []),
        ...(!symbol ? [{
          type: 'input' as const,
          name: 'symbol',
          message: 'Token symbol (1-10 chars):',
          validate: (v: string) => {
            const s = v.trim().toUpperCase()
            return (s.length >= 1 && s.length <= 10) || 'Symbol must be 1-10 characters'
          },
        }] : []),
      ])
      name = name || answers.name
      symbol = symbol || answers.symbol
    } catch {
      console.log(chalk.red('Error: --name and --symbol are required in non-interactive mode'))
      process.exit(1)
    }
  }

  symbol = symbol.toUpperCase()
  const network = (opts.network || 'sepolia') as Network
  const startingMcap = parseFloat(opts.mcap || '5')
  const devBuyPercent = parseFloat(opts.devBuy || '0')

  // Generate agent wallet
  const spinner = ora('Generating agent wallet...').start()
  const wallet = generateAgentWallet()
  spinner.succeed(`Agent wallet: ${chalk.cyan(wallet.address)}`)

  // Parse tax wallets
  let taxWallets: string[] = []
  let taxPercentages: number[] = []
  if (opts.taxWallets) {
    taxWallets = opts.taxWallets.split(',').map((w: string) => w.trim())
    taxPercentages = (opts.taxPercentages || '')
      .split(',')
      .map((p: string) => parseInt(p.trim()) || 0)
  }

  // If creator provided and no tax wallets, default to creator 100%
  const creatorAddr = opts.creator || opts.creatorKey
    ? (opts.creator || undefined)
    : undefined

  if (creatorAddr && taxWallets.length === 0) {
    taxWallets = [creatorAddr]
    taxPercentages = [100]
  }

  // Build config
  const config: AgentConfig = {
    name,
    symbol,
    network,
    agentWallet: wallet.address,
    agentPrivateKey: wallet.privateKey,
    creatorWallet: creatorAddr,
    creatorPrivateKey: opts.creatorKey || undefined,
    startingMcap,
    devBuyPercent,
    taxWallets,
    taxPercentages,
    createdAt: new Date().toISOString(),
  }

  // Save config
  const configPath = saveConfig(config)
  console.log(chalk.green(`✔ Config saved to ${path.basename(configPath)}`))

  // Generate FUNLAN.md
  if (opts.funlan !== false) {
    const grid = generateFunlanGrid(wallet.address)
    const markdown = toFunlanMarkdown(wallet.address)
    const funlanPath = path.join(process.cwd(), 'FUNLAN.md')
    fs.writeFileSync(funlanPath, markdown)
    console.log(chalk.green(`✔ FUNLAN.md generated`))
    console.log(chalk.dim(`  Grid: ${grid.text}`))
  }

  // Summary
  console.log('')
  console.log(chalk.bold('Agent initialized:'))
  console.log(`  Name:    ${chalk.white(name)}`)
  console.log(`  Symbol:  ${chalk.white(symbol)}`)
  console.log(`  Network: ${chalk.white(network)}`)
  console.log(`  Wallet:  ${chalk.cyan(wallet.address)}`)
  console.log(`  MCap:    ${chalk.white(startingMcap + ' ETH')}`)
  console.log('')
  console.log(chalk.dim('Next: run `clawclick deploy` to launch on-chain'))
  console.log(chalk.dim(`⚠ Fund ${wallet.address} with ETH before deploying`))

  return config
}
