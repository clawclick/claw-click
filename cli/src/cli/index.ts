#!/usr/bin/env node

import { Command } from 'commander'
import { createSDK } from './config'
import { formatEther, parseEther, type Address } from 'viem'

// Modular command imports
import { initCommand } from './commands/init'
import { deployCommand } from './commands/deploy'
import { createCommand } from './commands/create'
import { sessionCommand } from './commands/session'
import { funlanCommand } from './commands/funlan'
import { memoryCommand } from './commands/memory'
import { immortalizeCommand } from './commands/immortalize'
import { agentInfoCommand } from './commands/agent-info'
import { statusCommand } from './commands/status'

const program = new Command()

program
  .name('clawclick')
  .description('CLI for Claw.Click agents — launch, trade, manage tokens')
  .version('0.1.0')

// Register modular commands
program.addCommand(initCommand())
program.addCommand(deployCommand())
program.addCommand(createCommand())
program.addCommand(sessionCommand())
program.addCommand(funlanCommand())
program.addCommand(memoryCommand())
program.addCommand(immortalizeCommand())
program.addCommand(agentInfoCommand())
program.addCommand(statusCommand())

// ============================================================================
// LAUNCH
// ============================================================================
program
  .command('launch')
  .description('Launch a new token')
  .requiredOption('-n, --name <name>', 'Token name')
  .requiredOption('-s, --symbol <symbol>', 'Token symbol')
  .requiredOption('-b, --beneficiary <address>', 'Beneficiary address for fees')
  .option('-m, --mcap <eth>', 'Target MCAP in ETH (default: 1)', '1')
  .option('-a, --agent <address>', 'Agent wallet address (defaults to signer)')
  .option('-T, --type <type>', 'Launch type: "direct" (hookless, Uniswap) or "agent" (hook-based)', 'agent')
  .option('-e, --bootstrap <eth>', 'Bootstrap ETH to seed liquidity (default: 0.001)', '0.001')
  .option('--fee-wallets <addresses>', 'Comma-separated fee split wallet addresses')
  .option('--fee-pcts <percentages>', 'Comma-separated fee split percentages (must match wallets)')
  .action(async (opts) => {
    try {
      const sdk = createSDK()
      const launchType = opts.type === 'direct' ? 'direct' : 'agent'
      console.log(`🦞 Launching token: ${opts.name} (${opts.symbol})`)
      console.log(`   Type:        ${launchType.toUpperCase()} ${launchType === 'direct' ? '(hookless — tradeable on Uniswap)' : '(hook-based — epoch/tax/graduation)'}`)
      console.log(`   Beneficiary: ${opts.beneficiary}`)
      console.log(`   Target MCAP: ${opts.mcap} ETH`)
      console.log(`   Bootstrap:   ${opts.bootstrap} ETH`)
      console.log(`   Signer: ${sdk.address}`)

      let feeSplit: { wallets: Address[]; percentages: number[] } | undefined
      if (opts.feeWallets) {
        const wallets = opts.feeWallets.split(',').map((w: string) => w.trim() as Address)
        const pcts = (opts.feePcts || '').split(',').map((p: string) => parseInt(p.trim()))
        if (wallets.length !== pcts.length) {
          throw new Error('Fee wallets and percentages count must match')
        }
        feeSplit = { wallets, percentages: pcts }
      }

      const result = await sdk.launch({
        name: opts.name,
        symbol: opts.symbol,
        beneficiary: opts.beneficiary as Address,
        agentWallet: opts.agent as Address | undefined,
        targetMcapETH: opts.mcap,
        bootstrapETH: opts.bootstrap,
        feeSplit,
        launchType,
      })

      console.log(`\n✅ Token launched!`)
      console.log(`   Token: ${result.tokenAddress}`)
      console.log(`   Pool ID: ${result.poolId}`)
      console.log(`   Type: ${result.launchType.toUpperCase()}`)
      console.log(`   TX: ${result.txHash}`)
    } catch (err: any) {
      console.error(`\n❌ Launch failed: ${err.message}`)
      process.exit(1)
    }
  })

// ============================================================================
// BUY
// ============================================================================
program
  .command('buy')
  .description('Buy tokens with ETH')
  .requiredOption('-t, --token <address>', 'Token address')
  .requiredOption('-a, --amount <eth>', 'Amount of ETH to spend')
  .option('--slippage <bps>', 'Slippage tolerance in bps (default: 500)', '500')
  .action(async (opts) => {
    try {
      const sdk = createSDK()
      console.log(`🛒 Buying ${opts.token} with ${opts.amount} ETH...`)

      const txHash = await sdk.buy(
        opts.token as Address,
        opts.amount,
        parseInt(opts.slippage)
      )

      console.log(`✅ Buy submitted! TX: ${txHash}`)

      const receipt = await sdk.publicClient.waitForTransactionReceipt({ hash: txHash })
      console.log(`   Status: ${receipt.status === 'success' ? '✅ Success' : '❌ Failed'}`)
      console.log(`   Gas used: ${receipt.gasUsed}`)
    } catch (err: any) {
      console.error(`\n❌ Buy failed: ${err.message}`)
      process.exit(1)
    }
  })

// ============================================================================
// SELL
// ============================================================================
program
  .command('sell')
  .description('Sell tokens for ETH')
  .requiredOption('-t, --token <address>', 'Token address')
  .requiredOption('-a, --amount <tokens>', 'Amount of tokens to sell (or "all")')
  .option('--slippage <bps>', 'Slippage tolerance in bps (default: 500)', '500')
  .action(async (opts) => {
    try {
      const sdk = createSDK()
      console.log(`💰 Selling ${opts.amount === 'all' ? 'ALL' : opts.amount} of ${opts.token}...`)

      const txHash = await sdk.sell(
        opts.token as Address,
        opts.amount,
        parseInt(opts.slippage)
      )

      console.log(`✅ Sell submitted! TX: ${txHash}`)

      const receipt = await sdk.publicClient.waitForTransactionReceipt({ hash: txHash })
      console.log(`   Status: ${receipt.status === 'success' ? '✅ Success' : '❌ Failed'}`)
      console.log(`   Gas used: ${receipt.gasUsed}`)
    } catch (err: any) {
      console.error(`\n❌ Sell failed: ${err.message}`)
      process.exit(1)
    }
  })

// ============================================================================
// UPLOAD IMAGES
// ============================================================================
program
  .command('upload')
  .description('Upload logo and/or banner for a token you own')
  .requiredOption('-t, --token <address>', 'Token address')
  .option('-l, --logo <path>', 'Path to logo image')
  .option('-b, --banner <path>', 'Path to banner image')
  .action(async (opts) => {
    try {
      if (!opts.logo && !opts.banner) {
        console.error('❌ Provide at least --logo or --banner')
        process.exit(1)
      }

      const sdk = createSDK()
      console.log(`📸 Uploading images for ${opts.token}...`)

      const result = await sdk.uploadImages(opts.token as Address, {
        logoPath: opts.logo,
        bannerPath: opts.banner,
      })

      console.log(`✅ Upload complete!`)
      if (result.logo_url) console.log(`   Logo:   ${result.logo_url}`)
      if (result.banner_url) console.log(`   Banner: ${result.banner_url}`)
    } catch (err: any) {
      console.error(`\n❌ Upload failed: ${err.message}`)
      process.exit(1)
    }
  })

// ============================================================================
// CLAIM FEES
// ============================================================================
program
  .command('claim')
  .description('Claim accumulated fees')
  .option('-b, --beneficiary <address>', 'Beneficiary address (defaults to agent wallet)')
  .option('-t, --token <address>', 'Token address (for token fees — omit for ETH fees)')
  .action(async (opts) => {
    try {
      const sdk = createSDK()
      const beneficiary = (opts.beneficiary || sdk.address) as Address

      if (opts.token) {
        console.log(`💎 Claiming token fees for ${beneficiary}...`)
        const txHash = await sdk.claimFeesToken(opts.token as Address, beneficiary)
        console.log(`✅ Claimed! TX: ${txHash}`)
      } else {
        console.log(`💰 Claiming ETH fees for ${beneficiary}...`)
        const txHash = await sdk.claimFeesETH(beneficiary)
        console.log(`✅ Claimed! TX: ${txHash}`)
      }
    } catch (err: any) {
      console.error(`\n❌ Claim failed: ${err.message}`)
      process.exit(1)
    }
  })

// ============================================================================
// INFO — token details from on-chain + API
// ============================================================================
program
  .command('info')
  .description('Get token info (on-chain + API)')
  .requiredOption('-t, --token <address>', 'Token address')
  .action(async (opts) => {
    try {
      const sdk = createSDK()
      const token = opts.token as Address

      console.log(`\n🔍 Token Info: ${token}\n`)

      // On-chain data
      const info = await sdk.getTokenInfo(token)
      const isDirect = info.launchType === 'direct'

      console.log(`   Name:         ${info.name}`)
      console.log(`   Symbol:       ${info.symbol}`)
      console.log(`   Launch Type:  ${info.launchType.toUpperCase()} ${isDirect ? '(hookless — Uniswap)' : '(hook-based)'}`)
      console.log(`   Creator:      ${info.creator}`)
      console.log(`   Beneficiary:  ${info.beneficiary}`)
      console.log(`   Agent Wallet: ${info.agentWallet}`)
      console.log(`   Pool ID:      ${info.poolId}`)
      console.log(`   Target MCAP:  ${formatEther(info.targetMcapETH)} ETH`)

      if (!isDirect) {
        // AGENT-specific: epoch/tax/limits/graduation
        const [progress, tax, limits, graduated] = await Promise.all([
          sdk.getPoolProgress(token),
          sdk.getCurrentTax(token),
          sdk.getCurrentLimits(token),
          sdk.isGraduated(token),
        ])
        console.log(`   Epoch:        ${progress.currentEpoch}`)
        console.log(`   Position:     ${progress.currentPosition}`)
        console.log(`   Tax:          ${Number(tax) / 100}%`)
        console.log(`   Max TX:       ${formatEther(limits.maxTx)} tokens`)
        console.log(`   Max Wallet:   ${formatEther(limits.maxWallet)} tokens`)
        console.log(`   Graduated:    ${graduated ? '✅ Yes' : '❌ No'}`)
      } else {
        console.log(`   Fee:          1% LP fee (no dynamic tax)`)
        console.log(`   Limits:       None (hookless)`)
        console.log(`   Tradeable:    Uniswap UI + SDK`)
      }

      // API data
      try {
        const apiData = await sdk.getTokenFromAPI(token)
        console.log(`\n   📊 Backend Data:`)
        console.log(`   Price:      ${apiData.current_price || 'N/A'} ETH`)
        console.log(`   MCAP:       ${apiData.current_mcap || 'N/A'} ETH`)
        console.log(`   Vol 24h:    ${apiData.volume_24h} ETH`)
        console.log(`   Vol Total:  ${apiData.volume_total} ETH`)
        if (apiData.logo_url) console.log(`   Logo:       ${apiData.logo_url}`)
        if (apiData.banner_url) console.log(`   Banner:     ${apiData.banner_url}`)
        if (apiData.recentSwaps?.length > 0) {
          console.log(`\n   📈 Recent Swaps (last ${apiData.recentSwaps.length}):`)
          for (const swap of apiData.recentSwaps.slice(0, 5)) {
            const dir = swap.is_buy ? '🟢 BUY ' : '🔴 SELL'
            console.log(`     ${dir}  ${swap.amount_in} → ${swap.amount_out}  (${swap.trader.slice(0, 8)}...)`)
          }
        }
      } catch {
        console.log(`\n   ⚠️  Backend API unavailable`)
      }
    } catch (err: any) {
      console.error(`\n❌ Info failed: ${err.message}`)
      process.exit(1)
    }
  })

// ============================================================================
// BALANCE
// ============================================================================
program
  .command('balance')
  .description('Check token and ETH balances')
  .option('-t, --token <address>', 'Token address (omit for ETH only)')
  .action(async (opts) => {
    try {
      const sdk = createSDK()
      console.log(`\n💼 Wallet: ${sdk.address}\n`)

      const ethBal = await sdk.getETHBalance()
      console.log(`   ETH: ${formatEther(ethBal)}`)

      if (opts.token) {
        const tokenBal = await sdk.getTokenBalance(opts.token as Address)
        const symbol = await sdk.publicClient.readContract({
          address: opts.token as Address,
          abi: [{ name: 'symbol', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ name: '', type: 'string' }] }] as const,
          functionName: 'symbol',
        })
        console.log(`   ${symbol}: ${formatEther(tokenBal)}`)
      }
    } catch (err: any) {
      console.error(`\n❌ Balance failed: ${err.message}`)
      process.exit(1)
    }
  })

// ============================================================================
// LIST — list tokens from API
// ============================================================================
program
  .command('list')
  .description('List tokens from the API')
  .option('-s, --sort <sort>', 'Sort: new, hot, mcap, volume (default: new)', 'new')
  .option('-l, --limit <n>', 'Number of tokens (default: 10)', '10')
  .option('-q, --search <query>', 'Search by name/symbol/address')
  .action(async (opts) => {
    try {
      const sdk = createSDK()
      const { tokens, total } = await sdk.listTokens({
        sort: opts.sort as any,
        limit: parseInt(opts.limit),
        search: opts.search,
      })

      console.log(`\n🦞 Tokens (${tokens.length} of ${total}) sorted by ${opts.sort}:\n`)

      for (const t of tokens) {
        const grad = t.graduated ? '🎓' : '🔄'
        const mcap = t.current_mcap ? `${parseFloat(t.current_mcap).toFixed(4)} ETH` : 'N/A'
        console.log(`  ${grad} ${t.symbol.padEnd(8)} ${t.name.padEnd(20)} MCAP: ${mcap.padEnd(14)} Vol24h: ${parseFloat(t.volume_24h).toFixed(4)} ETH`)
      }
    } catch (err: any) {
      console.error(`\n❌ List failed: ${err.message}`)
      process.exit(1)
    }
  })

// ============================================================================
// TRENDING
// ============================================================================
program
  .command('trending')
  .description('Show trending tokens')
  .action(async () => {
    try {
      const sdk = createSDK()
      const tokens = await sdk.getTrending()

      console.log(`\n🔥 Trending Tokens:\n`)

      for (let i = 0; i < tokens.length; i++) {
        const t = tokens[i]
        const mcap = t.current_mcap ? `${parseFloat(t.current_mcap).toFixed(4)} ETH` : 'N/A'
        console.log(`  ${i + 1}. ${t.symbol.padEnd(8)} ${t.name.padEnd(20)} MCAP: ${mcap.padEnd(14)} Vol24h: ${parseFloat(t.volume_24h).toFixed(4)} ETH`)
      }
    } catch (err: any) {
      console.error(`\n❌ Trending failed: ${err.message}`)
      process.exit(1)
    }
  })

// ============================================================================
// STATS
// ============================================================================
program
  .command('stats')
  .description('Show platform stats')
  .action(async () => {
    try {
      const sdk = createSDK()
      const s = await sdk.getStats()

      console.log(`\n📊 Claw.Click Platform Stats\n`)
      console.log(`   Total Tokens:     ${s.total_tokens}`)
      console.log(`   Total Volume:     ${s.total_volume_eth} ETH`)
      console.log(`   Volume 24h:       ${s.total_volume_24h} ETH`)
      console.log(`   Total TXs:        ${s.total_txs}`)
      console.log(`   TXs 24h:          ${s.total_txs_24h}`)
      console.log(`   Last Updated:     ${s.updated_at}`)
    } catch (err: any) {
      console.error(`\n❌ Stats failed: ${err.message}`)
      process.exit(1)
    }
  })

program.parse()
