'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { clawsFunApiUrl } from '../../../lib/api'

const GPU_OPTIONS = [
  { id: 'any', label: 'Any GPU', desc: 'Cheapest available GPU', minPrice: 0.03 },
  { id: 'RTX 4060', label: 'RTX 4060', desc: '8GB VRAM, budget inference', minPrice: 0.06 },
  { id: 'RTX 4090', label: 'RTX 4090', desc: '24GB VRAM, fast inference', minPrice: 0.24 },
  { id: 'RTX 5090', label: 'RTX 5090', desc: '32GB VRAM, next-gen flagship', minPrice: 0.30 },
  { id: 'H100 SXM', label: 'H100 SXM', desc: '80GB VRAM, enterprise workloads', minPrice: 1.47 },
  { id: 'H200', label: 'H200', desc: '141GB HBM3e, next-gen datacenter', minPrice: 1.94 },
]

const LOCATION_TO_COUNTRIES: Record<string, string | undefined> = {
  any: undefined,
  US: 'US',
  CA: 'CA',
  GB: 'GB',
  EU: 'DE,FR,NL,ES,CZ,PL,BG,HU,DK',
  SE: 'SE,NO,IS,FI',
  JP: 'JP',
  KR: 'KR',
}

const GPU_RESOURCE_DEFAULTS: Record<string, { cpu: number; ram: number; disk: number }> = {
  'any':       { cpu: 2,  ram: 4,   disk: 10 },
  'RTX 4060':  { cpu: 6,  ram: 16,  disk: 20 },
  'RTX 4090':  { cpu: 8,  ram: 32,  disk: 20 },
  'RTX 5090':  { cpu: 16, ram: 64,  disk: 30 },
  'H100 SXM':  { cpu: 16, ram: 128, disk: 40 },
  'H200':      { cpu: 16, ram: 128, disk: 40 },
}

function NewSessionWizard() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { address, isConnected } = useAccount()

  const agentId = searchParams?.get('agent') || '1'
  const nftId = searchParams?.get('nft') || agentId
  const agentAddress = searchParams?.get('address') || ''
  const agentName = searchParams?.get('name') ? decodeURIComponent(searchParams.get('name')!) : `Agent #${agentId}`

  // Resource configuration
  const [cpu, setCpu] = useState(2)
  const [memory, setMemory] = useState(4)
  const [duration, setDuration] = useState(24)
  const [gpuType, setGpuType] = useState('any')
  const [numGpus, setNumGpus] = useState(1)
  const [diskGb, setDiskGb] = useState(10)
  const [location, setLocation] = useState('any')

  // Auto-adjust when GPU type changes
  useEffect(() => {
    const defaults = GPU_RESOURCE_DEFAULTS[gpuType] || GPU_RESOURCE_DEFAULTS['any']
    setCpu(defaults.cpu)
    setMemory(defaults.ram)
    setDiskGb(defaults.disk)
  }, [gpuType])

  // API Keys (optional)
  const [showApiKeys, setShowApiKeys] = useState(false)
  const [openaiKey, setOpenaiKey] = useState('')
  const [anthropicKey, setAnthropicKey] = useState('')

  // Session creation state
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'config' | 'creating' | 'done'>('config')
  const [creationStatus, setCreationStatus] = useState('')

  // Payment state
  const [paymentTxHash, setPaymentTxHash] = useState<`0x${string}` | undefined>()
  const [treasuryAddress, setTreasuryAddress] = useState('')
  const [ethPrice, setEthPrice] = useState(2500)
  const { sendTransactionAsync } = useSendTransaction()
  const { data: txReceipt } = useWaitForTransactionReceipt({ hash: paymentTxHash })

  // Real-time Vast.ai pricing
  const PLATFORM_MARKUP = 1.10
  const [realHourlyPrice, setRealHourlyPrice] = useState<number | null>(null)
  const [realGpuName, setRealGpuName] = useState<string | null>(null)
  const [numOffers, setNumOffers] = useState<number>(0)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingFallback, setPricingFallback] = useState(false)

  // Fetch payment info from claws.fun backend
  useEffect(() => {
    fetch(clawsFunApiUrl('/api/payment'))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setTreasuryAddress(data.treasuryAddress)
          setEthPrice(data.ethPriceUsd)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch real Vast.ai pricing when config changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPricingLoading(true)
      fetch(clawsFunApiUrl('/api/session/estimate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gpuType: gpuType === 'any' ? undefined : gpuType,
          numGpus,
          cpuCores: cpu,
          memoryGb: memory,
          diskGb,
          durationHours: duration,
          geolocation: LOCATION_TO_COUNTRIES[location],
        }),
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && data.available && data.hourlyPrice > 0) {
            setRealHourlyPrice(data.hourlyPrice)
            setRealGpuName(data.gpuName)
            setNumOffers(data.numOffers)
            setPricingFallback(!!data.fallback)
          } else if (data && !data.available) {
            setRealHourlyPrice(null)
            setRealGpuName(null)
            setNumOffers(0)
            setPricingFallback(false)
          } else {
            setRealHourlyPrice(null)
            setPricingFallback(true)
          }
        })
        .catch(() => {
          setPricingFallback(true)
        })
        .finally(() => setPricingLoading(false))
    }, 1000)

    return () => clearTimeout(timer)
  }, [gpuType, numGpus, cpu, memory, diskGb, duration, location])

  // Pricing calculation
  const selectedGpu = GPU_OPTIONS.find(g => g.id === gpuType) || GPU_OPTIONS[0]
  const fallbackHourly = (selectedGpu.minPrice * numGpus + cpu * 0.01 + memory * 0.005)
  const hourlyPrice = (realHourlyPrice !== null ? realHourlyPrice : fallbackHourly) * PLATFORM_MARKUP
  const totalPrice = hourlyPrice * duration
  const totalEth = (totalPrice / ethPrice).toFixed(6)

  const handleCreateSession = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first')
      return
    }

    setCreating(true)
    setError(null)
    setStep('creating')

    try {
      // Step 1: Send payment transaction
      let paymentTx: string

      if (treasuryAddress && treasuryAddress !== '0x0000000000000000000000000000000000000000') {
        setCreationStatus('Please confirm the payment transaction in your wallet...')
        const hash = await sendTransactionAsync({
          to: treasuryAddress as `0x${string}`,
          value: parseEther(totalEth),
        })
        paymentTx = hash
        setPaymentTxHash(hash)
        setCreationStatus('Waiting for payment confirmation...')
        await new Promise(resolve => setTimeout(resolve, 5000))
      } else {
        paymentTx = '0x' + 'f'.repeat(64)
      }

      setCreationStatus('Loading agent data from blockchain...')

      const nftIdStr = (nftId as string) || ''
      const isAddr = /^0x[0-9a-fA-F]{40}$/.test(nftIdStr)
      const parsedNftId = isAddr ? NaN : parseInt(nftIdStr, 10)
      const validNftId = !isNaN(parsedNftId) && parsedNftId > 0 && Number.isSafeInteger(parsedNftId)

      const res = await fetch(clawsFunApiUrl('/api/session/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentAddress: agentAddress || (isAddr ? nftIdStr : undefined) || address,
          nftId: validNftId ? parsedNftId : undefined,
          userAddress: address,
          cpuCores: cpu,
          memoryGb: memory,
          gpuType: gpuType === 'any' ? undefined : gpuType,
          numGpus,
          durationHours: duration,
          diskGb,
          geolocation: LOCATION_TO_COUNTRIES[location],
          paymentTx,
          apiKeys: {
            openai: openaiKey || undefined,
            anthropic: anthropicKey || undefined,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create session')
      }

      setCreationStatus('GPU instance provisioning... Redirecting to session.')
      setStep('done')

      setTimeout(() => {
        router.push(`/session/${data.sessionId}`)
      }, 2000)

    } catch (err: any) {
      setError(err.message)
      setStep('config')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main className="min-h-screen relative bg-black w-full overflow-x-hidden text-white">
      {/* Header */}
      <header className="fixed w-full z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-8 h-8">
              <Image
                src="/branding/logo_rm_bk.png"
                alt="Claw.Click"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-white">claw.click</span>
              <span className="px-2 py-0.5 text-[9px] font-medium bg-white/5 text-white/40 border border-white/10 rounded">ALPHA</span>
            </div>
          </Link>
          <ConnectButton />
        </div>
      </header>

      {/* Content */}
      <section className="pt-28 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[rgba(255,255,255,0.03)] border border-[#E8523D]/25 rounded-2xl backdrop-blur-sm p-8"
          >
            <h1 className="text-3xl font-black text-white mb-2">Start New Session</h1>
            <p className="text-white/50 mb-2">
              Launch a GPU-powered compute session for <span className="text-[#E8523D] font-semibold">{agentName}</span>
            </p>
            <p className="text-xs text-white/30 mb-8">
              This will provision a Vast.ai GPU instance and deploy the agent with its on-chain memories from IPFS.
            </p>

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Creating State */}
            {step === 'creating' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-[#E8523D]/30 border-t-[#E8523D] rounded-full animate-spin mx-auto mb-6"></div>
                <h3 className="text-xl font-bold text-white mb-2">Provisioning Session</h3>
                <p className="text-white/50">{creationStatus}</p>
                <p className="text-xs text-white/30 mt-4">This may take 1-5 minutes...</p>
              </div>
            )}

            {/* Done State */}
            {step === 'done' && (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-xl font-bold text-[#E8523D] mb-2">Session Created!</h3>
                <p className="text-white/50">Redirecting to your session...</p>
              </div>
            )}

            {/* Config Form */}
            {step === 'config' && (
              <div className="space-y-8">
                {/* GPU Selection */}
                <div>
                  <label className="block text-sm font-bold text-white mb-3">GPU Type</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {GPU_OPTIONS.map((gpu) => (
                      <button
                        key={gpu.id}
                        onClick={() => setGpuType(gpu.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          gpuType === gpu.id
                            ? 'border-[#E8523D] bg-[#E8523D]/15 ring-1 ring-[#E8523D]/40 shadow-[0_0_12px_rgba(232,82,61,0.15)]'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                        }`}
                      >
                        <div className={`text-sm font-bold ${gpuType === gpu.id ? 'text-[#E8523D]' : 'text-white'}`}>{gpu.label}</div>
                        <div className="text-xs text-white/50">{gpu.desc}</div>
                        <div className="text-xs text-[#E8523D] mt-1">from ${gpu.minPrice.toFixed(2)}/hr</div>
                      </button>
                    ))}
                  </div>

                  {/* Number of GPUs */}
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-sm text-white/50">GPUs:</span>
                    {[1, 2, 4].map(n => (
                      <button
                        key={n}
                        onClick={() => setNumGpus(n)}
                        className={`px-3 py-1 rounded text-sm ${
                          numGpus === n
                            ? 'bg-[#E8523D] text-white font-bold'
                            : 'bg-white/[0.03] text-white/50 border border-white/10'
                        }`}
                      >
                        {n}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location Selection */}
                <div>
                  <label className="block text-sm font-bold text-white mb-3">Location</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'any', label: '🌐 Any', desc: 'Cheapest worldwide' },
                      { id: 'US', label: '🇺🇸 US', desc: 'United States' },
                      { id: 'CA', label: '🇨🇦 Canada', desc: 'Canada' },
                      { id: 'GB', label: '🇬🇧 UK', desc: 'United Kingdom' },
                      { id: 'EU', label: '🇪🇺 Europe', desc: 'EU countries' },
                      { id: 'SE', label: '🇸🇪 Nordic', desc: 'Nordics' },
                      { id: 'JP', label: '🇯🇵 Japan', desc: 'Japan' },
                      { id: 'KR', label: '🇰🇷 Korea', desc: 'South Korea' },
                    ].map((loc) => (
                      <button
                        key={loc.id}
                        onClick={() => setLocation(loc.id)}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          location === loc.id
                            ? 'border-[#E8523D] bg-[#E8523D]/15 ring-1 ring-[#E8523D]/40 shadow-[0_0_12px_rgba(232,82,61,0.15)]'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                        }`}
                      >
                        <div className={`text-sm font-bold ${location === loc.id ? 'text-[#E8523D]' : 'text-white'}`}>{loc.label}</div>
                        <div className="text-[10px] text-white/50">{loc.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minimum Resources */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-bold text-white">Minimum Resources</label>
                    <span className="text-[10px] text-white/30 bg-white/[0.03] px-2 py-0.5 rounded">
                      Higher values = fewer machines
                    </span>
                  </div>
                  <p className="text-xs text-white/30 mb-4">
                    Defaults auto-adjust based on GPU type.
                  </p>

                  {/* CPU */}
                  <div className="mb-5">
                    <label className="block text-xs text-white/50 mb-2">
                      Min CPU Cores: <span className="text-white font-semibold">{cpu} cores</span>
                    </label>
                    <input
                      type="range"
                      min="2" max="32" step="2"
                      value={cpu}
                      onChange={(e) => setCpu(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/[0.05] rounded-lg appearance-none cursor-pointer accent-[#E8523D]"
                    />
                    <div className="flex justify-between text-[10px] text-white/30 mt-1">
                      <span>2 cores</span>
                      <span>32 cores</span>
                    </div>
                  </div>

                  {/* RAM */}
                  <div className="mb-5">
                    <label className="block text-xs text-white/50 mb-2">
                      Min RAM: <span className="text-white font-semibold">{memory} GB</span>
                    </label>
                    <input
                      type="range"
                      min="4" max="256" step="4"
                      value={memory}
                      onChange={(e) => setMemory(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/[0.05] rounded-lg appearance-none cursor-pointer accent-[#E8523D]"
                    />
                    <div className="flex justify-between text-[10px] text-white/30 mt-1">
                      <span>4 GB</span>
                      <span>256 GB</span>
                    </div>
                  </div>

                  {/* Disk */}
                  <div>
                    <label className="block text-xs text-white/50 mb-2">
                      Min Disk: <span className="text-white font-semibold">{diskGb} GB</span>
                    </label>
                    <input
                      type="range"
                      min="10" max="200" step="10"
                      value={diskGb}
                      onChange={(e) => setDiskGb(parseInt(e.target.value))}
                      className="w-full h-2 bg-white/[0.05] rounded-lg appearance-none cursor-pointer accent-[#E8523D]"
                    />
                    <div className="flex justify-between text-[10px] text-white/30 mt-1">
                      <span>10 GB</span>
                      <span>200 GB</span>
                    </div>
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-bold text-white mb-3">
                    Duration: {duration} hours ({(duration / 24).toFixed(1)} days)
                  </label>
                  <input
                    type="range"
                    min="1" max="720"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full h-2 bg-white/[0.05] rounded-lg appearance-none cursor-pointer accent-[#E8523D]"
                  />
                  <div className="flex justify-between text-xs text-white/50 mt-2">
                    <span>1 hour</span>
                    <span>30 days</span>
                  </div>
                </div>

                {/* API Keys (Collapsible) */}
                <div>
                  <button
                    onClick={() => setShowApiKeys(!showApiKeys)}
                    className="flex items-center gap-2 text-sm font-bold text-white hover:text-[#E8523D] transition-colors"
                  >
                    <span>{showApiKeys ? '▼' : '▶'}</span>
                    LLM API Keys (Optional)
                  </button>
                  <p className="text-xs text-white/50 mt-1 mb-3">
                    Provide API keys for the agent to use GPT-4, Claude, etc. Keys are encrypted and only available inside the session.
                  </p>

                  {showApiKeys && (
                    <div className="space-y-3 p-4 rounded-lg bg-white/[0.02] border border-white/10">
                      <div>
                        <label className="block text-xs text-white/50 mb-1">OpenAI API Key</label>
                        <input
                          type="password"
                          value={openaiKey}
                          onChange={(e) => setOpenaiKey(e.target.value)}
                          placeholder="sk-..."
                          className="w-full px-3 py-2 bg-black border border-white/10 rounded text-white text-sm placeholder-white/20 focus:border-[#E8523D] focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/50 mb-1">Anthropic API Key</label>
                        <input
                          type="password"
                          value={anthropicKey}
                          onChange={(e) => setAnthropicKey(e.target.value)}
                          placeholder="sk-ant-..."
                          className="w-full px-3 py-2 bg-black border border-white/10 rounded text-white text-sm placeholder-white/20 focus:border-[#E8523D] focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Cost Summary */}
                <div className="p-6 bg-white/[0.02] rounded-xl border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">Cost Summary</h3>
                    {pricingLoading && (
                      <span className="text-xs text-white/50 flex items-center gap-1">
                        <span className="w-2 h-2 bg-[#E8523D] rounded-full animate-pulse"></span>
                        Fetching live prices...
                      </span>
                    )}
                    {!pricingLoading && !pricingFallback && realHourlyPrice !== null && (
                      <span className="text-xs text-[#E8523D]">✓ Live Vast.ai pricing</span>
                    )}
                    {!pricingLoading && numOffers === 0 && !pricingFallback && realHourlyPrice === null && (
                      <span className="text-xs text-red-400">No machines available</span>
                    )}
                    {!pricingLoading && pricingFallback && (
                      <span className="text-xs text-yellow-400">Estimated pricing</span>
                    )}
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-white/50">GPU ({realGpuName || selectedGpu.label} x{numGpus})</span>
                      <span className="text-white">${hourlyPrice.toFixed(3)}/hr</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Duration</span>
                      <span className="text-white">{duration} hours ({(duration / 24).toFixed(1)} days)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/50">Disk</span>
                      <span className="text-white">{diskGb} GB</span>
                    </div>
                    {numOffers > 0 && (
                      <div className="flex justify-between">
                        <span className="text-white/50">Available machines</span>
                        <span className="text-white">{numOffers}</span>
                      </div>
                    )}
                    <div className="border-t border-white/10 pt-2 mt-2 flex justify-between font-bold">
                      <span className="text-white">Total</span>
                      <div className="text-right">
                        <div className="text-[#E8523D]">${totalPrice.toFixed(2)} USD</div>
                        <div className="text-xs text-white/50 font-normal">≈ {totalEth} ETH</div>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-white/40">
                    {realHourlyPrice !== null && !pricingFallback
                      ? 'Prices fetched live from Vast.ai GPU marketplace. Includes 10% platform fee.'
                      : 'Estimated pricing. Actual cost determined by Vast.ai availability.'}
                  </p>
                </div>

                {/* What gets loaded */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <h4 className="text-sm font-bold text-white mb-2">What gets loaded onto the GPU:</h4>
                  <ul className="text-xs text-white/50 space-y-1">
                    <li>• Agent identity from on-chain birth certificate</li>
                    <li>• Memories pulled from MemoryStorage contract</li>
                    <li>• Latest memory archive fetched from IPFS</li>
                    <li>• Avatar and social identity</li>
                    <li>• OpenClaw agent runtime with HTTP API</li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <Link href={`/immortal/agent/${agentId}`} className="flex-1">
                    <button className="w-full py-3 rounded-lg bg-black border border-white/10 text-white/50 hover:bg-white/[0.03] transition-all">
                      Cancel
                    </button>
                  </Link>
                  <button
                    onClick={handleCreateSession}
                    disabled={creating || !isConnected}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                      creating || !isConnected
                        ? 'bg-[#E8523D]/30 text-white/50 cursor-not-allowed'
                        : 'bg-[#E8523D] text-white hover:shadow-[0_0_20px_rgba(232,82,61,0.5)]'
                    }`}
                  >
                    {!isConnected ? 'Connect Wallet' : creating ? 'Creating...' : 'Start Session'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </main>
  )
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <NewSessionWizard />
    </Suspense>
  )
}
