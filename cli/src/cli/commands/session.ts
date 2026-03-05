/**
 * `clawclick session` — Manage GPU compute sessions
 *
 * Subcommands:
 *   estimate   — Get pricing estimate
 *   create     — Spin up a compute session
 *   list       — List all sessions
 *   get <id>   — Get session details
 *   delete <id> — Terminate a session
 *   chat <id>  — Interactive chat with a running session
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import { loadConfig } from '../../wallet'
import { ClawClickApiClient } from '../../api'
import * as readline from 'readline'

function getClient(): ClawClickApiClient {
  return new ClawClickApiClient()
}

export function sessionCommand(): Command {
  const cmd = new Command('session')
    .description('Manage GPU compute sessions')

  // ── estimate ──
  cmd
    .command('estimate')
    .description('Estimate session cost')
    .option('--gpu <type>', 'GPU type (e.g. RTX_4090)', 'RTX_4090')
    .option('--num-gpus <n>', 'Number of GPUs', '1')
    .option('--cpu <cores>', 'CPU cores', '4')
    .option('--memory <gb>', 'Memory in GB', '16')
    .option('--disk <gb>', 'Disk in GB', '32')
    .option('--hours <h>', 'Duration in hours', '1')
    .action(async (opts) => {
      const spinner = ora('Fetching estimate...').start()
      try {
        const client = getClient()
        const estimate = await client.estimateSession({
          gpuType: opts.gpu,
          numGpus: parseInt(opts.numGpus),
          cpuCores: parseInt(opts.cpu),
          memoryGb: parseInt(opts.memory),
          diskGb: parseInt(opts.disk),
          durationHours: parseFloat(opts.hours),
        })
        spinner.succeed('Estimate received')
        console.log('')
        const top = estimate.offers?.[0]
        console.log(`  Cost/hour:  ${chalk.cyan('$' + (top?.costPerHour?.toFixed(4) || 'N/A'))}`)
        console.log(`  Total cost: ${chalk.bold.cyan('$' + (top?.totalCost?.toFixed(4) || 'N/A'))}`)
        console.log(`  GPU:        ${top?.gpuName || opts.gpu}`)
        console.log(`  Duration:   ${opts.hours}h`)
      } catch (err: any) {
        spinner.fail('Estimate failed')
        console.error(chalk.red(err.message))
      }
    })

  // ── create ──
  cmd
    .command('create')
    .description('Create a new compute session')
    .option('--hours <h>', 'Duration in hours', '1')
    .option('--gpu <type>', 'GPU type', 'RTX_4090')
    .option('--num-gpus <n>', 'Number of GPUs', '1')
    .option('--cpu <cores>', 'CPU cores', '4')
    .option('--memory <gb>', 'Memory in GB', '16')
    .option('--disk <gb>', 'Disk in GB', '32')
    .option('--payment-tx <hash>', 'Payment transaction hash (required)')
    .option('--openai-key <key>', 'OpenAI API key for the session')
    .option('--anthropic-key <key>', 'Anthropic API key for the session')
    .action(async (opts) => {
      const config = loadConfig()

      if (!opts.paymentTx) {
        // Show payment info
        const client = getClient()
        const payment = await client.getPaymentInfo()
        console.log(chalk.yellow('Payment required before creating a session.'))
        console.log(`  Send ETH to: ${chalk.cyan(payment.treasuryAddress)}`)
        console.log(`  Then run: clawclick session create --payment-tx <hash> --hours ${opts.hours}`)
        return
      }

      const spinner = ora('Creating compute session...').start()
      try {
        const client = getClient()
        const apiKeys: Record<string, string> = {}
        if (opts.openaiKey) apiKeys.openai = opts.openaiKey
        if (opts.anthropicKey) apiKeys.anthropic = opts.anthropicKey

        const session = await client.createSession({
          agentAddress: config.agentWallet,
          nftId: config.nftId,
          userAddress: config.creatorWallet || config.agentWallet,
          cpuCores: parseInt(opts.cpu),
          memoryGb: parseInt(opts.memory),
          gpuType: opts.gpu,
          numGpus: parseInt(opts.numGpus),
          durationHours: parseFloat(opts.hours),
          diskGb: parseInt(opts.disk),
          paymentTx: opts.paymentTx,
          apiKeys: Object.keys(apiKeys).length > 0 ? apiKeys : undefined,
        })

        spinner.succeed(`Session created: #${chalk.cyan(session.sessionId)}`)
        console.log(`  Status:  ${session.status}`)
        console.log(`  GPU:     ${session.gpu}`)
        console.log(`  Expires: ${new Date(session.expiresAt * 1000).toLocaleString()}`)
        console.log('')
        console.log(chalk.dim(`Chat: clawclick session chat ${session.sessionId}`))
      } catch (err: any) {
        spinner.fail('Session creation failed')
        console.error(chalk.red(err.message))
      }
    })

  // ── list ──
  cmd
    .command('list')
    .description('List all sessions for this agent')
    .action(async () => {
      const config = loadConfig()
      const spinner = ora('Fetching sessions...').start()
      try {
        const client = getClient()
        const sessions = await client.listSessions({ agent: config.agentWallet })
        spinner.succeed(`${sessions.length} session(s)`)
        if (sessions.length === 0) {
          console.log(chalk.dim('  No sessions found'))
          return
        }
        for (const s of sessions) {
          const status = s.isActive ? chalk.green('● active') : (s.isExpired ? chalk.red('○ expired') : chalk.yellow('○ ' + s.status))
          console.log(`  #${s.id} ${status} — ${s.gpuType || 'CPU'} — ${new Date(s.createdAt * 1000).toLocaleDateString()}`)
        }
      } catch (err: any) {
        spinner.fail('Failed to list sessions')
        console.error(chalk.red(err.message))
      }
    })

  // ── get ──
  cmd
    .command('get <id>')
    .description('Get session details')
    .action(async (id: string) => {
      const spinner = ora('Fetching session...').start()
      try {
        const client = getClient()
        const s = await client.getSession(parseInt(id))
        spinner.succeed(`Session #${id}`)
        console.log(`  Status:    ${s.isActive ? chalk.green('active') : chalk.red(s.status)}`)
        console.log(`  Agent:     ${s.agentName}`)
        console.log(`  GPU:       ${s.gpuType} × ${s.numGpus}`)
        console.log(`  CPU:       ${s.cpuCores} cores / ${s.memoryGb} GB RAM`)
        console.log(`  Cost/hr:   $${s.costPerHour?.toFixed(4)}`)
        console.log(`  Created:   ${new Date(s.createdAt * 1000).toLocaleString()}`)
        console.log(`  Expires:   ${new Date(s.expiresAt * 1000).toLocaleString()}`)
      } catch (err: any) {
        spinner.fail('Failed to get session')
        console.error(chalk.red(err.message))
      }
    })

  // ── delete ──
  cmd
    .command('delete <id>')
    .description('Terminate and delete a session')
    .action(async (id: string) => {
      const spinner = ora('Deleting session...').start()
      try {
        const client = getClient()
        await client.deleteSession(parseInt(id))
        spinner.succeed(`Session #${id} terminated`)
      } catch (err: any) {
        spinner.fail('Failed to delete session')
        console.error(chalk.red(err.message))
      }
    })

  // ── chat ──
  cmd
    .command('chat <id>')
    .description('Interactive chat with a compute session')
    .action(async (id: string) => {
      const client = getClient()
      const sessionId = parseInt(id)

      console.log(chalk.bold(`Chatting with session #${id}`))
      console.log(chalk.dim('Type a message, or /exit to quit, /history for chat log\n'))

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.cyan('> '),
      })

      rl.prompt()

      rl.on('line', async (line: string) => {
        const input = line.trim()

        if (input === '/exit' || input === '/quit') {
          rl.close()
          return
        }

        if (input === '/history') {
          try {
            const history = await client.getChatHistory(sessionId)
            for (const msg of history) {
              const role = msg.role === 'user' ? chalk.blue('You') : chalk.green('Agent')
              console.log(`${role}: ${msg.content.slice(0, 200)}`)
            }
          } catch (err: any) {
            console.log(chalk.red('Failed to fetch history: ' + err.message))
          }
          rl.prompt()
          return
        }

        if (input === '/new') {
          try {
            await client.newChatSession(sessionId)
            console.log(chalk.green('New chat session started'))
          } catch (err: any) {
            console.log(chalk.red('Failed: ' + err.message))
          }
          rl.prompt()
          return
        }

        if (!input) {
          rl.prompt()
          return
        }

        // Send message and stream response
        try {
          const stream = await client.sendMessage(sessionId, input)
          const reader = stream!.getReader()
          const decoder = new TextDecoder()

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value)
            // Parse SSE
            const lines = chunk.split('\n')
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.content) {
                    process.stdout.write(parsed.content)
                  }
                } catch {
                  // Plain text chunk
                  process.stdout.write(data)
                }
              }
            }
          }
          console.log('') // newline after stream
        } catch (err: any) {
          console.log(chalk.red('Error: ' + err.message))
        }

        rl.prompt()
      })

      rl.on('close', () => {
        console.log(chalk.dim('\nChat ended'))
        process.exit(0)
      })
    })

  return cmd
}
