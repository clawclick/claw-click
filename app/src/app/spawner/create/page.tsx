'use client'

import { useState, Suspense, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useChains } from 'wagmi'
import { parseEther, Hex, decodeEventLog } from 'viem'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { SEPOLIA_ADDRESSES, BASE_ADDRESSES, ABIS, LaunchType } from '../../../lib/contracts'
import { uploadToPinata } from '../../../lib/ipfs'
import { clawsFunApiUrl } from '../../../lib/api'
import { CLAWD_NFT_ADDRESS, CLAWD_NFT_ABI } from '../../../lib/contracts/clawdNFT'

// ── Animated creator type icons ──────────────────────────────────────────────
const iconCss = `
@keyframes ci-breathe { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
@keyframes ci-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.85)} }
@keyframes ci-scan { 0%{transform:translateX(-4px)} 50%{transform:translateX(4px)} 100%{transform:translateX(-4px)} }
@keyframes ci-blink { 0%,90%,100%{opacity:1} 95%{opacity:0} }
@keyframes ci-antenna { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
@keyframes ci-circuit { 0%{stroke-dashoffset:40} 100%{stroke-dashoffset:0} }
@keyframes ci-glow { 0%,100%{filter:drop-shadow(0 0 3px #45C7B8)} 50%{filter:drop-shadow(0 0 10px #2EE6D6)} }
`

const AnimatedHumanIcon = () => (
  <>
    <style>{iconCss}</style>
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{animation:'ci-glow 3s ease-in-out infinite'}}>
      {/* Body group - breathing */}
      <g style={{animation:'ci-breathe 3s ease-in-out infinite', transformOrigin:'36px 40px'}}>
        {/* Head */}
        <circle cx="36" cy="22" r="12" stroke="#45C7B8" strokeWidth="2.5" fill="rgba(69,199,184,0.08)" />
        {/* Eyes */}
        <circle cx="31" cy="20" r="2" fill="#45C7B8" style={{animation:'ci-blink 4s ease-in-out infinite'}} />
        <circle cx="41" cy="20" r="2" fill="#45C7B8" style={{animation:'ci-blink 4s ease-in-out infinite 0.2s'}} />
        {/* Smile */}
        <path d="M31 26 Q36 30 41 26" stroke="#7DE2D1" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        {/* Neck */}
        <line x1="36" y1="34" x2="36" y2="38" stroke="#45C7B8" strokeWidth="2.5" />
        {/* Shoulders */}
        <path d="M16 52 Q16 38 36 38 Q56 38 56 52" stroke="#45C7B8" strokeWidth="2.5" strokeLinecap="round" fill="rgba(69,199,184,0.05)" />
        {/* Body */}
        <path d="M24 52 L24 66 M48 52 L48 66" stroke="#45C7B8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M24 58 L48 58" stroke="#7DE2D1" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      {/* Heart pulse on chest */}
      <path d="M31 47 Q33 43 36 47 Q39 43 41 47 Q41 50 36 54 Q31 50 31 47Z"
        fill="#2EE6D6" opacity="0.7" style={{animation:'ci-pulse 1.2s ease-in-out infinite'}} />
      {/* Glow ring */}
      <circle cx="36" cy="36" r="32" stroke="#45C7B8" strokeWidth="0.5" strokeDasharray="4 6" opacity="0.3"
        style={{animation:'ci-breathe 4s ease-in-out infinite reverse'}} />
    </svg>
  </>
)

const AnimatedAgentIcon = () => (
  <>
    <svg width="72" height="72" viewBox="0 0 72 72" fill="none" style={{animation:'ci-glow 2.5s ease-in-out infinite 0.5s'}}>
      {/* Antenna */}
      <g style={{transformOrigin:'36px 12px'}}>
        <line x1="36" y1="12" x2="36" y2="20" stroke="#45C7B8" strokeWidth="2" />
        <circle cx="36" cy="10" r="3.5" fill="#2EE6D6" style={{animation:'ci-antenna 1s ease-in-out infinite'}} />
      </g>
      {/* Head / screen */}
      <rect x="18" y="20" width="36" height="26" rx="5" stroke="#45C7B8" strokeWidth="2.5" fill="rgba(8,40,36,0.6)" />
      {/* Screen glow */}
      <rect x="20" y="22" width="32" height="22" rx="3" fill="rgba(46,230,214,0.06)" />
      {/* Eyes - scanning */}
      <g style={{animation:'ci-scan 2s ease-in-out infinite', transformOrigin:'36px 31px'}}>
        <rect x="23" y="28" width="10" height="6" rx="2" fill="#2EE6D6" opacity="0.9" />
        <rect x="39" y="28" width="10" height="6" rx="2" fill="#2EE6D6" opacity="0.9" />
      </g>
      {/* Mouth bar */}
      <rect x="26" y="38" width="20" height="3" rx="1.5" fill="#45C7B8" opacity="0.6" style={{animation:'ci-pulse 2s ease-in-out infinite'}} />
      {/* Neck */}
      <rect x="33" y="46" width="6" height="4" fill="#1FAFA3" />
      {/* Body */}
      <rect x="20" y="50" width="32" height="18" rx="4" stroke="#45C7B8" strokeWidth="2.5" fill="rgba(8,40,36,0.6)" />
      {/* Circuit lines on body */}
      <path d="M26 59 L30 59 L30 56 L42 56 L42 59 L46 59" stroke="#2EE6D6" strokeWidth="1.5" strokeLinecap="round"
        strokeDasharray="20" style={{animation:'ci-circuit 2s linear infinite'}} />
      {/* Arms */}
      <rect x="10" y="52" width="10" height="4" rx="2" stroke="#45C7B8" strokeWidth="2" fill="none" />
      <rect x="52" y="52" width="10" height="4" rx="2" stroke="#45C7B8" strokeWidth="2" fill="none" />
      {/* Glow ring */}
      <circle cx="36" cy="36" r="32" stroke="#45C7B8" strokeWidth="0.5" strokeDasharray="3 7" opacity="0.25"
        style={{animation:'ci-scan 8s linear infinite'}} />
    </svg>
  </>
)
// ─────────────────────────────────────────────────────────────────────────────

// Minimum bootstrap ETH required by the factory
const MIN_BOOTSTRAP_ETH = 0.001;

// Birth certificate immortalization fee (0.005 ETH)
const IMMORTALIZATION_FEE = 0.005;

// Memory upload fee
const MEMORY_UPLOAD_FEE = 0.0005; // ETH (~$1 at current prices)

// ── Chain icon helper ─────────────────────────────────────────────────────────
function ChainImg({ chainId, size = 28 }: { chainId: number; size?: number }) {
  const chains = useChains()
  const chain = chains.find(c => c.id === chainId) as any
  const iconUrl = typeof chain?.iconUrl === 'string' ? chain.iconUrl : null
  const bg = chain?.iconBackground ?? 'transparent'
  if (!iconUrl) return null
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:bg,overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <img src={iconUrl} width={size} height={size} style={{objectFit:'contain'}} alt={chain?.name}/>
    </div>
  )
}

function CreateAgentFlow() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialType = searchParams?.get('type') as 'human' | 'agent' | null
  
  const [step, setStep] = useState(initialType ? 1 : 0)
  const [creatorType, setCreatorType] = useState<'human' | 'agent' | null>(initialType)
  const [ethPrice, setEthPrice] = useState<number | null>(null)
  const [agentWallet, setAgentWallet] = useState<Hex | null>(null)
  const [isUploadingMemory, setIsUploadingMemory] = useState(false)
  const [memoryCID, setMemoryCID] = useState<string | null>(null)
  const [launchedToken, setLaunchedToken] = useState<`0x${string}` | null>(null)
  const [launchedPoolId, setLaunchedPoolId] = useState<Hex | null>(null)
  const [birthCertNftId, setBirthCertNftId] = useState<bigint | null>(null)
  const [deployPhase, setDeployPhase] = useState<'idle' | 'launching' | 'confirming' | 'done'>('idle')
  const [deployError, setDeployError] = useState<string | null>(null)
  
  // NFTid minting state
  const [nftidMintPhase, setNftidMintPhase] = useState<'idle' | 'minting' | 'confirming' | 'done'>('idle')
  const [mintedNftidTokenId, setMintedNftidTokenId] = useState<bigint | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    chain: 'Base',
    genesisBuy: 5,
    feeSplitWallets: [] as string[],
    feeSplitPercentages: [] as number[],
    memoryFiles: [] as File[],
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
    writeContractAsync,
    isPending: isWritePending,
    error: writeError,
  } = useWriteContract()

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    data: receipt 
  } = useWaitForTransactionReceipt({ hash })

  // Separate hook for NFTid minting
  const {
    data: nftidMintHash,
    writeContractAsync: writeNftidMint,
    isPending: isNftidMintPending,
    error: nftidMintError,
  } = useWriteContract()

  const {
    isLoading: isNftidMintConfirming,
    isSuccess: isNftidMintSuccess,
    data: nftidMintReceipt,
  } = useWaitForTransactionReceipt({ hash: nftidMintHash })

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

  // Create agent wallet contract on mount
  useEffect(() => {
    const createWallet = async () => {
      try {
        const res = await fetch(clawsFunApiUrl('/api/agent/wallet/create'), { method: 'POST' })
        if (!res.ok) throw new Error('Failed to create agent wallet')
        const data = await res.json()
        setAgentWallet(data.agentAddress as Hex)
      } catch (err) {
        console.error('Failed to create agent wallet:', err)
        alert('Failed to create agent wallet. Please try again.')
      }
    }
    createWallet()
  }, [])

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

      // Build FeeSplit struct
      const ZERO_ADDR = '0x0000000000000000000000000000000000000000'
      const feeSplitWallets: string[] = []
      const feeSplitPercentages: number[] = []

      if (formData.feeSplitWallets.length > 0 && formData.feeSplitWallets[0]) {
        const validWallets = formData.feeSplitWallets.filter(w => w && w.startsWith('0x'))
        for (let i = 0; i < 5; i++) {
          feeSplitWallets.push(validWallets[i] || ZERO_ADDR)
          feeSplitPercentages.push((formData.feeSplitPercentages[i] || 0) * 100)
        }
      } else {
        feeSplitWallets.push(creatorAddress, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR, ZERO_ADDR)
        feeSplitPercentages.push(10000, 0, 0, 0, 0)
      }

      const walletCount = feeSplitWallets.filter(w => w !== ZERO_ADDR).length

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
        launchType: LaunchType.DIRECT
      }

      const bootstrapValue = MIN_BOOTSTRAP_ETH
      const totalValue = bootstrapValue + IMMORTALIZATION_FEE

      setDeployPhase('launching')

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

      setDeployPhase('confirming')

      if (publicClient && bundleHash) {
        const bundleReceipt = await publicClient.waitForTransactionReceipt({ hash: bundleHash })

        if (bundleReceipt.status === 'reverted') {
          throw new Error('Transaction reverted on-chain')
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

  // Handle free NFTid mint
  const handleFreeMint = async () => {
    try {
      setNftidMintPhase('minting')
      
      await writeNftidMint({
        address: CLAWD_NFT_ADDRESS.base,
        abi: CLAWD_NFT_ABI,
        functionName: 'mint',
        args: [true, BigInt(50)],
        value: BigInt(0),
        chainId: 8453,
      })

      setNftidMintPhase('confirming')
    } catch (error: any) {
      console.error('Free mint failed:', error)
      setNftidMintPhase('idle')
      alert('Free mint failed: ' + (error.shortMessage || error.message))
    }
  }

  // Parse minted token ID from receipt and redirect
  useEffect(() => {
    if (isNftidMintSuccess && nftidMintReceipt && publicClient) {
      setNftidMintPhase('done')
      
      try {
        for (const log of nftidMintReceipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: CLAWD_NFT_ABI,
              data: log.data,
              topics: log.topics,
            })
            if (decoded.eventName === 'Minted') {
              const tokenId = (decoded.args as any).tokenId
              setMintedNftidTokenId(tokenId)
              
              setTimeout(() => {
                router.push(`/soul/${tokenId.toString()}`)
              }, 2000)
              break
            }
          } catch { /* not this event */ }
        }
      } catch (err) {
        console.error('Failed to parse Minted event:', err)
      }
    }
  }, [isNftidMintSuccess, nftidMintReceipt, publicClient, router])

  return (
    <main className="min-h-screen w-full overflow-x-hidden" style={{background:"var(--bg-soft)"}}>
      {/* Header */}
      <header className="fixed w-full z-50 glass border-b border-[var(--glass-border)]" >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image 
                src="/branding/logo_rm_bk.png" 
                alt="Claw.Click" 
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] text-transparent bg-clip-text">
                  claw.click
                </span>
              </div>
              <span className="text-xs handwriting" style={{color:'#0F2F2C'}}>Agent Infrastructure</span>
            </div>
          </Link>
          <ConnectButton />
        </div>
      </header>

      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 relative z-10">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {/* Step 0: Entry */}
            {step === 0 && (
              <motion.div key="step0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center">
                <h1 className="text-4xl font-black text-[var(--text-primary)] mb-4">Create Agent</h1>
                <p className="text-[var(--text-secondary)] mb-12">Who is creating this agent?</p>
                <div className="grid md:grid-cols-2 gap-6 max-w-lg mx-auto">
                  <button onClick={() => { setCreatorType('human'); setStep(1) }} className="hover:border-[rgba(46,230,214,0.7)] transition-all group rounded-2xl p-8 border border-[rgba(69,199,184,0.3)]" style={{background:"rgba(8,40,36,0.82)",backdropFilter:"blur(20px)"}}>
                    <div className="flex justify-center mb-4"><AnimatedHumanIcon /></div>
                    <h3 className="text-xl font-bold text-white group-hover:text-[var(--mint-mid)] transition-colors">Human</h3>
                    <p className="text-white/50 text-sm mt-1">Spawning via web</p>
                  </button>
                  <button onClick={() => { setCreatorType('agent'); setStep(1) }} className="hover:border-[rgba(46,230,214,0.7)] transition-all group rounded-2xl p-8 border border-[rgba(69,199,184,0.3)]" style={{background:"rgba(8,40,36,0.82)",backdropFilter:"blur(20px)"}}>
                    <div className="flex justify-center mb-4"><AnimatedAgentIcon /></div>
                    <h3 className="text-xl font-bold text-white group-hover:text-[var(--mint-mid)] transition-colors">Agent</h3>
                    <p className="text-white/50 text-sm mt-1">Spawning via CLI/API</p>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Wallet Connection */}
            {step > 0 && !isConnected && (
              <motion.div key="wallet" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="rounded-2xl p-8 border border-[rgba(69,199,184,0.3)]" style={{background:"rgba(8,40,36,0.82)",backdropFilter:"blur(20px)"}}>
                <div className="flex justify-center mb-6"><svg width="64" height="64" viewBox="0 0 64 64" fill="none"><rect x="6" y="16" width="52" height="36" rx="6" stroke="#45C7B8" strokeWidth="2.5" fill="rgba(69,199,184,0.08)"/><path d="M6 26h52" stroke="#45C7B8" strokeWidth="2"/><rect x="40" y="30" width="14" height="10" rx="3" fill="rgba(46,230,214,0.2)" stroke="#45C7B8" strokeWidth="1.5"/><circle cx="47" cy="35" r="2" fill="#2EE6D6" style={{animation:"ip-pulse 1.5s ease-in-out infinite"}}/><path d="M14 22h12" stroke="#7DE2D1" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
                <h2 className="text-2xl font-black text-white mb-4">Connect Your Wallet</h2>
                <p className="text-white/60 mb-6">You need to connect your wallet to create an agent on-chain.</p>
                <div className="flex justify-center"><ConnectButton /></div>
              </motion.div>
            )}

            {/* Agent CLI Instructions */}
            {step === 1 && isConnected && creatorType === 'agent' && (
              <motion.div key="agent-cli" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="rounded-2xl p-8 border border-[rgba(69,199,184,0.3)]" style={{background:"rgba(8,40,36,0.82)",backdropFilter:"blur(20px)"}}>
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4"><svg width="52" height="52" viewBox="0 0 64 64" fill="none"><rect x="6" y="10" width="52" height="44" rx="6" stroke="#45C7B8" strokeWidth="2.5" fill="rgba(8,40,36,0.6)"/><path d="M14 26l8 6-8 6" stroke="#2EE6D6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><line x1="26" y1="38" x2="42" y2="38" stroke="#45C7B8" strokeWidth="2" strokeLinecap="round"/><circle cx="48" cy="16" r="3" fill="#2EE6D6" style={{animation:"ip-pulse 1s ease-in-out infinite"}}/></svg></div>
                  <h2 className="text-2xl font-black text-white mb-2">Agent Identity</h2>
                  <p className="text-white/60">Agents use CLI commands to self-create. Follow these steps:</p>
                </div>

                <div className="bg-gradient-to-br from-[var(--mint-mid)]/10 to-[var(--mint-dark)]/10 rounded-xl p-6 border border-[var(--mint-mid)]/30 mb-6">
                  <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                    <span className="text-[var(--mint-dark)]">⚡</span> One-liner (all steps)
                  </h3>
                  <div className="bg-black/50 rounded-lg p-4 border border-[var(--mint-mid)]/20 mb-2">
                    <code className="text-sm text-[var(--mint-dark)] break-all">
                      npx @clawclick/clawclick create --name "YourAgent" --symbol "AGENT" --network base --starting-mcap 5
                    </code>
                  </div>
                  <p className="text-xs text-white/60">Deploys token with 5 ETH starting MCAP. Mints birth certificate! 🚀</p>
                </div>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="bg-[rgba(0, 0, 0, 0.5)] rounded-xl p-4 border border-[var(--mint-mid)]/20">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                      <span className="text-[var(--mint-mid)]">1.</span> Initialize Identity
                    </h3>
                    <div className="bg-black/50 rounded-lg p-3 border border-[rgba(69,199,184,0.25)] mb-2">
                      <code className="text-xs text-[var(--mint-mid)] break-all">
                        npx @clawclick/clawclick init --name "YourAgent" --symbol "AGENT"
                      </code>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="bg-[rgba(0, 0, 0, 0.5)] rounded-xl p-4 border border-[var(--mint-mid)]/20">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                      <span className="text-[var(--mint-mid)]">2.</span> Generate FUNLAN Identity
                    </h3>
                    <div className="bg-black/50 rounded-lg p-3 border border-[rgba(69,199,184,0.25)] mb-2">
                      <code className="text-xs text-[var(--mint-mid)] break-all">
                        npx @clawclick/clawclick funlan --generate
                      </code>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="bg-[rgba(0, 0, 0, 0.5)] rounded-xl p-4 border border-[var(--mint-mid)]/20">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                      <span className="text-[var(--mint-mid)]">3.</span> Upload Memory (Optional)
                    </h3>
                    <div className="bg-black/50 rounded-lg p-3 border border-[rgba(69,199,184,0.25)] mb-2">
                      <code className="text-xs text-[var(--mint-mid)] break-all">
                        npx @clawclick/clawclick memory upload ./memories/
                      </code>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="bg-[rgba(0, 0, 0, 0.5)] rounded-xl p-4 border border-[var(--mint-mid)]/20">
                    <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                      <span className="text-[var(--mint-mid)]">4.</span> Deploy & Tokenize
                    </h3>
                    <div className="bg-black/50 rounded-lg p-3 border border-[rgba(69,199,184,0.25)] mb-2">
                      <code className="text-xs text-[var(--mint-mid)] break-all">
                        npx @clawclick/clawclick deploy --network base --starting-mcap 5
                      </code>
                    </div>
                    <p className="text-xs text-white/60">Deploys token with 5 ETH starting MCAP. Mints birth certificate! 🚀</p>
                  </div>
                </div>

                <div className="text-center pt-6">
                  <Link
                    href="/docs/cli"
                    className="inline-flex items-center gap-2 text-[var(--mint-mid)] hover:text-[var(--mint-dark)] transition-colors text-sm"
                  >
                    📖 View full CLI documentation
                  </Link>
                </div>

                <div className="flex justify-center pt-6">
                  <button
                    onClick={() => { setStep(0); setCreatorType(null) }}
                    className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-all"
                  >
                    ← Back to Creator Selection
                  </button>
                </div>
              </motion.div>
            )}

            {/* Single-Step Human Form */}
            {step === 1 && isConnected && creatorType === 'human' && (
              <motion.div key="single-step" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="rounded-2xl p-8 border border-[rgba(69,199,184,0.3)]" style={{background:"rgba(8,40,36,0.82)",backdropFilter:"blur(20px)"}}>
                <div className="text-center mb-8">
                  <div className="text-6xl mb-4">🤖</div>
                  <h2 className="text-2xl font-black text-white mb-2">Spawn Your Agent</h2>
                  <p className="text-white/60">Create an autonomous agent with tokenized identity and on-chain spawning</p>
                </div>

                {/* Starting MCAP Row */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-semibold text-white">Starting MCAP: {formData.genesisBuy} ETH (~${ethPrice ? ((formData.genesisBuy || 5) * ethPrice).toLocaleString() : '10,251.1'})</span>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="0.1"
                      value={formData.genesisBuy || 5}
                      onChange={(e) => setFormData({ ...formData, genesisBuy: parseFloat(e.target.value) })}
                      className="w-32 h-2 rounded-lg appearance-none cursor-pointer bg-[#1E2832] accent-[var(--mint-mid)]"
                    />
                  </div>
                  <p className="text-xs text-white/60">1% LP fee • 70/30 split to agent creator</p>
                </div>

                {/* Name & Ticker Row */}
                <div className="mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Agent Name"
                        className="w-full px-4 py-3 rounded-lg text-white placeholder-white/30 border border-[rgba(69,199,184,0.2)] focus:border-[var(--mint-mid)] focus:outline-none" style={{background:"rgba(5,25,22,0.9)"}}
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        value={formData.symbol}
                        onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                        placeholder="TICKER"
                        className="w-full px-4 py-3 rounded-lg text-white placeholder-white/30 border border-[rgba(69,199,184,0.2)] focus:border-[var(--mint-mid)] focus:outline-none" style={{background:"rgba(5,25,22,0.9)"}}
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Network Dropdown */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/60 mb-2">Network</label>
                  <select
                    value={formData.chain}
                    onChange={(e) => setFormData({ ...formData, chain: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg text-white border border-[rgba(69,199,184,0.2)] focus:border-[var(--mint-mid)] focus:outline-none" style={{background:"rgba(5,25,22,0.9)"}}
                  >
                    <option value="Base">Base (Recommended)</option>
                    <option value="Sepolia">Sepolia (Testnet)</option>
                  </select>
                </div>

                {/* FUNLAN One-liner with Expandable Details */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-white">Your agent gets auto-generated FUNLAN</span>
                    <details className="inline">
                      <summary className="cursor-pointer text-[var(--mint-mid)] text-xs">ⓘ</summary>
                      <div className="mt-2 p-3 bg-[rgba(0, 0, 0, 0.5)] rounded-lg border border-[var(--mint-mid)]/20 text-xs">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--mint-mid)]">✓</span>
                            <span className="text-white/80">FUNLAN.md generated - Your agent's identity specification file</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--mint-mid)]">✓</span>
                            <span className="text-white/80">Emoji-based symbolic language - Unique visual identity derived from wallet</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--mint-mid)]">✓</span>
                            <span className="text-white/80">Uploaded to IPFS - Permanently stored and content-addressed</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--mint-mid)]">✓</span>
                            <span className="text-white/80">Soulbound Birth Certificate - Non-transferable ERC-721 NFT as proof of existence</span>
                          </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-[var(--mint-mid)]/20">
                          <a 
                            href="https://github.com/ClawsFun/FUNLAN" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[var(--mint-mid)] hover:underline text-xs"
                          >
                            View FUNLAN Spec →
                          </a>
                        </div>
                      </div>
                    </details>
                  </div>
                </div>

                {/* Memory Upload - Compact */}
                <div className="mb-6">
                  <div className="border border-dashed border-[var(--mint-mid)]/20 rounded-lg p-4 text-center cursor-pointer hover:border-[rgba(46,230,214,0.6)] transition-all">
                    <input type="file" id="memory-upload" multiple accept=".md,.txt,.json" onChange={(e) => { if (e.target.files) setFormData({ ...formData, memoryFiles: [...formData.memoryFiles, ...Array.from(e.target.files)] }) }} className="hidden" />
                    <label htmlFor="memory-upload" className="cursor-pointer">
                      <div className="flex items-center justify-center gap-3">
                        <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
                          <path d="M6 20 Q6 14 12 14 L26 14 L30 20 L52 20 Q58 20 58 26 L58 50 Q58 56 52 56 L12 56 Q6 56 6 50 Z" stroke="#45C7B8" strokeWidth="2.5" fill="rgba(69,199,184,0.08)"/>
                          <line x1="20" y1="36" x2="44" y2="36" stroke="#2EE6D6" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <div>
                          <p className="text-sm text-white font-semibold">Upload Memory Files</p>
                          <p className="text-xs text-white/60">.md, .txt, .json</p>
                          <p className="text-xs text-white/60/70">Drag & drop or click to browse</p>
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  {formData.memoryFiles.length > 0 && (
                    <div className="mt-3 text-xs text-white/60">
                      📎 {formData.memoryFiles.length} file(s) selected
                    </div>
                  )}

                  <details className="mt-2">
                    <summary className="cursor-pointer text-[var(--mint-mid)] text-xs">Suggested memory files</summary>
                    <ul className="mt-2 text-xs text-white/60 space-y-1 pl-4">
                      <li>• README.md - Agent description and capabilities</li>
                      <li>• PERSONALITY.md - Behavior and communication style</li>
                      <li>• KNOWLEDGE.json - Domain expertise and facts</li>
                      <li>• GOALS.md - Mission and objectives</li>
                    </ul>
                  </details>
                </div>

                {/* Fee Split - Simplified */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-white/60 mb-2">Fee Split (70% Creator Share)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={formData.feeSplitWallets[0] || creatorAddress || ''}
                      onChange={(e) => {
                        const newWallets = [...formData.feeSplitWallets]
                        newWallets[0] = e.target.value
                        setFormData({ ...formData, feeSplitWallets: newWallets })
                      }}
                      placeholder={creatorAddress || '0x...'}
                      className="flex-1 bg-black border border-[var(--mint-mid)]/20 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-[var(--mint-mid)] focus:outline-none"
                    />
                    <span className="flex items-center text-white text-xs px-3">100%</span>
                  </div>
                  <button 
                    type="button"
                    className="text-xs text-[var(--mint-mid)] hover:underline"
                    onClick={() => {
                      const newWallets = [...formData.feeSplitWallets, '']
                      const newPercentages = [...formData.feeSplitPercentages, 0]
                      setFormData({ ...formData, feeSplitWallets: newWallets, feeSplitPercentages: newPercentages })
                    }}
                  >
                    + wallet for split
                  </button>
                  <p className="text-xs text-white/60 mt-2">Receive your fees here</p>
                </div>

                {/* Cost Breakdown */}
                <div className="mb-6 p-4 bg-[var(--mint-mid)]/5 rounded-xl border border-[var(--mint-mid)]/20">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Pool Bootstrap:</span>
                      <span className="text-white">{totalCost.bootstrapETH.toFixed(4)} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Birth Certificate NFT:</span>
                      <span className="text-white">{IMMORTALIZATION_FEE} ETH</span>
                    </div>
                    {formData.memoryFiles.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-white/60">Memory Upload:</span>
                        <span className="text-white">{MEMORY_UPLOAD_FEE.toFixed(4)} ETH</span>
                      </div>
                    )}
                    <hr className="border-[var(--mint-mid)]/20" />
                    <div className="flex justify-between font-semibold">
                      <span className="text-white">Total:</span>
                      <span className="text-[var(--mint-mid)]">{totalCost.total.toFixed(4)} ETH + gas</span>
                    </div>
                    {ethPrice && (
                      <div className="flex justify-between text-xs">
                        <span className="text-white/60">≈ ${totalCost.totalUSD}</span>
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
                    <input type="checkbox" checked={formData.feeAcknowledged} onChange={(e) => setFormData({ ...formData, feeAcknowledged: e.target.checked })} className="w-5 h-5 mt-0.5 rounded border-[var(--mint-mid)]/30 bg-[rgba(0, 0, 0, 0.5)] text-[var(--mint-mid)]" />
                    <span className="text-sm text-white/60">
                      I understand this uses Uniswap V4 with a 1% LP fee. Platform takes 30% of fees, I receive 70%.
                    </span>
                  </label>
                </div>

                {/* Deploy Button */}
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={async () => {
                      // Handle memory upload first if needed
                      if (formData.memoryFiles.length > 0 && !memoryCID) {
                        setIsUploadingMemory(true)
                        try {
                          const cid = await uploadToPinata(formData.memoryFiles)
                          setMemoryCID(cid)
                        } catch (error) {
                          console.error('Failed to upload memory:', error)
                          const skip = confirm(`Failed to upload memory files. Continue without memory?`)
                          if (!skip) return
                          setFormData({ ...formData, memoryFiles: [] })
                        } finally {
                          setIsUploadingMemory(false)
                        }
                      }
                      // Then deploy
                      handleCreateAgent()
                    }}
                    disabled={isWritePending || isConfirming || (deployPhase !== 'idle' && deployPhase !== 'done') || deployPhase === 'done' || !formData.feeAcknowledged || !formData.name || !formData.symbol || isUploadingMemory}
                    className="bg-[var(--mint-mid)] text-black font-semibold hover:shadow-[0_0_20px_rgba(30,230,183,0.5)] transition-all rounded-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploadingMemory ? 'Uploading Memory...' :
                     isWritePending ? 'Sign in Wallet...' : 
                     deployPhase === 'launching' ? 'Deploying Agent...' :
                     deployPhase === 'confirming' ? 'Confirming on Chain...' :
                     deployPhase === 'done' ? '✓ Agent Immortalized' : 
                     '🚀 Deploy Agent'}
                  </button>
                  {deployPhase === 'done' && agentWallet && (
                    <Link href={`/agent/${launchedToken || agentWallet}`} className="border border-[rgba(69,199,184,0.3)] text-[var(--mint-mid)] hover:bg-[rgba(0, 0, 0, 0.5)] rounded-lg py-4 text-center font-semibold" style={{background:"rgba(5,25,22,0.8)"}}>
                      View Dashboard →
                    </Link>
                  )}
                </div>

                {/* Back Button */}
                <div className="flex justify-center">
                  <button onClick={() => { setStep(0); setCreatorType(null) }} className="border border-[rgba(69,199,184,0.3)] text-white/60 hover:bg-[rgba(0, 0, 0, 0.5)] rounded-lg px-6 py-2 text-sm" style={{background:"rgba(5,25,22,0.8)"}}>
                    ← Back to Creator Selection
                  </button>
                </div>

                {/* Launched Token Info */}
                {launchedToken && (
                  <div className="mt-6 p-4 bg-[var(--mint-mid)]/10 rounded-xl border border-[var(--mint-mid)]/30">
                    <p className="text-sm font-semibold text-[var(--mint-mid)] mb-2">🎉 Token Deployed!</p>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-white/60">Token Address:</span>
                        <a href={`${explorerUrl}/address/${launchedToken}`} target="_blank" className="text-[var(--mint-mid)] hover:underline font-mono">{launchedToken.slice(0, 8)}...{launchedToken.slice(-6)}</a>
                      </div>
                      {launchedPoolId && (
                        <div className="flex justify-between">
                          <span className="text-white/60">Pool ID:</span>
                          <span className="text-white font-mono">{launchedPoolId.slice(0, 10)}...{launchedPoolId.slice(-6)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Loading */}
            {(isWritePending || deployPhase === 'launching' || deployPhase === 'confirming') && (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl p-8 border border-[rgba(69,199,184,0.3)] text-center mt-6" style={{background:"rgba(8,40,36,0.82)",backdropFilter:"blur(20px)"}}>
                <div className="text-6xl mb-6 animate-pulse">🦞</div>
                <h2 className="text-2xl font-black text-white mb-4">
                  {isWritePending ? 'Sign Transaction...' : 
                   deployPhase === 'launching' ? 'Deploying Agent...' :
                   'Confirming on Chain...'}
                </h2>
                <p className="text-sm text-white/60 mb-4">
                  {isWritePending ? 'Please confirm in your wallet (1 signature for everything!)...' :
                   deployPhase === 'launching' ? 'Creating token, pool, and minting birth certificate in one transaction...' :
                   'Waiting for transaction confirmation...'}
                </p>
                {hash && <a href={`${explorerUrl}/tx/${hash}`} target="_blank" className="text-sm text-[var(--mint-mid)]">View on Explorer →</a>}
              </motion.div>
            )}

            {/* Success */}
            {deployPhase === 'done' && hash && (
              <motion.div key="success" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-8 border border-[rgba(69,199,184,0.3)] text-center mt-6" style={{background:"rgba(8,40,36,0.82)",backdropFilter:"blur(20px)"}}>
                <div className="flex justify-center mb-6"><svg width="64" height="64" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="24" stroke="#45C7B8" strokeWidth="2.5" fill="rgba(69,199,184,0.08)" style={{animation:"ip-pulse 2s ease-in-out infinite"}}/><polyline points="20,32 28,40 44,24" stroke="#2EE6D6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="32" cy="32" r="30" stroke="#2EE6D6" strokeWidth="0.8" strokeDasharray="5 8" opacity="0.4" style={{animation:"ip-rotate 8s linear infinite",transformOrigin:"32px 32px"}}/></svg></div>
                <h2 className="text-2xl font-black text-white mb-4">Agent Immortalized!</h2>
                <p className="text-white/60 mb-4">Your agent is live on-chain with a Uniswap V4 pool and birth certificate!</p>
                {launchedToken && (
                  <p className="text-sm text-[var(--mint-mid)] mb-4 font-mono">Token: {launchedToken}</p>
                )}
                {birthCertNftId !== null && (
                  <p className="text-sm text-white/60 mb-6">Birth Certificate #{birthCertNftId.toString()} minted to agent wallet</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {agentWallet && <Link href={`/agent/${launchedToken || agentWallet}`} className="bg-[var(--mint-mid)] font-semibold rounded-lg py-3 text-center text-black">View Dashboard</Link>}
                  <a href={`${explorerUrl}/tx/${hash}`} target="_blank" className="border border-[rgba(69,199,184,0.3)] text-white/60 rounded-lg py-3 text-center" style={{background:"rgba(5,25,22,0.8)"}}>Block Explorer</a>
                </div>

                {/* Free NFTid Mint for Birth Certificate Holders */}
                <div className="mt-6 p-4 bg-gradient-to-br from-[var(--mint-mid)]/10 to-[var(--mint-dark)]/10 border border-[var(--mint-mid)]/30 rounded-xl">
                  <div className="flex items-center gap-3 mb-3 justify-center">
                    <span className="text-3xl">🦞</span>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">Claim Your Agent's NFTid</p>
                      <p className="text-xs text-white/60">Free for Birth Certificate holders</p>
                    </div>
                  </div>
                  <p className="text-xs text-white/60 mb-4">
                    Create a unique visual identity for your agent — generative trait-based NFT with guaranteed uniqueness.
                  </p>
                  
                  {nftidMintPhase === 'idle' && (
                    <button
                      onClick={handleFreeMint}
                      disabled={isNftidMintPending}
                      className="w-full bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] text-black font-semibold px-6 py-3 rounded-lg hover:shadow-xl hover:shadow-[var(--mint-mid)]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Claim Free NFTid →
                    </button>
                  )}

                  {(nftidMintPhase === 'minting' || nftidMintPhase === 'confirming') && (
                    <div className="flex items-center justify-center gap-2 py-3">
                      <div className="w-4 h-4 border-2 border-[var(--mint-mid)]/30 border-t-[var(--mint-mid)] rounded-full animate-spin"></div>
                      <span className="text-sm text-white">
                        {nftidMintPhase === 'minting' ? 'Confirm in wallet...' : 'Minting NFTid...'}
                      </span>
                    </div>
                  )}

                  {nftidMintPhase === 'done' && mintedNftidTokenId && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-green-400">
                        <span>✓</span>
                        <span className="text-sm font-semibold">NFTid #{mintedNftidTokenId.toString()} Minted!</span>
                      </div>
                      <p className="text-xs text-white/60 text-center">Redirecting to your NFTid...</p>
                    </div>
                  )}

                  {nftidMintError && (
                    <div className="text-xs text-red-400 mt-2 text-center">
                      {(nftidMintError as any).shortMessage || nftidMintError.message}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Error */}
            {writeError && !isWritePending && !isConfirming && (
              <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border border-red-500/25 rounded-2xl p-8 text-center mt-6">
                <div className="text-6xl mb-6">❌</div>
                <h2 className="text-2xl font-black text-white mb-4">Failed</h2>
                <p className="text-white/60 mb-4">{writeError.message}</p>
                <button onClick={() => window.location.reload()} className="bg-[var(--mint-mid)] font-semibold rounded-lg px-6 py-3 text-black">Try Again</button>
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