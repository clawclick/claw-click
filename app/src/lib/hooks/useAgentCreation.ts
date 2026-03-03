import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, decodeEventLog, type Hex } from 'viem';
import { SEPOLIA_ADDRESSES, BASE_ADDRESSES, ABIS, LaunchType } from '../contracts';

// TokenLaunched event signature (keccak256)
const TOKEN_LAUNCHED_TOPIC = '0x4e681450e3a0237a2940b14ff0101c37b44e98770e6a8968ea148e163b6d1692' as Hex;
// AgentLaunchBundled event (keccak256 of AgentLaunchBundled(address,uint256,bytes32,address,address))
const AGENT_LAUNCH_BUNDLED_TOPIC = '0x' as Hex; // Will match via ABI decoding

/** Immortalization fee required by AgentBirthCertificateNFT */
const IMMORTALIZATION_FEE_ETH = 0.005;

interface CreateLaunchParams {
  name: string;
  symbol: string;
  agentWallet: `0x${string}`;
  targetMcapETH: number; // in ETH (1-10)
  devBuyPercent?: number; // 0-15, percentage of supply
  taxWallets?: string[]; // up to 5 wallets for fee split
  taxPercentages?: number[]; // percentages (0-100) for each wallet
  // Birth certificate fields (optional — if provided, uses bundler for 1-tx flow)
  socialHandle?: string;
  memoryCID?: string;
  avatarCID?: string;
  ensName?: string;
}

export interface LaunchResult {
  token?: `0x${string}`;
  poolId?: Hex;
  nftId?: bigint;
  name?: string;
  symbol?: string;
  startMcap?: bigint;
  sqrtPriceX96?: bigint;
}

export function useAgentCreation(network: 'sepolia' | 'base' = 'sepolia') {
  const { address: creatorWallet } = useAccount();
  const [launchResult, setLaunchResult] = useState<LaunchResult>({});

  const { 
    data: hash, 
    writeContract, 
    isPending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    data: receipt 
  } = useWaitForTransactionReceipt({ 
    hash 
  });

  const addresses = network === 'sepolia' ? SEPOLIA_ADDRESSES : BASE_ADDRESSES;

  // ── Build the FeeSplit + createParams shared by both flows ──
  function buildCreateParams(params: CreateLaunchParams, creator: `0x${string}`) {
    const wallets: string[] = [];
    const percentages: number[] = [];
    const ZERO_ADDR = '0x0000000000000000000000000000000000000000';

    if (params.taxWallets && params.taxWallets.length > 0 && params.taxWallets[0]) {
      const validWallets = params.taxWallets.filter(w => w && w.startsWith('0x'));
      for (let i = 0; i < 5; i++) {
        wallets.push(validWallets[i] || ZERO_ADDR);
        percentages.push(
          (params.taxPercentages && params.taxPercentages[i])
            ? params.taxPercentages[i] * 100
            : 0
        );
      }
    } else {
      wallets.push(creator, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR);
      percentages.push(10000, 0, 0, 0, 0);
    }

    const walletCount = wallets.filter(w => w !== ZERO_ADDR).length;

    return {
      name: params.name,
      symbol: params.symbol,
      beneficiary: creator,
      agentWallet: params.agentWallet,
      targetMcapETH: parseEther(params.targetMcapETH.toString()),
      feeSplit: {
        wallets: wallets as unknown as readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
        percentages: percentages as unknown as readonly [number, number, number, number, number],
        count: walletCount,
      },
      launchType: LaunchType.DIRECT, // Always DIRECT for claw.click
    };
  }

  function calcBootstrapETH(params: CreateLaunchParams): number {
    const devBuyPercent = params.devBuyPercent || 0;
    const devBuyAmount = (params.targetMcapETH * devBuyPercent) / 100;
    return Math.max(devBuyAmount, 0.001);
  }

  /**
   * Launch token + mint birth certificate in ONE transaction via AgentLaunchBundler.
   * User signs only once. Requires the bundler contract to be deployed.
   *
   * msg.value = bootstrapETH + 0.005 ETH (immortalization fee)
   */
  const launchAndMint = async (params: CreateLaunchParams) => {
    if (!creatorWallet) throw new Error('Wallet not connected');

    const bundlerAddr = addresses.clawclick.bundler as string;
    if (!bundlerAddr || bundlerAddr === '0x' || bundlerAddr === '') {
      throw new Error('Bundler contract not deployed yet. Use createLaunch() + separate mint.');
    }

    const createParams = buildCreateParams(params, creatorWallet);
    const bootstrapETH = calcBootstrapETH(params);
    const totalValue = bootstrapETH + IMMORTALIZATION_FEE_ETH;

    try {
      await writeContract({
        address: bundlerAddr as `0x${string}`,
        abi: ABIS.LaunchBundler,
        functionName: 'launchAndMint',
        args: [
          createParams,
          params.agentWallet,
          creatorWallet,
          params.name,
          params.socialHandle || '',
          params.memoryCID || '',
          params.avatarCID || '',
          params.ensName || '',
        ],
        value: parseEther(totalValue.toString()),
        gas: BigInt(10_000_000),
      });
      return hash;
    } catch (error) {
      console.error('launchAndMint failed:', error);
      throw error;
    }
  };

  /**
   * Launch token only (no birth certificate). Original 1-of-2 flow.
   * Call this if you want to mint the birth certificate separately.
   */
  const createLaunch = async (params: CreateLaunchParams) => {
    if (!creatorWallet) throw new Error('Wallet not connected');

    const factoryAddr = addresses.clawclick.factory;
    if (!factoryAddr) {
      throw new Error('Factory contract not deployed on this network');
    }

    const createParams = buildCreateParams(params, creatorWallet);
    const bootstrapAmount = calcBootstrapETH(params);

    try {
      await writeContract({
        address: factoryAddr as `0x${string}`,
        abi: ABIS.ClawclickFactory,
        functionName: 'createLaunch',
        args: [createParams],
        value: parseEther(bootstrapAmount.toString()),
        gas: BigInt(8_000_000),
      });
      return hash;
    } catch (error) {
      console.error('createLaunch failed:', error);
      throw error;
    }
  };

  // ── Parse events from receipt ──
  useEffect(() => {
    if (!isConfirmed || !receipt || launchResult.token) return;

    try {
      // Try parsing AgentLaunchBundled event first (bundler flow)
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: ABIS.LaunchBundler,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === 'AgentLaunchBundled') {
            const args = decoded.args as unknown as {
              token: `0x${string}`;
              nftId: bigint;
              poolId: Hex;
              creator: `0x${string}`;
              agentWallet: `0x${string}`;
            };
            setLaunchResult({
              token: args.token,
              poolId: args.poolId,
              nftId: args.nftId,
            });
            return;
          }
        } catch { /* not this event */ }
      }

      // Fallback: try TokenLaunched event (factory-only flow)
      const tokenLaunchedLog = receipt.logs.find(log =>
        log.topics[0] === TOKEN_LAUNCHED_TOPIC
      );

      if (tokenLaunchedLog) {
        const decoded = decodeEventLog({
          abi: ABIS.ClawclickFactory,
          data: tokenLaunchedLog.data,
          topics: tokenLaunchedLog.topics,
        });

        const args = decoded.args as unknown as {
          token: `0x${string}`;
          beneficiary: `0x${string}`;
          creator: `0x${string}`;
          poolId: Hex;
          targetMcapETH: bigint;
          sqrtPriceX96: bigint;
          name: string;
          symbol: string;
          launchType: number;
        };

        setLaunchResult({
          token: args.token,
          poolId: args.poolId,
          name: args.name,
          symbol: args.symbol,
          startMcap: args.targetMcapETH,
          sqrtPriceX96: args.sqrtPriceX96,
        });
      }
    } catch (e) {
      console.error('Failed to parse launch events:', e);
    }
  }, [isConfirmed, receipt, launchResult.token]);

  const reset = () => {
    setLaunchResult({});
    resetWrite();
  };

  return {
    /** 1-tx flow: launch token + mint birth cert (preferred) */
    launchAndMint,
    /** Token-only flow (mint birth cert separately) */
    createLaunch,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    error: writeError,
    launchResult,
    receipt,
    reset,
  };
}
