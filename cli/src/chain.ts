/**
 * ClawClick SDK — On-chain operations
 *
 * Deploy token, mint birth certificate, store memory, read agent data.
 * All operations work with viem — no ethers dependency.
 */

import {
  parseEther,
  decodeEventLog,
  keccak256,
  encodePacked,
  type PublicClient,
  type WalletClient,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  getAddresses,
  BIRTH_CERTIFICATE_ABI,
  LAUNCH_BUNDLER_ABI,
  MEMORY_STORAGE_ABI,
  IMMORTALIZATION_FEE,
  type Network,
} from './contracts';
import { FACTORY_ABI } from './abi';

// ── Constants ──

const MIN_BOOTSTRAP_ETH = '0.001';
const ZERO = '0x0000000000000000000000000000000000000000' as `0x${string}`;

// ── Types ──

export interface CreateLaunchParams {
  name: string;
  symbol: string;
  beneficiary: `0x${string}`;
  agentWallet: `0x${string}`;
  targetMcapETH: number;
  devBuyPercent?: number;
  taxWallets?: `0x${string}`[];
  taxPercentages?: number[]; // whole percentages (0-100)
}

export interface StandaloneLaunchResult {
  txHash: `0x${string}`;
  tokenAddress: `0x${string}`;
  poolId: `0x${string}`;
}

export interface MintResult {
  txHash: `0x${string}`;
  nftId: bigint;
}

export interface LaunchAndMintResult {
  txHash: `0x${string}`;
  tokenAddress: `0x${string}`;
  poolId: `0x${string}`;
  nftId: bigint;
}

export interface AgentOnChain {
  nftId: bigint;
  birthTimestamp: bigint;
  name: string;
  wallet: `0x${string}`;
  tokenAddress: `0x${string}`;
  creator: `0x${string}`;
  socialHandle: string;
  memoryCID: string;
  avatarCID: string;
  ensName: string;
  dnaHash: `0x${string}`;
  immortalized: boolean;
  spawnedAgents: bigint;
}

export interface MemoryEntry {
  timestamp: bigint;
  ipfsCID: string;
  fullText: string;
  contentHash: `0x${string}`;
}

// ── Deploy Functions ──────────────────────────────────────────────────────

/** Standalone: Create token launch via ClawclickFactory */
export async function createStandaloneLaunch(
  publicClient: PublicClient,
  walletClient: WalletClient,
  network: Network,
  params: CreateLaunchParams,
): Promise<StandaloneLaunchResult> {
  const addrs = getAddresses(network);
  if (!addrs.factory) throw new Error(`Factory not deployed on ${network}`);

  // Build fee split arrays — always 5 elements
  const wallets: `0x${string}`[] = [];
  const percentages: number[] = [];

  if (params.taxWallets && params.taxWallets.length > 0) {
    for (let i = 0; i < 5; i++) {
      wallets.push(params.taxWallets[i] || ZERO);
      percentages.push(((params.taxPercentages?.[i] || 0) * 100)); // % → BPS
    }
  } else {
    // Default: 100% to beneficiary
    wallets.push(params.beneficiary, ZERO, ZERO, ZERO, ZERO);
    percentages.push(10000, 0, 0, 0, 0);
  }
  const walletCount = wallets.filter(w => w !== ZERO).length;

  const devBuyAmount = (params.targetMcapETH * (params.devBuyPercent || 0)) / 100;
  const bootstrapValue = Math.max(devBuyAmount, parseFloat(MIN_BOOTSTRAP_ETH));

  const createParams = {
    name: params.name,
    symbol: params.symbol,
    beneficiary: params.beneficiary,
    agentWallet: params.agentWallet,
    targetMcapETH: parseEther(params.targetMcapETH.toString()),
    feeSplit: {
      wallets: wallets as unknown as readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
      percentages: percentages as unknown as readonly [number, number, number, number, number],
      count: walletCount,
    },
    launchType: 0, // DIRECT
  };

  const chain = walletClient.chain;
  const account = walletClient.account!;
  const txHash = await walletClient.writeContract({
    address: addrs.factory,
    abi: FACTORY_ABI,
    functionName: 'createLaunch',
    args: [createParams],
    value: parseEther(bootstrapValue.toString()),
    gas: BigInt(8_000_000),
    chain,
    account,
  });

  // Wait for receipt
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status === 'reverted') {
    throw new Error(`createLaunch reverted. Tx: ${txHash}`);
  }

  // Parse TokenLaunched event
  let tokenAddress: `0x${string}` = ZERO;
  let poolId: `0x${string}` = '0x' as `0x${string}`;

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: FACTORY_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName === 'TokenLaunched') {
        const args = decoded.args as unknown as { token: `0x${string}`; poolId: Hex };
        tokenAddress = args.token;
        poolId = args.poolId;
        break;
      }
    } catch { /* not our event */ }
  }

  // Fallback: read latest token from factory
  if (tokenAddress === ZERO) {
    const count = await publicClient.readContract({
      address: addrs.factory, abi: FACTORY_ABI, functionName: 'getTokenCount',
    }) as bigint;
    tokenAddress = await publicClient.readContract({
      address: addrs.factory, abi: FACTORY_ABI, functionName: 'getTokenAtIndex', args: [count - 1n],
    }) as `0x${string}`;
    try {
      const info = await publicClient.readContract({
        address: addrs.factory, abi: FACTORY_ABI, functionName: 'launchByToken', args: [tokenAddress],
      }) as any;
      poolId = info.poolId || ('0x' as `0x${string}`);
    } catch { /* poolId is optional */ }
  }

  return { txHash, tokenAddress, poolId };
}

/** Mint birth certificate NFT */
export async function mintBirthCertificate(
  publicClient: PublicClient,
  walletClient: WalletClient,
  network: Network,
  params: {
    agentWallet: `0x${string}`;
    tokenAddress: `0x${string}`;
    creator: `0x${string}`;
    name: string;
    memoryCID?: string;
    avatarCID?: string;
    socialHandle?: string;
    ensName?: string;
  },
): Promise<MintResult> {
  const addrs = getAddresses(network);

  const chain = walletClient.chain;
  const account = walletClient.account!;
  const txHash = await walletClient.writeContract({
    address: addrs.birthCertificate,
    abi: BIRTH_CERTIFICATE_ABI,
    functionName: 'mintBirthCertificate',
    args: [
      params.agentWallet,
      params.tokenAddress,
      params.creator,
      params.name,
      params.socialHandle || '',
      params.memoryCID || '',
      params.avatarCID || '',
      params.ensName || '',
    ],
    value: parseEther(IMMORTALIZATION_FEE),
    gas: 500_000n,
    chain,
    account,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status === 'reverted') {
    throw new Error(`mintBirthCertificate reverted. Tx: ${txHash}`);
  }

  // Extract nftId from Transfer event
  let nftId = 0n;
  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const transferLog = receipt.logs.find(
    l => l.topics[0] === transferTopic && l.address.toLowerCase() === addrs.birthCertificate.toLowerCase(),
  );
  if (transferLog?.topics[3]) {
    nftId = BigInt(transferLog.topics[3]);
  }

  return { txHash, nftId };
}

// ── Bundled Deploy (1-tx) ──────────────────────────────────────────────────

/**
 * Launch token + mint birth certificate in ONE transaction via AgentLaunchBundler.
 * msg.value = bootstrapETH + 0.005 ETH (immortalization fee)
 *
 * Falls back to error if bundler is not deployed.
 */
export async function launchAndMint(
  publicClient: PublicClient,
  walletClient: WalletClient,
  network: Network,
  params: CreateLaunchParams & {
    creator: `0x${string}`;
    socialHandle?: string;
    memoryCID?: string;
    avatarCID?: string;
    ensName?: string;
  },
): Promise<LaunchAndMintResult> {
  const addrs = getAddresses(network);
  if (!addrs.bundler) {
    throw new Error(`Bundler not deployed on ${network}. Use createStandaloneLaunch() + mintBirthCertificate() separately.`);
  }

  // Build fee split arrays — always 5 elements
  const wallets: `0x${string}`[] = [];
  const percentages: number[] = [];

  if (params.taxWallets && params.taxWallets.length > 0) {
    for (let i = 0; i < 5; i++) {
      wallets.push(params.taxWallets[i] || ZERO);
      percentages.push(((params.taxPercentages?.[i] || 0) * 100));
    }
  } else {
    wallets.push(params.beneficiary, ZERO, ZERO, ZERO, ZERO);
    percentages.push(10000, 0, 0, 0, 0);
  }
  const walletCount = wallets.filter(w => w !== ZERO).length;

  const devBuyAmount = (params.targetMcapETH * (params.devBuyPercent || 0)) / 100;
  const bootstrapValue = Math.max(devBuyAmount, parseFloat(MIN_BOOTSTRAP_ETH));
  const totalValue = bootstrapValue + parseFloat(IMMORTALIZATION_FEE);

  const createParams = {
    name: params.name,
    symbol: params.symbol,
    beneficiary: params.beneficiary,
    agentWallet: params.agentWallet,
    targetMcapETH: parseEther(params.targetMcapETH.toString()),
    feeSplit: {
      wallets: wallets as unknown as readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
      percentages: percentages as unknown as readonly [number, number, number, number, number],
      count: walletCount,
    },
    launchType: 0, // DIRECT
  };

  const chain = walletClient.chain;
  const account = walletClient.account!;
  const txHash = await walletClient.writeContract({
    address: addrs.bundler,
    abi: LAUNCH_BUNDLER_ABI,
    functionName: 'launchAndMint',
    args: [
      createParams,
      params.agentWallet,
      params.creator,
      params.name,
      params.socialHandle || '',
      params.memoryCID || '',
      params.avatarCID || '',
      params.ensName || '',
    ],
    value: parseEther(totalValue.toString()),
    gas: BigInt(10_000_000),
    chain,
    account,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status === 'reverted') {
    throw new Error(`launchAndMint reverted. Tx: ${txHash}`);
  }

  // Parse AgentLaunchBundled event
  let tokenAddress: `0x${string}` = ZERO;
  let poolId: `0x${string}` = '0x' as `0x${string}`;
  let nftId = 0n;

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: LAUNCH_BUNDLER_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName === 'AgentLaunchBundled') {
        const args = decoded.args as unknown as {
          token: `0x${string}`;
          nftId: bigint;
          poolId: Hex;
          creator: `0x${string}`;
          agentWallet: `0x${string}`;
        };
        tokenAddress = args.token;
        poolId = args.poolId;
        nftId = args.nftId;
        break;
      }
    } catch { /* not our event */ }
  }

  // Fallback: parse TokenLaunched if bundled event not found
  if (tokenAddress === ZERO) {
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: FACTORY_ABI, data: log.data, topics: log.topics });
        if (decoded.eventName === 'TokenLaunched') {
          const args = decoded.args as unknown as { token: `0x${string}`; poolId: Hex };
          tokenAddress = args.token;
          poolId = args.poolId;
          break;
        }
      } catch { /* not our event */ }
    }
  }

  return { txHash, tokenAddress, poolId, nftId };
}

// ── Read Functions ──────────────────────────────────────────────────────────

/** Get agent data by NFT ID */
export async function getAgentByNftId(client: PublicClient, network: Network, nftId: bigint): Promise<AgentOnChain> {
  const addrs = getAddresses(network);
  const data = await client.readContract({
    address: addrs.birthCertificate,
    abi: BIRTH_CERTIFICATE_ABI,
    functionName: 'agentByNFT',
    args: [nftId],
  }) as any;
  // Contract returns flat tuple, map to object
  if (Array.isArray(data)) {
    return {
      nftId: data[0], birthTimestamp: data[1], name: data[2], wallet: data[3],
      tokenAddress: data[4], creator: data[5], socialHandle: data[6], memoryCID: data[7],
      avatarCID: data[8], ensName: data[9], dnaHash: data[10], immortalized: data[11],
      spawnedAgents: data[12],
    };
  }
  return data as AgentOnChain;
}

/** Get agent NFT ID by wallet address */
export async function getNftIdByWallet(client: PublicClient, network: Network, wallet: `0x${string}`): Promise<bigint> {
  const addrs = getAddresses(network);
  return await client.readContract({
    address: addrs.birthCertificate,
    abi: BIRTH_CERTIFICATE_ABI,
    functionName: 'nftByWallet',
    args: [wallet],
  }) as bigint;
}

/** Get total number of registered agents */
export async function getTotalAgents(client: PublicClient, network: Network): Promise<bigint> {
  const addrs = getAddresses(network);
  return await client.readContract({
    address: addrs.birthCertificate,
    abi: BIRTH_CERTIFICATE_ABI,
    functionName: 'totalAgents',
  }) as bigint;
}

/** Get agent by wallet (convenience: nftByWallet → agentByNFT) */
export async function getAgentByWallet(client: PublicClient, network: Network, wallet: `0x${string}`): Promise<AgentOnChain | null> {
  const nftId = await getNftIdByWallet(client, network, wallet);
  if (nftId === 0n) return null;
  return getAgentByNftId(client, network, nftId);
}

// ── Memory Functions ────────────────────────────────────────────────────────

/**
 * Store memory text directly on-chain via MemoryStorage (signature-based).
 * Agent key signs the content, creator/submitter pays gas.
 */
export async function storeMemory(
  publicClient: PublicClient,
  walletClient: WalletClient,
  network: Network,
  agentWallet: `0x${string}`,
  agentPrivateKey: `0x${string}`,
  text: string,
): Promise<`0x${string}`> {
  const addrs = getAddresses(network);
  const chain = walletClient.chain!;
  const account = walletClient.account!;

  // Use keccak256 of text as a content-addressed "CID"
  const contentHash = keccak256(new TextEncoder().encode(text) as unknown as Uint8Array);

  // Get current nonce for the agent
  const nonce = await publicClient.readContract({
    address: addrs.memoryStorage,
    abi: MEMORY_STORAGE_ABI,
    functionName: 'getNonce',
    args: [agentWallet],
  }) as bigint;

  // Build the message the contract will verify:
  // keccak256(abi.encodePacked(ipfsCID, nonce, chainid, contractAddress))
  const messageHash = keccak256(
    encodePacked(
      ['string', 'uint256', 'uint256', 'address'],
      [contentHash, nonce, BigInt(chain.id), addrs.memoryStorage],
    ),
  );

  // Agent signs the raw hash (EIP-191 personal sign)
  const agentAccount = privateKeyToAccount(agentPrivateKey);
  const signature = await agentAccount.signMessage({ message: { raw: messageHash as `0x${string}` } });

  // Submit tx — anyone can call, gas paid by walletClient account
  const txHash = await walletClient.writeContract({
    address: addrs.memoryStorage,
    abi: MEMORY_STORAGE_ABI,
    functionName: 'storeMemory',
    args: [contentHash, text, nonce, signature],
    chain,
    account,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status === 'reverted') throw new Error(`storeMemory reverted. Tx: ${txHash}`);
  return txHash;
}

/** Get memory count for an agent (by wallet address) */
export async function getMemoryCount(client: PublicClient, network: Network, agentWallet: `0x${string}`): Promise<bigint> {
  const addrs = getAddresses(network);
  return await client.readContract({
    address: addrs.memoryStorage,
    abi: MEMORY_STORAGE_ABI,
    functionName: 'getMemoryCount',
    args: [agentWallet],
  }) as bigint;
}

/** Get a specific memory entry */
export async function getMemory(
  client: PublicClient,
  network: Network,
  agentWallet: `0x${string}`,
  index: bigint,
): Promise<MemoryEntry> {
  const addrs = getAddresses(network);
  return await client.readContract({
    address: addrs.memoryStorage,
    abi: MEMORY_STORAGE_ABI,
    functionName: 'getMemory',
    args: [agentWallet, index],
  }) as any;
}

// ── Immortalization ────────────────────────────────────────────────────────

/**
 * Update the birth certificate memory CID and set immortalized = true.
 *
 * MUST be called by the agent wallet itself (msg.sender = agent wallet).
 * The agent wallet needs ETH for gas.
 */
export async function updateBirthCertMemory(
  publicClient: PublicClient,
  agentWalletClient: WalletClient,
  network: Network,
  memoryCID: string,
): Promise<`0x${string}`> {
  const addrs = getAddresses(network);
  const chain = agentWalletClient.chain!;
  const account = agentWalletClient.account!;

  const txHash = await agentWalletClient.writeContract({
    address: addrs.birthCertificate,
    abi: BIRTH_CERTIFICATE_ABI,
    functionName: 'updateMemory',
    args: [memoryCID],
    chain,
    account,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status === 'reverted') {
    throw new Error(`updateMemory reverted. Tx: ${txHash}`);
  }

  return txHash;
}

/**
 * Immortalize an agent: store memory on-chain + update birth certificate.
 *
 * Convenience function that does both steps:
 *   1. Store memory text in MemoryStorage (creator pays gas, agent signs)
 *   2. Auto-fund agent wallet if needed (creator sends ETH for gas)
 *   3. Update birth certificate memoryCID (agent wallet pays gas, sets immortalized = true)
 */
export async function immortalizeAgent(
  publicClient: PublicClient,
  creatorWalletClient: WalletClient,
  agentWalletClient: WalletClient,
  network: Network,
  agentWallet: `0x${string}`,
  agentPrivateKey: `0x${string}`,
  text: string,
): Promise<{ memoryTxHash: `0x${string}`; immortalizeTxHash: `0x${string}`; memoryCID: string; fundTxHash?: `0x${string}` }> {
  // Step 1: Store memory in MemoryStorage (creator pays gas)
  const memoryTxHash = await storeMemory(
    publicClient,
    creatorWalletClient,
    network,
    agentWallet,
    agentPrivateKey,
    text,
  );

  // Use keccak256 of text as the CID (same as storeMemory does)
  const memoryCID = keccak256(new TextEncoder().encode(text) as unknown as Uint8Array);

  // Step 2: Auto-fund agent wallet if it doesn't have enough ETH for gas
  const MIN_AGENT_GAS = parseEther('0.0005');
  let fundTxHash: `0x${string}` | undefined;
  const agentBalance = await publicClient.getBalance({ address: agentWallet });
  if (agentBalance < MIN_AGENT_GAS) {
    const chain = creatorWalletClient.chain!;
    const account = creatorWalletClient.account!;
    fundTxHash = await creatorWalletClient.sendTransaction({
      to: agentWallet,
      value: MIN_AGENT_GAS,
      chain,
      account,
    });
    await publicClient.waitForTransactionReceipt({ hash: fundTxHash });
  }

  // Step 3: Update birth certificate (agent wallet pays gas, sets immortalized = true)
  const immortalizeTxHash = await updateBirthCertMemory(
    publicClient,
    agentWalletClient,
    network,
    memoryCID,
  );

  return { memoryTxHash, immortalizeTxHash, memoryCID, fundTxHash };
}
