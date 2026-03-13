/**
 * `clawclick upload-memory` — Upload agent memory files to IPFS via Pinata
 *
 * Returns a CID that can be used when launching agents (direct or agent launches).
 *
 * Usage:
 *   clawclick upload-memory <file...>
 *   clawclick upload-memory memory.txt personality.md --name "My Agent Memory"
 */

import { Command } from 'commander'
import chalk from 'chalk'
import ora from 'ora'
import * as fs from 'fs'
import * as path from 'path'
import FormData from 'form-data'

const PINATA_API_URL = 'https://api.pinata.cloud/pinning/pinFileToIPFS'

function getPinataJwt(): string {
  const jwt = process.env.PINATA_JWT
  if (!jwt) {
    console.error(chalk.red('PINATA_JWT environment variable is required'))
    console.log(chalk.dim('  Set it via: export PINATA_JWT="your-jwt-token"'))
    console.log(chalk.dim('  Get a JWT from https://app.pinata.cloud/developers/api-keys'))
    process.exit(1)
  }
  return jwt
}

export function uploadMemoryCommand(): Command {
  const cmd = new Command('upload-memory')
    .description('Upload memory files to IPFS and get a CID for agent launches')
    .argument('<files...>', 'One or more file paths to upload')
    .option('--name <name>', 'Name for the IPFS pin (metadata)')
    .option('--json', 'Output only the CID (for scripting)')
    .action(async (files: string[], opts) => {
      const jwt = getPinataJwt()

      // Validate all files exist before uploading
      const resolvedFiles: { path: string; name: string }[] = []
      for (const f of files) {
        const resolved = path.resolve(f)
        if (!fs.existsSync(resolved)) {
          console.error(chalk.red(`File not found: ${resolved}`))
          process.exit(1)
        }
        const stat = fs.statSync(resolved)
        if (stat.isDirectory()) {
          console.error(chalk.red(`Directories not supported, specify individual files: ${resolved}`))
          process.exit(1)
        }
        resolvedFiles.push({ path: resolved, name: path.basename(resolved) })
      }

      if (!opts.json) {
        console.log(chalk.cyan(`\n📦 Uploading ${resolvedFiles.length} file(s) to IPFS...\n`))
        for (const f of resolvedFiles) {
          const size = fs.statSync(f.path).size
          console.log(`  ${chalk.dim('•')} ${f.name} ${chalk.dim(`(${formatBytes(size)})`)}`)
        }
        console.log()
      }

      const spinner = opts.json ? null : ora('Uploading to Pinata IPFS...').start()

      try {
        const form = new FormData()

        // If single file, upload directly; if multiple, Pinata wraps them in a directory
        if (resolvedFiles.length === 1) {
          const f = resolvedFiles[0]
          form.append('file', fs.createReadStream(f.path), { filename: f.name })
        } else {
          // Multiple files — wrap in a directory
          for (const f of resolvedFiles) {
            form.append('file', fs.createReadStream(f.path), {
              filepath: `memory/${f.name}`,
            })
          }
        }

        // Pinata metadata
        const pinName = opts.name || `Agent Memory - ${new Date().toISOString().split('T')[0]}`
        const metadata = JSON.stringify({
          name: pinName,
          keyvalues: {
            type: 'agent-memory',
            timestamp: Date.now().toString(),
            fileCount: resolvedFiles.length.toString(),
          },
        })
        form.append('pinataMetadata', metadata)

        // Use CIDv1
        form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

        const res = await fetch(PINATA_API_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwt}`,
            ...form.getHeaders(),
          },
          body: form as any,
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`Pinata upload failed (${res.status}): ${errText}`)
        }

        const data = (await res.json()) as { IpfsHash: string; PinSize: number; Timestamp: string }
        const cid = data.IpfsHash

        if (opts.json) {
          // Machine-readable output
          console.log(cid)
        } else {
          spinner?.succeed('Uploaded to IPFS!')
          console.log()
          console.log(`  ${chalk.bold('CID:')}     ${chalk.green(cid)}`)
          console.log(`  ${chalk.bold('Gateway:')} ${chalk.dim(`https://gateway.pinata.cloud/ipfs/${cid}`)}`)
          console.log(`  ${chalk.bold('Size:')}    ${formatBytes(data.PinSize)}`)
          console.log()
          console.log(chalk.dim('  Use this CID when launching:'))
          console.log(chalk.dim(`    clawclick launch --memory-cid ${cid} ...`))
          console.log()
        }
      } catch (err: any) {
        if (spinner) {
          spinner.fail('Upload failed')
        }
        console.error(chalk.red(err.message))
        process.exit(1)
      }
    })

  return cmd
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
