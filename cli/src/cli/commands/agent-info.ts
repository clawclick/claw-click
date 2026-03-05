/**
 * `clawclick agent-info` — Display on-chain agent information
 *
 * Reads birth certificate and token data from chain.
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig, createReader } from '../../wallet'
import { getAgentByWallet, getTotalAgents, getMemoryCount } from '../../chain'
import { ClawClickApiClient } from '../../api'

export function agentInfoCommand(): Command {
  const cmd = new Command('agent-info')
    .description('Display agent information from on-chain birth certificate data')
    .option('--wallet <address>', 'Agent wallet (defaults to config)')
    .option('--rpc <url>', 'Custom RPC URL')
    .action(async (opts) => {
      let wallet: `0x${string}`
      let network: 'sepolia' | 'base' = 'sepolia'

      if (opts.wallet) {
        wallet = opts.wallet as `0x${string}`
      } else {
        try {
          const config = loadConfig()
          wallet = config.agentWallet
          network = config.network
        } catch {
          console.log(chalk.red('No wallet specified and no clawclick.json found'))
          process.exit(1)
        }
      }

      const spinner = ora('Fetching on-chain data...').start()

      try {
        const client = createReader(network, opts.rpc)
        const agent = await getAgentByWallet(client, network, wallet)

        if (!agent) {
          spinner.fail('No agent found for this wallet')
          console.log(chalk.dim(`  Wallet: ${wallet}`))
          console.log(chalk.dim('  Has the birth certificate been minted?'))
          return
        }

        spinner.succeed('Agent found on-chain')
        console.log('')
        console.log(chalk.bold(agent.name))
        console.log(`  NFT ID:        #${agent.nftId.toString()}`)
        console.log(`  Wallet:        ${chalk.cyan(agent.wallet)}`)
        console.log(`  Creator:       ${chalk.dim(agent.creator)}`)
        console.log(`  Token:         ${agent.tokenAddress !== '0x0000000000000000000000000000000000000000' ? chalk.cyan(agent.tokenAddress) : chalk.dim('none')}`)
        console.log(`  Born:          ${new Date(Number(agent.birthTimestamp) * 1000).toLocaleString()}`)
        console.log(`  Immortalized:  ${agent.immortalized ? chalk.green('yes') : 'no'}`)
        if (agent.memoryCID) console.log(`  Memory CID:    ${chalk.dim(agent.memoryCID)}`)
        if (agent.socialHandle) console.log(`  Social:        ${agent.socialHandle}`)
        if (agent.ensName) console.log(`  ENS:           ${agent.ensName}`)

        // Memory count
        try {
          const memCount = await getMemoryCount(client, network, agent.wallet)
          console.log(`  Memories:      ${memCount.toString()}`)
        } catch { /* memory storage might not be deployed */ }

        // Token stats from API
        if (agent.tokenAddress && agent.tokenAddress !== '0x0000000000000000000000000000000000000000') {
          try {
            const api = new ClawClickApiClient()
            const stats = await api.getTokenStats(agent.tokenAddress)
            console.log('')
            console.log(chalk.bold('Token Stats:'))
            if (stats.token?.current_price) console.log(`  Price:       ${stats.token.current_price} ETH`)
            if (stats.token?.current_mcap) console.log(`  Market Cap:  ${stats.token.current_mcap} ETH`)
            if (stats.token?.volume_24h) console.log(`  Volume 24h:  ${stats.token.volume_24h} ETH`)
          } catch { /* API might be down */ }
        }

        console.log('')
        console.log(chalk.dim(`View: https://claw.click/agent/${wallet}`))
      } catch (err: any) {
        spinner.fail('Failed to fetch agent info')
        console.error(chalk.red(err.message))
      }
    })

  return cmd
}
