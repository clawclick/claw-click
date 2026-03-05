/**
 * ClawClick SDK — Wallet utilities
 *
 * Generate agent wallets, load from private key, config file management.
 */

import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient, type Chain } from 'viem';
import { sepolia, base } from 'viem/chains';
import * as fs from 'fs';
import * as path from 'path';
import type { Network } from './contracts';

export interface AgentConfig {
  name: string;
  symbol: string;
  network: Network;
  agentWallet: `0x${string}`;
  agentPrivateKey: `0x${string}`;
  creatorWallet?: `0x${string}`;
  creatorPrivateKey?: `0x${string}`;
  startingMcap: number;
  devBuyPercent: number;
  taxWallets: string[];
  taxPercentages: number[];
  tokenAddress?: `0x${string}`;
  nftId?: number;
  memoryCID?: string;
  createdAt: string;
}

const CONFIG_FILENAME = 'clawclick.json';

/** Generate a fresh random agent wallet */
export function generateAgentWallet(): { address: `0x${string}`; privateKey: `0x${string}` } {
  const key = generatePrivateKey();
  const account = privateKeyToAccount(key);
  return { address: account.address, privateKey: key };
}

/** Load account from private key */
export function loadAccount(privateKey: `0x${string}`) {
  return privateKeyToAccount(privateKey);
}

/** Get the chain object for a network */
export function getChain(network: Network): Chain {
  return network === 'base' ? base : sepolia;
}

/** Create a public client for reading chain state */
export function createReader(network: Network, rpcUrl?: string): PublicClient {
  const chain = getChain(network);
  const defaultRpc = network === 'base'
    ? 'https://mainnet.base.org'
    : 'https://rpc.sepolia.org';
  return createPublicClient({ chain, transport: http(rpcUrl || defaultRpc) });
}

/** Create a wallet client for writing transactions */
export function createWriter(privateKey: `0x${string}`, network: Network, rpcUrl?: string): WalletClient {
  const chain = getChain(network);
  const account = privateKeyToAccount(privateKey);
  const defaultRpc = network === 'base'
    ? 'https://mainnet.base.org'
    : 'https://rpc.sepolia.org';
  return createWalletClient({ account, chain, transport: http(rpcUrl || defaultRpc) });
}

// ── Config file management ──

/** Find config file walking up from cwd */
export function findConfig(startDir?: string): string | null {
  let dir = startDir || process.cwd();
  while (true) {
    const configPath = path.join(dir, CONFIG_FILENAME);
    if (fs.existsSync(configPath)) return configPath;
    const parent = path.dirname(dir);
    if (parent === dir) return null; // root
    dir = parent;
  }
}

/** Load agent config from file */
export function loadConfig(configPath?: string): AgentConfig {
  const p = configPath || findConfig();
  if (!p) throw new Error(`No ${CONFIG_FILENAME} found. Run \`clawclick init\` first.`);
  const raw = fs.readFileSync(p, 'utf-8');
  return JSON.parse(raw) as AgentConfig;
}

/** Save agent config to file */
export function saveConfig(config: AgentConfig, dir?: string): string {
  const targetDir = dir || process.cwd();
  const configPath = path.join(targetDir, CONFIG_FILENAME);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  return configPath;
}
