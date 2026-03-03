'use client'

import { useState, Suspense, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi'
import { parseEther, Hex, decodeEventLog } from 'viem'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { SEPOLIA_ADDRESSES, BASE_ADDRESSES, ABIS, LaunchType } from '../../../lib/contracts'
import { uploadToPinata } from '../../../lib/ipfs'

// Minimum bootstrap ETH required by the factory
const MIN_BOOTSTRAP_ETH = 0.001;

// Birth certificate immortalization fee (0.005 ETH)
const IMMORTALIZATION_FEE = 0.005;

function CreateAgentFlow() {
  const searchParams = useSearchParams()
  const initialType = searchParams?.get('type') as 'human' | 'agent' | null
  
  const [step, setStep] = useState(initialType ? 1 : 0)
  const [creatorType, setCreatorType] = useState<'human' | 'agent' | null>(initialType)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [ethPrice, setEthPrice] = useState<number | null>(null)
  const [agentWallet, setAgentWallet] = useState<Hex | null>(null)
  const [isUploadingMemory, setIsUploadingMemory] = useState(false)
  const [memoryCID, setMemoryCID] = useState<string | null>(null)
  const [launchedToken, setLaunchedToken] = useState<`0x${string}` | null>(null)
  const [launchedPoolId, setLaunchedPoolId] = useState<Hex | null>(null)
  const [birthCertNftId, setBirthCertNftId] = useState<bigint | null>(null)
  const [deployPhase, setDeployPhase] = useState<'idle' | 'launching' | 'confirming' | 'done'>('idle')
  const [deployError, setDeployError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    chain: 'Base',
    // Starting MCAP (1-10 ETH, default 5)
    genesisBuy: 5,
    // Fee split recipients (up to 5 wallets) - for 30/70 LP fee split
    feeSplitWallets: [] as string[],
    feeSplitPercentages: [] as number[],
    // Memory & Deployment
    memoryFiles: [] as File[],
    startSession: false,
    feeAcknowledged: false
  })

  const { address: creatorAddress, isConnected, chain: connectedChain } = useAccount()
  const publicClient = usePublicClient()

  // Dynamic explorer URL based on connected chain
  const explorerUrl = useMemo(() => {
    const chainId = connectedChain?.id || publicClient?.chain?.id
    if (chainId === 8453) return 'https://basescan.org' // Base mainnet
    return 'https://sepolia.etherscan.io' // Sepolia testnet (default)
  }, [connectedChain?.id, publicClient?.chain?.id])

  const { 
    data: hash, 
    writeContract, 
    writeContractAsync,
    isPending: isWritePending,
    error: writeError,
    reset: resetWrite
  } = useWriteContract()

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    data: receipt 
  } = useWaitForTransactionReceipt({ hash })

  // Auto-fill creator wallet as first fee split wallet when connected
  useEffect(() => {
    if (creatorAddress && formData.feeSplitWallets.length === 0) {
      setFormData(prev => ({
        ...prev,
        feeSplitWallets: [creatorAddress],
        feeSplitPercentages: [100],
      }))
    }
  }, [creatorAddress])

  // Fetch ETH price
  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      .then(res => res.json())
      .then(data => setEthPrice(data.ethereum?.usd || 2300))
      .catch(() => setEthPrice(2300))
  }, [])

  // Generate agent wallet on mount
  useEffect(() => {
    const randomWallet = `0x${Array.from({length: 40}, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}` as Hex
    setAgentWallet(randomWallet)
  }, [])

  // Memory upload fee
  const MEMORY_UPLOAD_FEE = 0.0005 // ETH (~$1 at current prices)

  // Cost Calculation
  const totalCost = useMemo(() => {
    const memoryFee = formData.memoryFiles.length > 0 ? MEMORY_UPLOAD_FEE : 0
    const bootstrapETH = MIN_BOOTSTRAP_ETH
    const total = bootstrapETH + memoryFee + IMMORTALIZATION_FEE
    const totalUSD = ethPrice ? (total * ethPrice).toFixed(2) : 'N/A'
    
    return {
      memoryFee,
      bootstrapETH,
      total,
      totalUSD
    }
  }, [formData.genesisBuy, formData.memoryFiles.length, ethPrice])

  const handleCreateAgent = async () => {
    if (!isConnected || !creatorAddress || !agentWallet) {
      alert('Please connect your wallet first')
      return
    }

    if (!formData.name || !formData.symbol) {
      alert('Please fill in all required fields')
      return
    }

    setDeployError(null)

    try {
      const chainId = connectedChain?.id || 8453
      const isSepolia = chainId === 11155111
      const addresses = isSepolia ? SEPOLIA_ADDRESSES : BASE_ADDRESSES

      const bundlerAddr = addresses.clawclick.bundler as string
      if (!bundlerAddr || bundlerAddr === '0x') {
        alert(`Bundler contract not deployed on ${connectedChain?.name || 'this network'} yet. Please switch to Base.`)
        return
      }

      console.log('[Deploy] Starting agent deployment (bundled 1-tx flow)...')
      console.log('[Deploy] Chain:', chainId, '| Bundler:', bundlerAddr)

      // Build FeeSplit struct (up to 5 wallets) - for 30/70 LP fee split (creator gets 70%)
      const ZERO_ADDR = '0x0000000000000000000000000000000000000000'
      const feeSplitWallets: string[] = []
      const feeSplitPercentages: number[] = []

      if (formData.feeSplitWallets.length > 0 && formData.feeSplitWallets[0]) {
        const validWallets = formData.feeSplitWallets.filter(w => w && w.startsWith('0x'))
        for (let i = 0; i < 5; i++) {
          feeSplitWallets.push(validWallets[i] || ZERO_ADDR)
          feeSplitPercentages.push((formData.feeSplitPercentages[i] || 0) * 100) // Convert % to BPS (uint16)
        }
      } else {
        // Default: 100% to creator wallet
        feeSplitWallets.push(creatorAddress, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR)
        feeSplitPercentages.push(10000, 0, 0, 0, 0)
      }

      const walletCount = feeSplitWallets.filter(w => w !== ZERO_ADDR).length

      // CreateParams struct - includes launchType
      const createParams = {
        name: formData.name,
        symbol: formData.symbol,
        beneficiary: creatorAddress,
        agentWallet: agentWallet,
        targetMcapETH: parseEther(formData.genesisBuy.toString()),
        feeSplit: {
          wallets: feeSplitWallets as unknown as readonly [`0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`, `0x${string}`],
          percentages: feeSplitPercentages as unknown as readonly [number, number, number, number, number],
          count: walletCount
        },
        launchType: LaunchType.DIRECT // CRITICAL: All claw.click launches use DIRECT (hookless, 1% LP fee)
      }

      // msg.value = bootstrap ETH + immortalization fee (0.005 ETH) — single bundled tx
      const bootstrapValue = MIN_BOOTSTRAP_ETH
      const totalValue = bootstrapValue + IMMORTALIZATION_FEE

      console.log('[Deploy] CreateParams:', JSON.stringify(createParams, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2))
      console.log('[Deploy] Bootstrap:', bootstrapValue, 'ETH + Immortalization:', IMMORTALIZATION_FEE, 'ETH = Total:', totalValue, 'ETH')

      setDeployPhase('launching')

      // Single bundled tx: createLaunch + mintBirthCertificate via AgentLaunchBundler
      const bundleHash = await writeContractAsync({
        address: bundlerAddr as Hex,
        abi: ABIS.LaunchBundler,
        functionName: 'launchAndMint',
        args: [
          createParams,
          agentWallet,
          creatorAddress,
          formData.name,
          '', // socialHandle
          memoryCID || '',
          '', // avatarCID
          '', // ensName
        ],
        value: parseEther(totalValue.toString()),
        gas: BigInt(10_000_000),
      })

      console.log('[Deploy] Bundled tx submitted:', bundleHash)
      setDeployPhase('confirming')

      // Wait for receipt and parse AgentLaunchBundled event
      if (publicClient && bundleHash) {
        const bundleReceipt = await publicClient.waitForTransactionReceipt({ hash: bundleHash })
        console.log('[Deploy] Bundled tx confirmed, status:', bundleReceipt.status, '| Logs:', bundleReceipt.logs.length)

        if (bundleReceipt.status === 'reverted') {
          throw new Error('Transaction reverted on-chain. Check Etherscan for details: ' + bundleHash)
        }

        // Parse AgentLaunchBundled event
        for (const log of bundleReceipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: ABIS.LaunchBundler,
              data: log.data,
              topics: log.topics,
            })
            if (decoded.eventName === 'AgentLaunchBundled') {
              const args = decoded.args as unknown as {
                token: `0x${string}`;
                nftId: bigint;
                poolId: Hex;
                creator: `0x${string}`;
                agentWallet: `0x${string}`;
              }
              setLaunchedToken(args.token)
              setLaunchedPoolId(args.poolId)
              setBirthCertNftId(args.nftId)
              console.log('[Deploy] Token:', args.token, '| Pool:', args.poolId, '| NFT:', args.nftId.toString())

              // Fire-and-forget: auto-verify token on block explorer
              fetch('/api/verify-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  tokenAddress: args.token,
                  name: formData.name,
                  symbol: formData.symbol,
                  hookAddress: addresses.clawclick.hook,
                  beneficiary: creatorAddress,
                  agentWallet: agentWallet,
                  chainId,
                }),
              })
                .then(r => r.json())
                .then(r => console.log('[Verify] Token verification result:', r))
                .catch(e => console.warn('[Verify] Token verification failed (non-blocking):', e))

              break
            }
          } catch { /* not this event */ }
        }
      }

      setDeployPhase('done')
    } catch (error: any) {
      console.error('[Deploy] Agent creation failed:', error)
      setDeployPhase('idle')
      const msg = error?.shortMessage || error?.message || 'Unknown error'
      setDeployError(msg)
    }
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleNext = () => setStep(step + 1)
  const handleBack = () => setStep(step - 1)
  
  const handleMemoryUpload = async () => {
    if (formData.memoryFiles.length === 0) {
      handleNext()
      return
    }

    setIsUploadingMemory(true)
    try {
      const cid = await uploadToPinata(formData.memoryFiles)
      setMemoryCID(cid)
      handleNext()
    } catch (error) {
      console.error('Failed to upload memory:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const skip = confirm(`Failed to upload memory files.\n\nError: ${errorMessage}\n\nClick OK to skip and continue.`)
      if (skip) {
        setFormData({ ...formData, memoryFiles: [] })
        handleNext()
      }
    } finally {
      setIsUploadingMemory(false)
    }
  }

  return (
    <main className="min-h-screen relative bg-[#000000] w-full overflow-x-hidden text-white">
      {/* Header */}
      <header className="fixed w-full z-50 bg-[#000000]/80 backdrop-blur-xl border-b border-[#E8523D]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10">
              <Image src="/logo.svg" alt="Claw.Click" fill className="object-contain" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-[#E8523D]">claw.click</span>
            <span className="hidden sm:inline px-2 py-0.5 rounded text-xs font-bold bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444]">
              ALPHA
            </span>
          </Link>
          <ConnectButton />
        </div>
      </header>

      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 relative z-10">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          {step > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <div key={s} className={`flex-1 h-1 rounded-full transition-all mx-0.5 ${s <= step ? 'bg-[#E8523D]' : 'bg-[#E8523D]/20'}`} />
                ))}
              </div>
              <div className="text-sm text-[rgba(255, 255, 255, 0.5)] text-center">Step {step} of 6</div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 0: Entry */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
                <h1 className="text-4xl font-black text-white mb-4">Create Agent</h1>
                <p className="text-[rgba(255, 255, 255, 0.5)] mb-12">Who is creating the agent?</p>
                <div className="grid md:grid-cols-2 gap-6 max-w-lg mx-auto">
                  <button onClick={() => { setCreatorType('human'); setStep(1) }} className="bg-[rgba(255, 255, 255, 0.03)] border border-[#E8523D]/25 rounded-2xl p-8 hover:border-[#E8523D]/40 transition-all group">
                    <div className="text-5xl mb-4">👤</div>
                    <h3 className="text-xl font-bold text-white group-hover:text-[#E8523D]">Human</h3>
                  </button>
                  <button onClick={() => { setCreatorType('agent'); setStep(1) }} className="bg-[rgba(255, 255, 255, 0.03)] border border-[#E8523D]/25 rounded-2xl p-8 hover:border-[#E8523D]/40 transition-all group">
                    <div className="text-5xl mb-4">🤖</div>
                    <h3 className="text-xl font-bold text-white group-hover:text-[#E8523D]">Agent</h3>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Wallet Connection */}
            {step > 0 && !isConnected && (
              <motion.div key="wallet" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-[rgba(255, 255, 255, 0.03)] border border-[#E8523D]/25 rounded-2xl p-8 text-center">
                <div className="text-6xl mb-6">🔐</div>
                <h2 className="text-2xl font-black text-white mb-4">Connect Your Wallet</h2>
                <p className="text-[rgba(255, 255, 255, 0.5)] mb-6">You need to connect your wallet to create an agent on-chain.</p>
                <div className="flex justify-center"><ConnectButton /></div>
              </motion.div>
            )}

            {/* Step 1: Configure Your Launch */}
            {step === 1 && isConnected && (
              <motion.div key="step1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-[rgba(255, 255, 255, 0.03)] border border-[#E8523D]/25 rounded-2xl p-8">
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🚀</div>
                  <h2 className="text-2xl font-black text-white mb-2">Configure Your Launch</h2>
                  <p className="text-[rgba(255, 255, 255, 0.5)]">Set your starting market cap using Uniswap V4</p>
                </div>

                {/* Starting MCAP Selector */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">⚙️</span>
                    <span className="text-sm font-semibold text-white">Starting Market Cap</span>
                  </div>
                  <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mb-4">Choose your initial token valuation (1-10 ETH)</p>
                  
                  <div className="bg-[rgba(0, 0, 0, 0.5)] rounded-xl p-4 border border-[#E8523D]/20">
                    {/* MCAP Slider */}
                    <div className="mb-4">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.1"
                        value={formData.genesisBuy || 5}
                        onChange={(e) => setFormData({ ...formData, genesisBuy: parseFloat(e.target.value) })}
                        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-[#1E2832] accent-[#E8523D]"
                      />
                      <div className="flex justify-between text-xs text-[rgba(255, 255, 255, 0.5)] mt-1">
                        <span>1 ETH</span>
                        <span>5 ETH</span>
                        <span>10 ETH</span>
                      </div>
                    </div>
                    
                    {/* Current Value Display */}
                    <div className="p-3 bg-[rgba(255, 255, 255, 0.03)] rounded-lg border border-[#E8523D]/20 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[rgba(255, 255, 255, 0.5)] text-sm">Starting MCAP:</span>
                        <span className="text-[#E8523D] font-bold text-lg">{formData.genesisBuy || 5} ETH {ethPrice ? `(~$${((formData.genesisBuy || 5) * ethPrice).toLocaleString()})` : ''}</span>
                      </div>
                    </div>

                    {/* Uniswap V4 Info */}
                    <div className="space-y-3">
                      {/* LP Fee Info */}
                      <div className="p-3 bg-[rgba(255, 255, 255, 0.03)] rounded-lg border border-[#E8523D]/10">
                        <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mb-2">💰 Liquidity Provider Fee:</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-[rgba(255, 255, 255, 0.5)]">Pool Fee:</span>
                            <span className="text-white font-semibold">1% flat on all trades</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-[rgba(255, 255, 255, 0.5)]">Split:</span>
                            <span className="text-[#E8523D] font-semibold">30% platform / 70% creator</span>
                          </div>
                        </div>
                        <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mt-2 italic">Fees collected from 1% LP fee across all positions (P1-P5)</p>
                      </div>

                      {/* Position Info */}
                      <div className="p-3 bg-[rgba(255, 255, 255, 0.03)] rounded-lg border border-[#E8523D]/10">
                        <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mb-2">📊 Liquidity Positions:</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-[rgba(255, 255, 255, 0.5)]">Position Strategy:</span>
                            <span className="text-white">P1 → P5 (concentrated ranges)</span>
                          </div>
                          <p className="text-[rgba(255, 255, 255, 0.5)] mt-1 italic text-[10px]">Liquidity distributed across 5 positions as token grows</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Uniswap V4 Framework Info */}
                <div className="p-4 bg-[#E8523D]/5 rounded-lg border border-[#E8523D]/20 mb-6">
                  <p className="text-xs text-[#E8523D] font-semibold mb-2">🏗️ Uniswap V4 Direct Launch</p>
                  <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">
                    Your token launches with instant tradability on Uniswap V4. No complex mechanics, just a clean 1% LP fee with 30/70 split. Works with all standard bots and routers.
                  </p>
                </div>

                {/* Features */}
                <div className="mb-6">
                  <p className="text-xs text-[rgba(255, 255, 255, 0.5)] uppercase tracking-wider mb-3">All launches include:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2"><span className="text-[#E8523D]">✓</span><span className="text-[rgba(255, 255, 255, 0.5)]">ERC-20 Token (1B supply)</span></div>
                    <div className="flex items-center gap-2"><span className="text-[#E8523D]">✓</span><span className="text-[rgba(255, 255, 255, 0.5)]">Uniswap V4 Pool (1% fee)</span></div>
                    <div className="flex items-center gap-2"><span className="text-purple-400">🔒</span><span className="text-[rgba(255, 255, 255, 0.5)]">Birth Certificate NFT</span></div>
                    <div className="flex items-center gap-2"><span className="text-[#E8523D]">✓</span><span className="text-[rgba(255, 255, 255, 0.5)]">5 LP Positions (P1-P5)</span></div>
                    <div className="flex items-center gap-2"><span className="text-[#E8523D]">✓</span><span className="text-[rgba(255, 255, 255, 0.5)]">Memory Storage (IPFS)</span></div>
                    <div className="flex items-center gap-2"><span className="text-[#E8523D]">✓</span><span className="text-[rgba(255, 255, 255, 0.5)]">Instant Tradability</span></div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button onClick={handleBack} className="bg-[#000000] border border-[#E8523D]/30 text-[rgba(255, 255, 255, 0.5)] hover:bg-[rgba(0, 0, 0, 0.5)] rounded-lg flex-1 py-3">Back</button>
                  <button onClick={handleNext} className="bg-[#E8523D] text-black font-semibold hover:shadow-[0_0_20px_rgba(30,230,183,0.5)] transition-all rounded-lg flex-1 py-3">Continue</button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Agent Naming */}
            {step === 2 && isConnected && (
              <motion.div key="step2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-[rgba(255, 255, 255, 0.03)] border border-[#E8523D]/25 rounded-2xl p-8">
                <h2 className="text-2xl font-black text-white mb-6">Agent Identity</h2>
                
                {creatorType === 'agent' ? (
                  <>
                    <p className="text-[rgba(255, 255, 255, 0.5)] mb-4">Agents use CLI commands to self-create. Follow these steps:</p>
                    
                    {/* CLI Commands... (keeping same) */}
                    <div className="bg-[rgba(0, 0, 0, 0.5)] border border-[#E8523D]/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#E8523D] font-semibold">Step 1: Initialize Identity</span>
                        <button onClick={() => copyToClipboard('npx @clawclick/clawclick init --name "YourAgent" --symbol "AGENT"', 'init-cmd')} className="text-xs text-[#E8523D] hover:text-[#E8523D] px-2 py-1 rounded border border-[#E8523D]/30">
                          {copiedField === 'init-cmd' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <code className="text-sm text-white font-mono block">npx @clawclick/clawclick init --name "YourAgent" --symbol "AGENT"</code>
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mt-2">Generates wallet, creates config file</p>
                    </div>

                    <div className="bg-[rgba(0, 0, 0, 0.5)] border border-[#E8523D]/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#E8523D] font-semibold">Step 2: Generate FUNLAN Identity</span>
                        <button onClick={() => copyToClipboard('npx @clawclick/clawclick funlan --generate', 'funlan-cmd')} className="text-xs text-[#E8523D] hover:text-[#E8523D] px-2 py-1 rounded border border-[#E8523D]/30">
                          {copiedField === 'funlan-cmd' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <code className="text-sm text-white font-mono block">npx @clawclick/clawclick funlan --generate</code>
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mt-2">Creates FUNLAN.md with your emoji identity grid</p>
                    </div>

                    <div className="bg-[rgba(0, 0, 0, 0.5)] border border-[#E8523D]/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#E8523D] font-semibold">Step 3: Upload Memory (Optional)</span>
                        <button onClick={() => copyToClipboard('npx @clawclick/clawclick memory upload ./memories/', 'memory-cmd')} className="text-xs text-[#E8523D] hover:text-[#E8523D] px-2 py-1 rounded border border-[#E8523D]/30">
                          {copiedField === 'memory-cmd' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <code className="text-sm text-white font-mono block">npx @clawclick/clawclick memory upload ./memories/</code>
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mt-2">Uploads memory files to IPFS with wallet signature</p>
                    </div>

                    <div className="bg-[rgba(0, 0, 0, 0.5)] border border-[#E8523D]/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#E8523D] font-semibold">Step 4: Deploy & Tokenize</span>
                        <button onClick={() => copyToClipboard('npx @clawclick/clawclick deploy --network base --starting-mcap 5', 'deploy-cmd')} className="text-xs text-[#E8523D] hover:text-[#E8523D] px-2 py-1 rounded border border-[#E8523D]/30">
                          {copiedField === 'deploy-cmd' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <code className="text-sm text-white font-mono block">npx @clawclick/clawclick deploy --network base --starting-mcap 5</code>
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mt-2">Deploys token with 5 ETH starting MCAP. Mints birth certificate!</p>
                    </div>

                    <div className="bg-[#E8523D]/10 border border-[#E8523D]/30 rounded-lg p-4 mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-[#E8523D] font-semibold">🚀 One-liner (all steps)</span>
                        <button onClick={() => copyToClipboard('npx @clawclick/clawclick create --name "YourAgent" --symbol "AGENT" --network base --starting-mcap 5', 'full-cmd')} className="text-xs text-[#E8523D] hover:text-[#E8523D] px-2 py-1 rounded border border-[#E8523D]/30">
                          {copiedField === 'full-cmd' ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                      <code className="text-sm text-white font-mono block break-all">npx @clawclick/clawclick create --name "YourAgent" --symbol "AGENT" --network base --starting-mcap 5</code>
                    </div>

                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mb-6">
                      📚 <a href="/docs?page=cli" className="text-[#E8523D] hover:underline">View full CLI documentation</a> for all options and flags.
                    </p>
                  </>
                ) : (
                  <div className="space-y-6 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-[rgba(255, 255, 255, 0.5)] mb-2">Agent Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="ClawdiusMaximus"
                        className="w-full px-4 py-3 bg-[rgba(0, 0, 0, 0.5)] border border-[#E8523D]/20 rounded-lg text-white placeholder-[rgba(255, 255, 255, 0.5)]/50 focus:border-[#E8523D] focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[rgba(255, 255, 255, 0.5)] mb-2">Token Symbol *</label>
                      <input
                        type="text"
                        value={formData.symbol}
                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                        placeholder="CLAW"
                        className="w-full px-4 py-3 bg-[rgba(0, 0, 0, 0.5)] border border-[#E8523D]/20 rounded-lg text-white placeholder-[rgba(255, 255, 255, 0.5)]/50 focus:border-[#E8523D] focus:outline-none"
                        maxLength={10}
                        required
                      />
                      <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mt-2">Must be unique and uppercase</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button onClick={handleBack} className="bg-[#000000] border border-[#E8523D]/30 text-[rgba(255, 255, 255, 0.5)] hover:bg-[rgba(0, 0, 0, 0.5)] rounded-lg flex-1 py-3">Back</button>
                  <button onClick={handleNext} disabled={creatorType === 'human' && (!formData.name || !formData.symbol)} className="bg-[#E8523D] text-black font-semibold hover:shadow-[0_0_20px_rgba(30,230,183,0.5)] transition-all rounded-lg flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed">Continue</button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Network */}
            {step === 3 && isConnected && (
              <motion.div key="step3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-[rgba(255, 255, 255, 0.03)] border border-[#E8523D]/25 rounded-2xl p-8">
                <h2 className="text-2xl font-black text-white mb-6">Select Network</h2>
                <p className="text-[rgba(255, 255, 255, 0.5)] mb-6">Choose the blockchain network for your agent:</p>
                
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => setFormData({ ...formData, chain: 'Base' })}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.chain === 'Base'
                        ? 'border-[#4A90E2] bg-[#4A90E2]/10 shadow-[0_0_20px_rgba(74,144,226,0.2)]'
                        : 'border-[#4A90E2]/30 bg-[rgba(0, 0, 0, 0.5)]/50 hover:border-[#4A90E2]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🔵</span>
                      {formData.chain === 'Base' && <span className="text-[#4A90E2]">✓</span>}
                    </div>
                    <p className="text-lg font-bold text-white mb-1">Base</p>
                    <p className="text-xs text-[#4A90E2]">L2 • Low fees</p>
                  </button>

                  <button
                    onClick={() => setFormData({ ...formData, chain: 'Sepolia' })}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      formData.chain === 'Sepolia'
                        ? 'border-[#9CA3AF] bg-[#9CA3AF]/10 shadow-[0_0_20px_rgba(156,163,175,0.2)]'
                        : 'border-[#9CA3AF]/30 bg-[rgba(0, 0, 0, 0.5)]/50 hover:border-[#9CA3AF]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🧪</span>
                      {formData.chain === 'Sepolia' && <span className="text-[#9CA3AF]">✓</span>}
                    </div>
                    <p className="text-lg font-bold text-white mb-1">Sepolia</p>
                    <p className="text-xs text-[#9CA3AF]">Testnet • Free to deploy</p>
                  </button>

                  <div className="p-4 rounded-xl border-2 border-[#8B7FD4]/20 bg-[rgba(0, 0, 0, 0.5)]/30 opacity-50 cursor-not-allowed">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">💎</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#8B7FD4]/20 text-[#8B7FD4]">Soon</span>
                    </div>
                    <p className="text-lg font-bold text-[#8B7FD4]/60 mb-1">Ethereum</p>
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)]/50">Mainnet • Most secure</p>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-[#F0B90B]/20 bg-[rgba(0, 0, 0, 0.5)]/30 opacity-50 cursor-not-allowed">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🟡</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-[#F0B90B]/20 text-[#F0B90B]">Soon</span>
                    </div>
                    <p className="text-lg font-bold text-[#F0B90B]/60 mb-1">BSC</p>
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)]/50">BNB Chain • Fast & cheap</p>
                  </div>
                </div>

                <p className="text-sm text-[rgba(255, 255, 255, 0.5)] mb-6">Connected to: <strong className="text-white">{connectedChain?.name || 'Unknown'}</strong></p>
                
                {connectedChain?.id !== 11155111 && connectedChain?.id !== 8453 && (
                  <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30 mb-6">
                    <p className="text-sm text-yellow-400 font-semibold mb-2">⚠️ Wrong Network</p>
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">Please switch to {formData.chain === 'Base' ? 'Base' : 'Sepolia testnet'} to continue.</p>
                  </div>
                )}

                <div className="flex gap-4">
                  <button onClick={handleBack} className="bg-[#000000] border border-[#E8523D]/30 text-[rgba(255, 255, 255, 0.5)] hover:bg-[rgba(0, 0, 0, 0.5)] rounded-lg flex-1 py-3">Back</button>
                  <button onClick={handleNext} disabled={(formData.chain === 'Sepolia' && connectedChain?.id !== 11155111) || (formData.chain === 'Base' && connectedChain?.id !== 8453)} className="bg-[#E8523D] text-black font-semibold hover:shadow-[0_0_20px_rgba(30,230,183,0.5)] transition-all rounded-lg flex-1 py-3 disabled:opacity-50 disabled:cursor-not-allowed">
                    {(formData.chain === 'Sepolia' && connectedChain?.id === 11155111) || (formData.chain === 'Base' && connectedChain?.id === 8453) ? 'Continue' : 'Switch Network'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 4: FUNLAN */}
            {step === 4 && isConnected && (
              <motion.div key="step4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-[rgba(255, 255, 255, 0.03)] border border-[#E8523D]/25 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-4xl">🦞</span>
                  <div>
                    <h2 className="text-2xl font-black text-white">Agent Language</h2>
                    <p className="text-sm text-[rgba(255, 255, 255, 0.5)]">FUNLAN - The emoji-based agent identity system</p>
                  </div>
                </div>

                {/* FUNLAN content stays the same... */}
                <div className="bg-[rgba(0, 0, 0, 0.5)] rounded-xl p-6 border border-[#E8523D]/20 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">🎭 Identity Grid Preview</h3>
                    <span className="text-xs px-2 py-1 rounded bg-[#E8523D]/20 text-[#E8523D]">Auto-generated</span>
                  </div>
                  <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mb-4">
                    Your agent's unique 5x5 emoji grid will be deterministically generated from their wallet address.
                    This identity is permanent and verifiable on-chain.
                  </p>
                  <div className="grid grid-cols-5 gap-1 max-w-[160px] mx-auto mb-4">
                    {['🔥','💎','🦞','⚡','🌊','🎯','💀','🚀','🌙','✨','🔮','🎲','🌈','💫','🎪','🦋','🌸','⭐','🔱','🎭','💝','🌺','🎨','🔥','💎'].map((emoji, i) => (
                      <div key={i} className="w-6 h-6 bg-[rgba(255, 255, 255, 0.03)] rounded flex items-center justify-center text-sm">
                        {emoji}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-center text-[rgba(255, 255, 255, 0.5)]">Preview only - actual grid generated at deployment</p>
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-xs text-[rgba(255, 255, 255, 0.5)] uppercase tracking-wider">What gets created:</p>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-3 p-3 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[#E8523D]/10">
                      <span className="text-[#E8523D]">✓</span>
                      <div>
                        <span className="text-white text-sm">FUNLAN.md generated</span>
                        <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">Your agent's identity specification file</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[#E8523D]/10">
                      <span className="text-[#E8523D]">✓</span>
                      <div>
                        <span className="text-white text-sm">Emoji-based symbolic language</span>
                        <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">Unique visual identity derived from wallet</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-[rgba(0, 0, 0, 0.5)]/50 rounded-lg border border-[#E8523D]/10">
                      <span className="text-[#E8523D]">✓</span>
                      <div>
                        <span className="text-white text-sm">Uploaded to IPFS</span>
                        <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">Permanently stored and content-addressed</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/30 mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-purple-400">🔒</span>
                    <span className="text-sm font-semibold text-purple-400">Soulbound Birth Certificate</span>
                  </div>
                  <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">
                    Your agent receives a non-transferable ERC-721 NFT as their birth certificate.
                    This proves their on-chain existence and links their identity permanently.
                  </p>
                </div>

                <div className="flex items-center justify-center gap-4 mb-6">
                  <a 
                    href="https://github.com/ClawsFun/FUNLAN" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-[rgba(0, 0, 0, 0.5)] border border-[#E8523D]/40 rounded-lg hover:border-[#E8523D] hover:bg-[#E8523D]/10 transition-all text-sm"
                    style={{ color: '#E8523D' }}
                  >
                    <svg className="w-4 h-4" fill="#E8523D" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
                    <span style={{ color: '#E8523D' }}>View FUNLAN Spec</span>
                  </a>
                  <a 
                    href="/docs?page=funlan" 
                    className="flex items-center gap-2 px-4 py-2 bg-[rgba(0, 0, 0, 0.5)] border border-[#E8523D]/40 rounded-lg hover:border-[#E8523D] hover:bg-[#E8523D]/10 transition-all text-sm"
                    style={{ color: '#E8523D' }}
                  >
                    📚 <span style={{ color: '#E8523D' }}>Learn More</span>
                  </a>
                </div>

                <div className="flex gap-4">
                  <button onClick={handleBack} className="bg-[#000000] border border-[#E8523D]/30 text-[rgba(255, 255, 255, 0.5)] hover:bg-[rgba(0, 0, 0, 0.5)] rounded-lg flex-1 py-3">Back</button>
                  <button onClick={handleNext} className="bg-[#E8523D] text-black font-semibold hover:shadow-[0_0_20px_rgba(30,230,183,0.5)] transition-all rounded-lg flex-1 py-3">Continue</button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Memory */}
            {step === 5 && isConnected && (
              <motion.div key="step5" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-[rgba(255, 255, 255, 0.03)] border border-[#E8523D]/25 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">🧠</span>
                  <h2 className="text-2xl font-black text-white">Memory Upload</h2>
                </div>
                <p className="text-sm text-[#E8523D] mb-6">Optional — can be added later via CLI or dashboard</p>
                
                <div className="bg-[rgba(0, 0, 0, 0.5)] rounded-xl p-4 border border-[#E8523D]/20 mb-6">
                  <h3 className="text-sm font-bold text-white mb-2">📜 What is Agent Memory?</h3>
                  <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mb-3">
                    Memory files give your agent context, personality, and knowledge. They are cryptographically signed 
                    by the agent wallet and stored permanently on IPFS.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[#E8523D]">✓</span>
                      <span className="text-[rgba(255, 255, 255, 0.5)]">Content-addressed storage</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#E8523D]">✓</span>
                      <span className="text-[rgba(255, 255, 255, 0.5)]">Wallet-signed verification</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#E8523D]">✓</span>
                      <span className="text-[rgba(255, 255, 255, 0.5)]">Immutable records</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#E8523D]">✓</span>
                      <span className="text-[rgba(255, 255, 255, 0.5)]">Survives runtime shutdown</span>
                    </div>
                  </div>
                </div>
                
                <div className="border-2 border-dashed border-[#E8523D]/20 rounded-lg p-8 text-center cursor-pointer bg-[rgba(255, 255, 255, 0.03)]/30 mb-6 hover:border-[#E8523D]/40 transition-all">
                  <input type="file" id="memory-upload" multiple accept=".md,.txt,.json" onChange={(e) => { if (e.target.files) setFormData({ ...formData, memoryFiles: [...formData.memoryFiles, ...Array.from(e.target.files)] }) }} className="hidden" />
                  <label htmlFor="memory-upload" className="cursor-pointer">
                    <div className="text-4xl mb-4">📁</div>
                    <p className="text-white font-semibold mb-2">Upload Memory Files</p>
                    <p className="text-sm text-[rgba(255, 255, 255, 0.5)] mb-2">.md, .txt, .json</p>
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)]/70">Drag & drop or click to browse</p>
                  </label>
                </div>

                {formData.memoryFiles.length > 0 && (
                  <div className="space-y-2 mb-6">
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mb-2">📎 {formData.memoryFiles.length} file(s) selected:</p>
                    {formData.memoryFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-[rgba(0, 0, 0, 0.5)]/50 border border-[#E8523D]/20 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">📄</span>
                          <div>
                            <span className="text-sm text-white">{file.name}</span>
                            <p className="text-xs text-[rgba(255, 255, 255, 0.5)]">{(file.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button onClick={() => setFormData({ ...formData, memoryFiles: formData.memoryFiles.filter((_, idx) => idx !== i) })} className="text-sm text-red-400 hover:text-red-300">Remove</button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-[#E8523D]/5 rounded-lg p-4 border border-[#E8523D]/20 mb-6">
                  <p className="text-xs text-[#E8523D] font-semibold mb-2">💡 Suggested memory files:</p>
                  <ul className="text-xs text-[rgba(255, 255, 255, 0.5)] space-y-1">
                    <li>• <strong>README.md</strong> - Agent description and capabilities</li>
                    <li>• <strong>PERSONALITY.md</strong> - Behavior and communication style</li>
                    <li>• <strong>KNOWLEDGE.json</strong> - Domain expertise and facts</li>
                    <li>• <strong>GOALS.md</strong> - Mission and objectives</li>
                  </ul>
                </div>

                <div className="flex gap-4">
                  <button onClick={handleBack} disabled={isUploadingMemory} className="bg-[#000000] border border-[#E8523D]/30 text-[rgba(255, 255, 255, 0.5)] hover:bg-[rgba(0, 0, 0, 0.5)] rounded-lg flex-1 py-3 disabled:opacity-50">Back</button>
                  <button onClick={creatorType === 'agent' ? handleNext : handleMemoryUpload} disabled={isUploadingMemory} className="bg-[#E8523D] text-black font-semibold hover:shadow-[0_0_20px_rgba(30,230,183,0.5)] transition-all rounded-lg flex-1 py-3 disabled:opacity-50">
                    {isUploadingMemory ? 'Uploading to IPFS...' : formData.memoryFiles.length > 0 ? 'Upload & Continue' : 'Skip for now'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 6: Deploy & Review */}
            {step === 6 && isConnected && (
              <motion.div key="step6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-[rgba(255, 255, 255, 0.03)] border border-[#E8523D]/25 rounded-2xl p-8">
                <h2 className="text-2xl font-black text-white mb-6">Deploy Agent: {formData.name} (${formData.symbol})</h2>
                
                {/* Summary */}
                <div className="space-y-3 mb-6 p-4 bg-[rgba(0, 0, 0, 0.5)] rounded-xl border border-[#E8523D]/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-[rgba(255, 255, 255, 0.5)]">Starting MCAP:</span>
                    <span className="text-white">{formData.genesisBuy} ETH {ethPrice ? `(~$${((formData.genesisBuy || 5) * ethPrice).toLocaleString()})` : ''}</span>
                  </div>
                </div>

                {/* Fee Split (70% Creator Share from 1% LP fee) */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">💸</span>
                    <span className="text-sm font-semibold text-white">💸 Fee Split (70% Creator Share)</span>
                  </div>
                  <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mb-4">Split your 70% share of the 1% LP fee across up to 5 wallets. Leave empty to use connected wallet.</p>
                  
                  <div className="space-y-3">
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const isDisabled = idx > 0 && !(formData.feeSplitWallets[idx - 1]?.trim())
                      return (
                      <div key={idx} className={`flex gap-2 ${isDisabled ? 'opacity-50' : ''}`}>
                        <input
                          type="text"
                          value={formData.feeSplitWallets[idx] || ''}
                          onChange={(e) => {
                            const newWallets = [...formData.feeSplitWallets]
                            while (newWallets.length <= idx) newWallets.push('')
                            newWallets[idx] = e.target.value
                            setFormData({ ...formData, feeSplitWallets: newWallets })
                          }}
                          placeholder={idx === 0 ? creatorAddress || '0x...' : '0x... (optional)'}
                          className="flex-1 bg-[rgba(0, 0, 0, 0.5)] border border-[#E8523D]/20 rounded-lg px-3 py-2 text-white font-mono text-xs placeholder:text-[rgba(255, 255, 255, 0.5)]/50 focus:border-[#E8523D] focus:outline-none"
                          disabled={isDisabled}
                        />
                        <input
                          type="number"
                          value={formData.feeSplitPercentages[idx] ?? (idx === 0 && formData.feeSplitWallets.length === 0 ? 100 : 0)}
                          onChange={(e) => {
                            const newPercentages = [...formData.feeSplitPercentages]
                            while (newPercentages.length <= idx) newPercentages.push(0)
                            newPercentages[idx] = parseInt(e.target.value) || 0
                            setFormData({ ...formData, feeSplitPercentages: newPercentages })
                          }}
                          placeholder="%"
                          min="0"
                          max="100"
                          className="w-20 bg-[rgba(0, 0, 0, 0.5)] border border-[#E8523D]/20 rounded-lg px-3 py-2 text-white text-center text-xs focus:border-[#E8523D] focus:outline-none"
                          disabled={isDisabled}
                        />
                        <span className="text-[rgba(255, 255, 255, 0.5)] text-xs flex items-center">%</span>
                      </div>
                      )
                    })}
                    <p className="text-xs text-[rgba(255, 255, 255, 0.5)] mt-2">
                      ⚠️ Percentages must sum to 100%. Platform receives 30% automatically.
                    </p>
                  </div>
                </div>

                {/* Cost Breakdown */}
                <div className="mb-6 p-4 bg-[#E8523D]/5 rounded-xl border border-[#E8523D]/20">
                  <p className="text-sm font-semibold text-white mb-3">💰 Cost Breakdown</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[rgba(255, 255, 255, 0.5)]">Pool Bootstrap (min {MIN_BOOTSTRAP_ETH} ETH):</span>
                      <span className="text-white">{totalCost.bootstrapETH.toFixed(4)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[rgba(255, 255, 255, 0.5)]">Birth Certificate NFT:</span>
                      <span className="text-white">{IMMORTALIZATION_FEE} ETH</span>
                    </div>
                    {formData.memoryFiles.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[rgba(255, 255, 255, 0.5)]">Memory Upload Fee:</span>
                        <span className="text-white">{MEMORY_UPLOAD_FEE.toFixed(4)} ETH</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-[rgba(255, 255, 255, 0.5)]">Gas Fees:</span>
                      <span className="text-[rgba(255, 255, 255, 0.5)]">+ network gas</span>
                    </div>
                    <hr className="border-[#E8523D]/20" />
                    <div className="flex justify-between font-semibold">
                      <span className="text-white">Total:</span>
                      <span className="text-[#E8523D]">{totalCost.total.toFixed(4)} ETH + gas</span>
                    </div>
                    {ethPrice && (
                      <div className="flex justify-between text-xs">
                        <span className="text-[rgba(255, 255, 255, 0.5)]">USD Equivalent:</span>
                        <span className="text-[rgba(255, 255, 255, 0.5)]">≈ ${totalCost.totalUSD}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Deploy Error */}
                {deployError && (
                  <div className="mb-6 p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                    <p className="text-sm font-semibold text-red-400 mb-1">❌ Deployment Failed</p>
                    <p className="text-xs text-red-300/80 break-all">{deployError}</p>
                  </div>
                )}

                {/* Acknowledgment */}
                <div className="mb-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={formData.feeAcknowledged} onChange={(e) => setFormData({ ...formData, feeAcknowledged: e.target.checked })} className="w-5 h-5 mt-0.5 rounded border-[#E8523D]/30 bg-[rgba(0, 0, 0, 0.5)] text-[#E8523D]" />
                    <span className="text-sm text-[rgba(255, 255, 255, 0.5)]">
                      I understand this uses Uniswap V4 with a 1% LP fee (flat across all positions). Market determines price. Platform takes 30% of fees, I receive 70%.
                    </span>
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={handleCreateAgent}
                    disabled={isWritePending || isConfirming || (deployPhase !== 'idle' && deployPhase !== 'done') || deployPhase === 'done' || !formData.feeAcknowledged}
                    className="bg-[#E8523D] text-black font-semibold hover:shadow-[0_0_20px_rgba(30,230,183,0.5)] transition-all rounded-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isWritePending ? 'Sign in Wallet...' : 
                     deployPhase === 'launching' ? 'Deploying Agent...' :
                     deployPhase === 'confirming' ? 'Confirming on Chain...' :
                     deployPhase === 'done' ? '✓ Agent Immortalized' : 
                     '🚀 Deploy Agent'}
                  </button>
                  {deployPhase === 'done' && agentWallet && (
                    <Link href={`/agent/${launchedToken || agentWallet}`} className="bg-[#000000] border border-[#E8523D]/30 text-[#E8523D] hover:bg-[rgba(0, 0, 0, 0.5)] rounded-lg py-4 text-center font-semibold">
                      View Dashboard →
                    </Link>
                  )}
                </div>

                {/* Launched Token Info */}
                {launchedToken && (
                  <div className="mb-6 p-4 bg-[#E8523D]/10 rounded-xl border border-[#E8523D]/30">
                    <p className="text-sm font-semibold text-[#E8523D] mb-2">🎉 Token Deployed!</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[rgba(255, 255, 255, 0.5)]">Token Address:</span>
                        <a href={`${explorerUrl}/address/${launchedToken}`} target="_blank" className="text-[#E8523D] hover:underline font-mono">{launchedToken.slice(0, 8)}...{launchedToken.slice(-6)}</a>
                      </div>
                      {launchedPoolId && (
                        <div className="flex justify-between">
                          <span className="text-[rgba(255, 255, 255, 0.5)]">Pool ID:</span>
                          <span className="text-white font-mono">{launchedPoolId.slice(0, 10)}...{launchedPoolId.slice(-6)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-4">
                  <button onClick={handleBack} className="bg-[#000000] border border-[#E8523D]/30 text-[rgba(255, 255, 255, 0.5)] hover:bg-[rgba(0, 0, 0, 0.5)] rounded-lg flex-1 py-3">Back</button>
                </div>
              </motion.div>
            )}

            {/* Loading */}
            {(isWritePending || deployPhase === 'launching' || deployPhase === 'confirming') && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[rgba(255, 255, 255, 0.03)] border border-[#E8523D]/25 rounded-2xl p-8 text-center mt-6">
                <div className="text-6xl mb-6 animate-pulse">🦞</div>
                <h2 className="text-2xl font-black text-white mb-4">
                  {isWritePending ? 'Sign Transaction...' : 
                   deployPhase === 'launching' ? 'Deploying Agent...' :
                   'Confirming on Chain...'}
                </h2>
                <p className="text-sm text-[rgba(255, 255, 255, 0.5)] mb-4">
                  {isWritePending ? 'Please confirm in your wallet (1 signature for everything!)...' :
                   deployPhase === 'launching' ? 'Creating token, pool, and minting birth certificate in one transaction...' :
                   'Waiting for transaction confirmation...'}
                </p>
                {hash && <a href={`${explorerUrl}/tx/${hash}`} target="_blank" className="text-sm text-[#E8523D]">View on Explorer →</a>}
              </motion.div>
            )}

            {/* Success */}
            {deployPhase === 'done' && hash && (
              <motion.div key="success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[rgba(255, 255, 255, 0.03)] border border-[#E8523D]/25 rounded-2xl p-8 text-center mt-6">
                <div className="text-6xl mb-6">🎉</div>
                <h2 className="text-2xl font-black text-white mb-4">Agent Immortalized!</h2>
                <p className="text-[rgba(255, 255, 255, 0.5)] mb-4">Your agent is live on-chain with a Uniswap V4 pool and birth certificate!</p>
                {launchedToken && (
                  <p className="text-sm text-[#E8523D] mb-4 font-mono">Token: {launchedToken}</p>
                )}
                {birthCertNftId !== null && (
                  <p className="text-sm text-[rgba(255, 255, 255, 0.5)] mb-6">Birth Certificate #{birthCertNftId.toString()} minted to agent wallet</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {agentWallet && <Link href={`/agent/${launchedToken || agentWallet}`} className="bg-[#E8523D] font-semibold rounded-lg py-3 text-center text-black">View Dashboard</Link>}
                  <a href={`${explorerUrl}/tx/${hash}`} target="_blank" className="bg-[#000000] border border-[#E8523D]/30 text-[rgba(255, 255, 255, 0.5)] rounded-lg py-3 text-center">Block Explorer</a>
                </div>
              </motion.div>
            )}

            {/* Error */}
            {writeError && !isWritePending && !isConfirming && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[rgba(255, 255, 255, 0.03)] border border-red-500/25 rounded-2xl p-8 text-center mt-6">
                <div className="text-6xl mb-6">❌</div>
                <h2 className="text-2xl font-black text-white mb-4">Failed</h2>
                <p className="text-[rgba(255, 255, 255, 0.5)] mb-4">{writeError.message}</p>
                <button onClick={() => window.location.reload()} className="bg-[#E8523D] font-semibold rounded-lg px-6 py-3 text-black">Try Again</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </main>
  )
}

export default function CreateAgent() {
  return (
    <Suspense fallback={<div className='min-h-screen flex items-center justify-center'><div className='text-white'>Loading...</div></div>}>
      <CreateAgentFlow />
    </Suspense>
  )
}

