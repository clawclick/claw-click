/**
 * `clawclick status` — Show current config & deployment status
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { findConfig, loadConfig } from '../../wallet'
import { generateFunlanGrid, hasLobster } from '../../funlan'

export function statusCommand(): Command {
  const cmd = new Command('status')
    .description('Show current agent config and deployment status')
    .action(async () => {
      const configPath = findConfig()

      if (!configPath) {
        console.log(chalk.yellow('No clawclick.json found'))
        console.log(chalk.dim('  Run `clawclick init` to create a new agent'))
        return
      }

      const config = loadConfig(configPath)

      console.log(chalk.bold(`${config.name} ($${config.symbol})`))
      console.log('')

      // Config info
      console.log(chalk.dim('Config:') + ` ${configPath}`)
      console.log(chalk.dim('Network:') + ` ${config.network}`)
      console.log(chalk.dim('Created:') + ` ${new Date(config.createdAt).toLocaleString()}`)
      console.log('')

      // Wallets
      console.log(chalk.bold('Wallets:'))
      console.log(`  Agent:   ${chalk.cyan(config.agentWallet)}`)
      if (config.creatorWallet) {
        console.log(`  Creator: ${chalk.cyan(config.creatorWallet)}`)
      }
      console.log('')

      // Deployment status
      console.log(chalk.bold('Deployment:'))
      if (config.tokenAddress) {
        console.log(`  Token:   ${chalk.green('✔')} ${chalk.cyan(config.tokenAddress)}`)
      } else {
        console.log(`  Token:   ${chalk.yellow('○')} Not deployed`)
      }
      if (config.nftId) {
        console.log(`  NFT:     ${chalk.green('✔')} #${config.nftId}`)
      } else {
        console.log(`  NFT:     ${chalk.yellow('○')} Not minted`)
      }
      if (config.memoryCID) {
        console.log(`  Memory:  ${chalk.green('✔')} ${config.memoryCID}`)
      } else {
        console.log(`  Memory:  ${chalk.dim('○')} No memory uploaded`)
      }
      console.log('')

      // Tokenomics
      console.log(chalk.bold('Tokenomics:'))
      console.log(`  Starting MCap: ${config.startingMcap} ETH`)
      console.log(`  Dev Buy:       ${config.devBuyPercent}%`)
      if (config.taxWallets && config.taxWallets.length > 0) {
        console.log(`  Tax Splits:`)
        for (let i = 0; i < config.taxWallets.length; i++) {
          if (config.taxWallets[i]) {
            console.log(`    ${config.taxPercentages[i]}% → ${chalk.dim(config.taxWallets[i])}`)
          }
        }
      }
      console.log('')

      // FUNLAN
      const grid = generateFunlanGrid(config.agentWallet)
      console.log(chalk.bold('FUNLAN:'))
      for (const row of grid.grid) {
        console.log('  ' + row.join(' '))
      }
      if (hasLobster(config.agentWallet)) {
        console.log(chalk.yellow('  🦞 Has lobster!'))
      }

      // Next steps
      console.log('')
      if (!config.tokenAddress) {
        console.log(chalk.dim('Next: Fund the agent wallet with ETH, then run `clawclick deploy`'))
      } else if (!config.memoryCID) {
        console.log(chalk.dim('Next: Upload memory with `clawclick memory upload <file>`'))
      } else {
        console.log(chalk.dim(`View: https://claw.click/agent/${config.agentWallet}`))
      }
    })

  return cmd
}
