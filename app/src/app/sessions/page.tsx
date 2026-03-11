'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useSendTransaction } from 'wagmi'
import { parseEther, createPublicClient, http } from 'viem'
import { base, sepolia } from 'viem/chains'
import { getAllAgents, type Agent } from '../../lib/agents'
import { ABIS, BASE_ADDRESSES, SEPOLIA_ADDRESSES } from '../../lib/contracts'
import { clawsFunApiUrl } from '../../lib/api'

type FlowStep = 'address' | 'checking' | 'configure' | 'creating' | 'done'
type LlmProvider = 'openai' | 'anthropic'

type SessionListItem = {
  id: number
  status: string
  isActive: boolean
  isExpired: boolean
  timeRemaining?: number
  userAddress?: string
  owner?: string
  wallet?: string
  ownerAddress?: string
  createdBy?: string
}

const LOWEST_TIER = {
  gpuType: 'any',
  numGpus: 1,
  cpuCores: 2,
  memoryGb: 4,
  diskGb: 10,
} as const

function isAddress(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{40}$/.test(value)
}

function normalizeAddress(value: string): `0x${string}` {
  return value.toLowerCase() as `0x${string}`
}

function sessionBelongsToUser(session: SessionListItem, userAddress: string): boolean {
  const checks = [session.userAddress, session.owner, session.wallet, session.ownerAddress, session.createdBy]
    .filter(Boolean)
    .map((x) => String(x).toLowerCase())

  if (checks.length === 0) {
    return true
  }

  return checks.includes(userAddress.toLowerCase())
}

function isReusableSession(session: SessionListItem, userAddress: string): boolean {
  const status = (session.status || '').toLowerCase()
  const activeLikeStatus = ['running', 'starting', 'bootstrapping', 'provisioning', 'retrying'].includes(status)
  const invalidStatus = status === 'terminated' || status === 'expired' || status === 'failed' || status === 'error'
  const hasTimeLeft = typeof session.timeRemaining !== 'number' || session.timeRemaining > 0
  return (session.isActive || activeLikeStatus) && !session.isExpired && hasTimeLeft && !invalidStatus && sessionBelongsToUser(session, userAddress)
}

export default function SessionsPage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const { sendTransactionAsync } = useSendTransaction()

  const [step, setStep] = useState<FlowStep>('address')
  const [tokenAddressInput, setTokenAddressInput] = useState('')
  const [agent, setAgent] = useState<Agent | null>(null)
  const [birthCertNftId, setBirthCertNftId] = useState<number | null>(null)
  const [durationHours, setDurationHours] = useState(4)
  const [llmProvider, setLlmProvider] = useState<LlmProvider>('anthropic')
  const [llmApiKey, setLlmApiKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [creationStatus, setCreationStatus] = useState('')
  const [ethPriceUsd, setEthPriceUsd] = useState(2500)
  const [treasuryAddress, setTreasuryAddress] = useState('')
  const [realHourlyPrice, setRealHourlyPrice] = useState<number | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)

  useEffect(() => {
    fetch(clawsFunApiUrl('/api/payment'))
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        if (typeof data.ethPriceUsd === 'number') setEthPriceUsd(data.ethPriceUsd)
        if (typeof data.treasuryAddress === 'string') setTreasuryAddress(data.treasuryAddress)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!agent || step !== 'configure') return

    const timer = setTimeout(() => {
      setPricingLoading(true)
      fetch(clawsFunApiUrl('/api/session/estimate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gpuType: undefined,
          numGpus: LOWEST_TIER.numGpus,
          cpuCores: LOWEST_TIER.cpuCores,
          memoryGb: LOWEST_TIER.memoryGb,
          diskGb: LOWEST_TIER.diskGb,
          durationHours,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.available && typeof data.hourlyPrice === 'number') {
            setRealHourlyPrice(data.hourlyPrice)
          } else {
            setRealHourlyPrice(null)
          }
        })
        .catch(() => setRealHourlyPrice(null))
        .finally(() => setPricingLoading(false))
    }, 400)

    return () => clearTimeout(timer)
  }, [agent, durationHours, step])

  const fallbackHourly = 0.03 + LOWEST_TIER.cpuCores * 0.01 + LOWEST_TIER.memoryGb * 0.005
  const hourlyPrice = useMemo(() => {
    const basePrice = realHourlyPrice ?? fallbackHourly
    return basePrice * 1.1
  }, [realHourlyPrice])

  const totalUsd = hourlyPrice * durationHours
  const totalEth = ethPriceUsd > 0 ? (totalUsd / ethPriceUsd).toFixed(6) : '0.000000'

  const bootLines = [
    'claw.session@runtime: boot sequence initialized',
    'gpu.monitor: waiting for paid session context',
    'agent.bridge: no active target agent configured',
    'terminal: ready for token address input',
  ]

  const resetFlow = () => {
    setStep('address')
    setAgent(null)
    setBirthCertNftId(null)
    setLlmApiKey('')
    setError(null)
    setCreationStatus('')
  }

  const checkAgentAndSession = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first.')
      return
    }

    setError(null)

    if (!isAddress(tokenAddressInput.trim())) {
      setError('Enter a valid token contract address (0x...).')
      return
    }

    const tokenAddress = normalizeAddress(tokenAddressInput.trim())
    setStep('checking')

    try {
      const agents = await getAllAgents()
      const foundAgent = agents.find((item) => item.token.toLowerCase() === tokenAddress)

      if (!foundAgent) {
        throw new Error('No known agent found for that token address.')
      }

      const isBaseChain = foundAgent.chainId === 8453 || process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
      const selectedChain = isBaseChain ? base : sepolia
      const selectedAddresses = isBaseChain ? BASE_ADDRESSES : SEPOLIA_ADDRESSES
      const rpcUrl = isBaseChain
        ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_BASE || 'BdgPEmQddox2due7mrt9J'}`
        : `https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_ETH_SEPOLIA || 'BdgPEmQddox2due7mrt9J'}`

      const chainClient = createPublicClient({
        chain: selectedChain,
        transport: http(rpcUrl, { retryCount: 1, retryDelay: 1500 }),
      })

      const nftId = await chainClient.readContract({
        address: selectedAddresses.birthCertificate as `0x${string}`,
        abi: ABIS.AgentBirthCertificateNFT,
        functionName: 'nftByWallet',
        args: [foundAgent.wallet],
      }) as bigint

      if (!nftId || nftId <= BigInt(0)) {
        throw new Error('This token is not linked to an agent with a birth certificate.')
      }

      const listRes = await fetch(
        clawsFunApiUrl(`/api/session/list?agent=${foundAgent.wallet}&user=${address}`),
        { headers: { 'x-wallet-address': address } }
      )

      const listData = listRes.ok ? await listRes.json() : { sessions: [] }
      const sessions: SessionListItem[] = Array.isArray(listData?.sessions) ? listData.sessions : []
      const existingSession = sessions.find((s) => isReusableSession(s, address))

      if (existingSession) {
        setCreationStatus(`Found active session #${existingSession.id}. Connecting...`)
        setStep('done')
        setTimeout(() => router.push(`/session/${existingSession.id}`), 900)
        return
      }

      setAgent(foundAgent)
      setBirthCertNftId(Number(nftId))
      setStep('configure')
    } catch (err: any) {
      setError(err?.message || 'Failed to validate token/agent.')
      setStep('address')
    }
  }

  const createSession = async () => {
    if (!address || !agent || !birthCertNftId) return
    if (!llmApiKey.trim()) {
      setError('Enter an API key for the selected provider.')
      return
    }

    setError(null)
    setStep('creating')

    try {
      let paymentTx: string

      // Re-fetch payment inputs right before sending tx to avoid stale price/estimate mismatch.
      const [paymentData, estimateData] = await Promise.all([
        fetch(clawsFunApiUrl('/api/payment')).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(clawsFunApiUrl('/api/session/estimate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gpuType: undefined,
            numGpus: LOWEST_TIER.numGpus,
            cpuCores: LOWEST_TIER.cpuCores,
            memoryGb: LOWEST_TIER.memoryGb,
            diskGb: LOWEST_TIER.diskGb,
            durationHours,
            geolocation: undefined,
          }),
        }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ])

      const freshEthPrice = typeof paymentData?.ethPriceUsd === 'number' && paymentData.ethPriceUsd > 0
        ? paymentData.ethPriceUsd
        : ethPriceUsd
      const freshTreasury = typeof paymentData?.treasuryAddress === 'string'
        ? paymentData.treasuryAddress
        : treasuryAddress

      const estimatedHourly =
        estimateData && estimateData.available && typeof estimateData.hourlyPrice === 'number' && estimateData.hourlyPrice > 0
          ? estimateData.hourlyPrice * 1.1
          : hourlyPrice

      // Add a small buffer so backend-side recomputation doesn't reject by tiny deltas.
      const payableEth = ((estimatedHourly * durationHours * 1.03) / freshEthPrice).toFixed(6)

      if (freshTreasury && freshTreasury !== '0x0000000000000000000000000000000000000000') {
        setCreationStatus('Confirm payment in your wallet...')
        paymentTx = await sendTransactionAsync({
          to: freshTreasury as `0x${string}`,
          value: parseEther(payableEth),
        })
        setCreationStatus('Payment sent. Verifying and provisioning GPU...')
        await new Promise((resolve) => setTimeout(resolve, 6000))
      } else {
        paymentTx = `0x${'f'.repeat(64)}`
      }

      const apiKeys = llmProvider === 'openai'
        ? { openai: llmApiKey.trim(), anthropic: undefined }
        : { openai: undefined, anthropic: llmApiKey.trim() }

      const createRes = await fetch(clawsFunApiUrl('/api/session/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentAddress: agent.wallet,
          nftId: birthCertNftId,
          userAddress: address,
          cpuCores: LOWEST_TIER.cpuCores,
          memoryGb: LOWEST_TIER.memoryGb,
          gpuType: undefined,
          numGpus: LOWEST_TIER.numGpus,
          durationHours,
          diskGb: LOWEST_TIER.diskGb,
          geolocation: undefined,
          paymentTx,
          apiKeys,
        }),
      })

      const created = await createRes.json()
      if (!createRes.ok) {
        const detail = created?.details || created?.reason || created?.message
        throw new Error(detail ? `${created.error || 'Failed to create session.'} (${detail})` : (created.error || 'Failed to create session.'))
      }

      setCreationStatus('Session is booting. Opening terminal...')
      setStep('done')
      setTimeout(() => router.push(`/session/${created.sessionId}`), 1200)
    } catch (err: any) {
      setError(err?.message || 'Session creation failed.')
      setStep('configure')
    }
  }

  return (
    <main className="min-h-screen relative w-full overflow-x-hidden bg-[#070b0f]">
      <header className="fixed w-full z-40 glass border-b border-[var(--glass-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-10 h-10 overflow-visible">
              <Image
                src="/branding/logo_rm_bk.png"
                alt="Claw.Click"
                width={40}
                height={40}
                className="object-contain logo-expanded"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-[var(--text-primary)]">claw.click sessions</span>
              <span className="px-2 py-0.5 text-[9px] font-medium bg-white/5 text-[var(--text-secondary)]/70 border border-[var(--glass-border)] rounded">TERMINAL</span>
            </div>
          </Link>
          <ConnectButton />
        </div>
      </header>

      <section className="pt-20 sm:pt-24 pb-6 sm:pb-8 px-3 sm:px-6 relative z-10 h-[calc(100vh-4rem)]">
        <div className="max-w-7xl mx-auto h-full">
          <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3 h-full">
            <aside className="border border-[var(--glass-border)] rounded-xl bg-black/45 backdrop-blur p-4 text-sm text-[var(--text-primary)]">
              <h2 className="font-bold mb-3">Session Status</h2>
              <div className="space-y-2 text-[var(--text-secondary)]">
                <div className="flex justify-between"><span>State</span><span className="text-[var(--mint-mid)]">{agent ? 'READY' : 'IDLE'}</span></div>
                <div className="flex justify-between"><span>GPU</span><span>{agent ? 'ANY (lowest)' : 'RTX 4090 (dummy)'}</span></div>
                <div className="flex justify-between"><span>vCPU</span><span>{LOWEST_TIER.cpuCores}</span></div>
                <div className="flex justify-between"><span>RAM</span><span>{LOWEST_TIER.memoryGb} GB</span></div>
                <div className="flex justify-between"><span>Disk</span><span>{LOWEST_TIER.diskGb} GB</span></div>
                <div className="flex justify-between"><span>Wallet</span><span>{isConnected && address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'not connected'}</span></div>
                {agent && <div className="flex justify-between"><span>Agent</span><span>{agent.name}</span></div>}
                {birthCertNftId && <div className="flex justify-between"><span>Birth Cert</span><span>#{birthCertNftId}</span></div>}
              </div>
            </aside>

            <div className="border border-[var(--glass-border)] rounded-xl bg-black/55 backdrop-blur p-4 sm:p-5 font-mono text-sm overflow-auto">
              <div className="text-[var(--mint-mid)] mb-3">claw-session-terminal v0.1</div>
              <div className="space-y-1 text-[var(--text-secondary)]">
                {bootLines.map((line) => (
                  <div key={line}>&gt; {line}</div>
                ))}
                {step === 'checking' && <div>&gt; validating birth certificate and checking active sessions...</div>}
                {step === 'creating' && <div>&gt; {creationStatus || 'preparing paid session...'}</div>}
                {step === 'done' && <div>&gt; {creationStatus || 'opening terminal session...'}</div>}
                {error && <div className="text-red-300">&gt; error: {error}</div>}
                <div>&gt; _</div>
              </div>
            </div>
          </div>

          {(step === 'address' || step === 'checking') && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
              <div className="w-full max-w-lg rounded-xl border border-[var(--glass-border)] bg-[#0b1118] p-5 sm:p-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Enter your immortal agent's token address</h3>
                <input
                  type="text"
                  value={tokenAddressInput}
                  onChange={(e) => setTokenAddressInput(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 bg-black border border-[var(--glass-border)] rounded text-[var(--text-primary)] text-sm placeholder-white/20 focus:border-[var(--mint-mid)] focus:outline-none"
                />
                {error && <p className="text-red-300 text-xs mt-2">{error}</p>}
                <button
                  onClick={checkAgentAndSession}
                  disabled={!isConnected || step === 'checking'}
                  className="mt-4 w-full py-2.5 rounded-lg font-semibold bg-[var(--mint-mid)] text-black disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {step === 'checking' ? 'Checking...' : 'Continue'}
                </button>
              </div>
            </div>
          )}

          {step === 'configure' && agent && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4">
              <div className="w-full max-w-lg rounded-xl border border-[var(--glass-border)] bg-[#0b1118] p-5 sm:p-6 space-y-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Configure and Pay</h3>

                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">LLM provider</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setLlmProvider('anthropic')}
                      className={`py-2 rounded border text-sm ${llmProvider === 'anthropic' ? 'border-[var(--mint-mid)] text-[var(--mint-mid)] bg-[var(--mint-mid)]/10' : 'border-[var(--glass-border)] text-[var(--text-secondary)]'}`}
                    >
                      Anthropic (recommended)
                    </button>
                    <button
                      onClick={() => setLlmProvider('openai')}
                      className={`py-2 rounded border text-sm ${llmProvider === 'openai' ? 'border-[var(--mint-mid)] text-[var(--mint-mid)] bg-[var(--mint-mid)]/10' : 'border-[var(--glass-border)] text-[var(--text-secondary)]'}`}
                    >
                      OpenAI
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">
                    {llmProvider === 'openai' ? 'OpenAI API key' : 'Anthropic API key (recommended)'}
                  </label>
                  <input
                    type="password"
                    value={llmApiKey}
                    onChange={(e) => setLlmApiKey(e.target.value)}
                    placeholder={llmProvider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                    className="w-full px-3 py-2 bg-black border border-[var(--glass-border)] rounded text-[var(--text-primary)] text-sm placeholder-white/20 focus:border-[var(--mint-mid)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[var(--text-secondary)] mb-1">Session duration</label>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-black border border-[var(--glass-border)] rounded text-[var(--text-primary)] text-sm focus:border-[var(--mint-mid)] focus:outline-none"
                  >
                    <option value={1}>1 hour</option>
                    <option value={2}>2 hours</option>
                    <option value={4}>4 hours</option>
                    <option value={8}>8 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                  </select>
                </div>

                <div className="rounded-lg border border-[var(--glass-border)] p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-[var(--text-secondary)]">
                    <span>Estimated hourly</span>
                    <span>{pricingLoading ? 'Loading...' : `$${hourlyPrice.toFixed(4)}`}</span>
                  </div>
                  <div className="flex justify-between text-[var(--text-primary)] font-semibold">
                    <span>Total ({durationHours}h)</span>
                    <span>{`$${totalUsd.toFixed(2)} (~${totalEth} ETH)`}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={resetFlow}
                    className="w-full py-2.5 rounded-lg border border-[var(--glass-border)] text-[var(--text-secondary)]"
                  >
                    Back
                  </button>
                  <button
                    onClick={createSession}
                    className="w-full py-2.5 rounded-lg font-semibold bg-[var(--mint-mid)] text-black"
                  >
                    Pay and Start
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
