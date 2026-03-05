/**
 * `clawclick funlan` — Generate and display FUNLAN emoji grid
 *
 * Uses the agent wallet to derive a deterministic 5×5 emoji grid.
 */

import { Command } from 'commander'
import chalk from 'chalk'
import * as fs from 'fs'
import * as path from 'path'
import { generateFunlanGrid, hasLobster, toFunlanMarkdown } from '../../funlan'
import { loadConfig, findConfig } from '../../wallet'

export function funlanCommand(): Command {
  const cmd = new Command('funlan')
    .description('Generate or display FUNLAN emoji grid')

  // ── generate (from wallet) ──
  cmd
    .command('generate')
    .alias('gen')
    .description('Generate FUNLAN.md from agent wallet')
    .option('--wallet <address>', 'Wallet address (defaults to config agent wallet)')
    .option('-o, --output <file>', 'Output file', 'FUNLAN.md')
    .action(async (opts) => {
      let wallet = opts.wallet as `0x${string}`

      if (!wallet) {
        try {
          const config = loadConfig()
          wallet = config.agentWallet
        } catch {
          console.log(chalk.red('No wallet specified and no clawclick.json found'))
          console.log(chalk.dim('  Use --wallet <address> or run `clawclick init` first'))
          process.exit(1)
        }
      }

      const grid = generateFunlanGrid(wallet)
      const markdown = toFunlanMarkdown(wallet)

      console.log(chalk.bold('FUNLAN Grid:'))
      console.log('')
      for (const row of grid.grid) {
        console.log('  ' + row.join(' '))
      }
      console.log('')

      if (hasLobster(wallet)) {
        console.log(chalk.yellow('🦞 This wallet has a LOBSTER! Rare find!'))
      }

      // Write file
      const outPath = path.resolve(opts.output)
      fs.writeFileSync(outPath, markdown)
      console.log(chalk.green(`✔ Written to ${path.basename(outPath)}`))
    })

  // ── show (display from config) ──
  cmd
    .command('show')
    .description('Display FUNLAN grid for current agent')
    .action(async () => {
      try {
        const config = loadConfig()
        const grid = generateFunlanGrid(config.agentWallet)
        console.log(chalk.bold(`FUNLAN Grid for ${config.name}:`))
        console.log('')
        for (const row of grid.grid) {
          console.log('  ' + row.join(' '))
        }
        console.log('')
        console.log(chalk.dim(`Wallet: ${config.agentWallet}`))
        if (hasLobster(config.agentWallet)) {
          console.log(chalk.yellow('🦞 This agent has a LOBSTER!'))
        }
      } catch (err: any) {
        console.log(chalk.red(err.message))
        process.exit(1)
      }
    })

  // Default action (no subcommand) — show grid
  cmd.action(async () => {
    try {
      const config = loadConfig()
      const grid = generateFunlanGrid(config.agentWallet)
      for (const row of grid.grid) {
        console.log('  ' + row.join(' '))
      }
    } catch {
      console.log(chalk.dim('Run `clawclick funlan generate --wallet <address>` or `clawclick init` first'))
    }
  })

  return cmd
}
