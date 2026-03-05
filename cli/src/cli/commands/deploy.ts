/**
 * `clawclick deploy` — Deploy agent token + mint birth certificate on-chain
 *
 * Reads clawclick.json config, executes:
 *   1. factory.createLaunch() → token address
 *   2. birthCertificate.mintBirthCertificate() → NFT ID
 *   3. Updates config with tokenAddress + nftId
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig, saveConfig, loadAccount, createReader, createWriter, findConfig } from '../../wallet'
import { createStandaloneLaunch, mintBirthCertificate, launchAndMint, getNftIdByWallet } from '../../chain'
import { getAddresses } from '../../contracts'
import type { CreateLaunchParams } from '../../chain'

export function deployCommand(): Command {
  const cmd = new Command('deploy')
    .description('Deploy agent token and mint birth certificate NFT')
    .option('--creator-key <key>', 'Creator private key (overrides config / env)')
    .option('--rpc <url>', 'Custom RPC URL')
    .option('--skip-token', 'Skip token creation (only mint birth cert)')
    .option('--skip-nft', 'Skip birth certificate (only create token)')
    .option('--no-bundle', 'Use 2-step flow instead of single bundled transaction')
    .option('--dry-run', 'Simulate without sending transactions')
    .action(async (opts) => {
      await runDeploy(opts)
    })
  return cmd
}

export async function runDeploy(opts: any): Promise<void> {
  // Load config
  const configPath = findConfig()
  if (!configPath) {
    console.log(chalk.red('No clawclick.json found. Run `clawclick init` first.'))
    process.exit(1)
  }

  const config = loadConfig(configPath)

  if (config.tokenAddress && !opts.skipToken) {
    console.log(chalk.yellow(`⚠ Token already deployed: ${config.tokenAddress}`))
    console.log(chalk.dim('  Use --skip-token to only mint birth certificate'))
  }

  // Resolve creator key
  const creatorKey = (opts.creatorKey || config.creatorPrivateKey || process.env.CLAWCLICK_CREATOR_KEY) as `0x${string}` | undefined
  if (!creatorKey) {
    console.log(chalk.red('Error: Creator private key required.'))
    console.log(chalk.dim('  Provide via --creator-key, config, or CLAWCLICK_CREATOR_KEY env'))
    process.exit(1)
  }

  const creatorAccount = loadAccount(creatorKey)
  const publicClient = createReader(config.network, opts.rpc)
  const walletClient = createWriter(creatorKey, config.network, opts.rpc)

  if (opts.dryRun) {
    console.log(chalk.yellow('🏜 Dry run mode — no transactions will be sent'))
    console.log('')
    console.log(chalk.bold('Deployment plan:'))
    console.log(`  Creator:      ${chalk.cyan(creatorAccount.address)}`)
    console.log(`  Agent Wallet: ${chalk.cyan(config.agentWallet)}`)
    console.log(`  Name:         ${config.name}`)
    console.log(`  Symbol:       ${config.symbol}`)
    console.log(`  Network:      ${config.network}`)
    console.log(`  Starting MCap: ${config.startingMcap} ETH`)
    console.log(`  Dev Buy:      ${config.devBuyPercent}%`)
    if (!opts.skipToken) console.log(`  Step 1: createLaunch() on factory`)
    if (!opts.skipNft) console.log(`  Step 2: mintBirthCertificate() — 0.005 ETH`)
    return
  }

  console.log(chalk.bold(`Deploying ${config.name} ($${config.symbol}) on ${config.network}`))
  console.log(`  Creator: ${chalk.cyan(creatorAccount.address)}`)
  console.log('')

  // Check if bundler is available
  const addrs = getAddresses(config.network)
  const useBundler = opts.bundle !== false && !opts.skipToken && !opts.skipNft && !!addrs.bundler

  let tokenAddress = config.tokenAddress
  let poolId: string | undefined
  let nftId = config.nftId ? BigInt(config.nftId) : undefined

  if (useBundler && !tokenAddress) {
    // Bundled 1-tx flow: createLaunch + mintBirthCertificate
    const spinner = ora('Launching token + minting birth certificate (1 tx)...').start()
    try {
      const result = await launchAndMint(publicClient, walletClient, config.network, {
        name: config.name,
        symbol: config.symbol,
        beneficiary: creatorAccount.address,
        agentWallet: config.agentWallet,
        targetMcapETH: config.startingMcap,
        devBuyPercent: config.devBuyPercent,
        taxWallets: config.taxWallets as `0x${string}`[],
        taxPercentages: config.taxPercentages,
        creator: creatorAccount.address,
      })

      tokenAddress = result.tokenAddress
      poolId = result.poolId
      nftId = result.nftId

      // Fallback: if event parsing missed the nftId, query on-chain
      if ((!nftId || nftId === 0n) && tokenAddress) {
        try {
          const queriedId = await getNftIdByWallet(publicClient, config.network, config.agentWallet as `0x${string}`)
          if (queriedId > 0n) nftId = queriedId
        } catch { /* non-critical */ }
      }

      spinner.succeed(`Token + birth cert in 1 tx!`)
      console.log(`  Token: ${chalk.cyan(tokenAddress)}`)
      if (nftId && nftId > 0n) console.log(`  NFT:   ${chalk.cyan('#' + nftId.toString())}`)
      if (poolId) console.log(`  Pool:  ${chalk.dim(poolId)}`)
      console.log(`  Tx:    ${chalk.dim(result.txHash)}`)
    } catch (err: any) {
      spinner.fail('Bundled launch failed, falling back to 2-step flow...')
      console.error(chalk.dim(err.message || err))
      // Fall through to 2-step flow below
    }
  }

  // Step 1: Create token launch (2-step or fallback)
  if (!tokenAddress && !opts.skipToken) {
    const spinner = ora('Creating token launch...').start()
    try {
      const params: CreateLaunchParams = {
        name: config.name,
        symbol: config.symbol,
        beneficiary: creatorAccount.address,
        agentWallet: config.agentWallet,
        targetMcapETH: config.startingMcap,
        devBuyPercent: config.devBuyPercent,
        taxWallets: config.taxWallets as `0x${string}`[],
        taxPercentages: config.taxPercentages,
      }

      const result = await createStandaloneLaunch(publicClient, walletClient, config.network, params)
      tokenAddress = result.tokenAddress
      poolId = result.poolId

      spinner.succeed(`Token created: ${chalk.cyan(tokenAddress)}`)
      console.log(`  Tx: ${chalk.dim(result.txHash)}`)
      if (poolId) console.log(`  Pool: ${chalk.dim(poolId)}`)
    } catch (err: any) {
      spinner.fail('Token creation failed')
      console.error(chalk.red(err.message || err))
      process.exit(1)
    }
  }

  // Step 2: Mint birth certificate (if not already done by bundler)
  if (nftId === undefined && !opts.skipNft && tokenAddress) {
    const spinner = ora('Minting birth certificate NFT (0.005 ETH)...').start()
    try {
      const result = await mintBirthCertificate(publicClient, walletClient, config.network, {
        agentWallet: config.agentWallet,
        tokenAddress: tokenAddress,
        creator: creatorAccount.address,
        name: config.name,
      })

      nftId = result.nftId
      spinner.succeed(`Birth certificate minted: NFT #${chalk.cyan(nftId.toString())}`)
      console.log(`  Tx: ${chalk.dim(result.txHash)}`)
    } catch (err: any) {
      spinner.fail('Birth certificate minting failed')
      console.error(chalk.red(err.message || err))
      process.exit(1)
    }
  }

  // Update config
  if (tokenAddress || nftId) {
    if (tokenAddress) config.tokenAddress = tokenAddress as `0x${string}`
    if (nftId) config.nftId = Number(nftId)
    saveConfig(config, configPath.replace('/clawclick.json', ''))
    console.log(chalk.green('\n✔ Config updated with deployment info'))
  }

  // Summary
  console.log('')
  console.log(chalk.bold.green('🎉 Agent deployed successfully!'))
  console.log(`  Token: ${chalk.cyan(tokenAddress || 'skipped')}`)
  console.log(`  NFT:   ${nftId ? chalk.cyan('#' + nftId.toString()) : 'skipped'}`)
  console.log('')
  console.log(chalk.dim(`View at: https://claw.click/agent/${config.agentWallet}`))
}
