'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { GPUSessionsIcon } from '../../components/home/ProductIcons'
import { LightningIcon, DollarIcon, LockIcon, ChartIcon } from '../../components/ComputeIcons'
import { clawsFunApiUrl } from '../../lib/api'

interface GpuCard {
  id: string
  label: string
  desc: string
  hourlyPrice: number | null
  numOffers: number
  available: boolean
  loading: boolean
}

// Same GPU list as the session creation wizard (/session/new)
const GPU_OPTIONS = [
  { id: 'any', label: 'Any GPU', desc: 'Cheapest available GPU' },
  { id: 'RTX 4060', label: 'RTX 4060', desc: '8GB VRAM, budget inference' },
  { id: 'RTX 4090', label: 'RTX 4090', desc: '24GB VRAM, fast inference' },
  { id: 'RTX 5090', label: 'RTX 5090', desc: '32GB VRAM, next-gen flagship' },
  { id: 'H100 SXM', label: 'H100 SXM', desc: '80GB VRAM, enterprise workloads' },
  { id: 'H200', label: 'H200', desc: '141GB HBM3e, next-gen datacenter' },
]

export default function ComputePage() {
  const [gpuCards, setGpuCards] = useState<GpuCard[]>(
    GPU_OPTIONS.map(g => ({ ...g, hourlyPrice: null, numOffers: 0, available: false, loading: true }))
  )
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchAvailable = useCallback(async () => {
    try {
      const results = await Promise.all(
        GPU_OPTIONS.map(g =>
          fetch(clawsFunApiUrl('/api/session/estimate'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gpuType: g.id, numGpus: 1, durationHours: 1 }),
          }).then(r => r.ok ? r.json() : null).catch(() => null)
        )
      )

      setGpuCards(
        GPU_OPTIONS.map((g, i) => {
          const data = results[i]
          if (!data?.available || !data.gpuName) {
            return { ...g, hourlyPrice: null, numOffers: 0, available: false, loading: false }
          }
          return {
            ...g,
            hourlyPrice: data.hourlyPrice,
            numOffers: data.numOffers,
            available: true,
            loading: false,
          }
        })
      )
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch GPU availability:', err)
      setGpuCards(prev => prev.map(c => ({ ...c, loading: false })))
    }
  }, [])

  useEffect(() => {
    fetchAvailable()
    const interval = setInterval(fetchAvailable, 120_000)
    return () => clearInterval(interval)
  }, [fetchAvailable])

  return (
    <div className="min-h-screen relative text-[var(--text-primary)] pt-32 pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden z-[2]">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--mint-mid)]/3 via-black to-black"></div>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* Hero */}
      <section className="relative z-10 px-4 pb-16">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 text-[var(--mint-mid)]">
              <GPUSessionsIcon />
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold">
              <span className="gradient-text">GPU Compute</span> & Sessions
            </h1>

            <p className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto">
              Rent powerful GPU instances for your immortalized agents. Deploy, manage, and scale AI workloads on-demand.
            </p>

            <div className="flex items-center justify-center gap-3 pt-8">
              <Link href="/spawner" className="px-8 py-4 bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] rounded-lg text-base font-semibold hover:shadow-xl hover:shadow-[var(--mint-mid)]/40 transition-all">
                Immortalize Agent First
              </Link>
              <Link href="/docs" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm font-medium transition-all">
                Documentation
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* GPU Marketplace */}
      <section className="relative z-10 px-4 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">
              Available <span className="gradient-text">GPU Instances</span>
            </h2>
            <p className="text-sm text-white/30">
              {lastUpdated ? `Live Vast.ai pricing · Updated ${lastUpdated.toLocaleTimeString()}` : 'Fetching live prices...'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gpuCards.map((gpu, idx) => {
              const status = gpu.loading
                ? 'checking'
                : !gpu.available
                  ? 'unavailable'
                  : gpu.numOffers <= 3
                    ? 'limited'
                    : 'available'

              return (
                <motion.div
                  key={gpu.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.04 }}
                  className={`bg-white/[0.03] border rounded-xl p-6 transition-all ${
                    gpu.available
                      ? 'border-white/10 hover:border-[var(--mint-mid)]/50 hover:shadow-lg hover:shadow-[var(--mint-mid)]/20 cursor-pointer'
                      : 'border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{gpu.label}</h3>
                    {gpu.loading ? (
                      <span className="text-xs px-2 py-1 rounded font-semibold bg-white/10 text-[var(--text-secondary)] animate-pulse">checking</span>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${
                        status === 'available'
                          ? 'bg-green-500/20 text-green-400'
                          : status === 'limited'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                      }`}>
                        {status}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] mb-5">{gpu.desc}</p>

                  <div className="space-y-2 mb-6">
                    {gpu.loading ? (
                      <>
                        <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
                        <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse"></div>
                      </>
                    ) : gpu.available ? (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--text-secondary)]">Price:</span>
                          <span className="font-semibold text-[var(--mint-mid)]">
                            ${gpu.hourlyPrice! < 1 ? gpu.hourlyPrice!.toFixed(3) : gpu.hourlyPrice!.toFixed(2)}/hr
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--text-secondary)]">Machines:</span>
                          <span className="font-semibold text-[#0F2F2C]">{gpu.numOffers} available</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-[var(--text-secondary)]">No offers currently available</p>
                    )}
                  </div>

                  <Link href="/session/new">
                    <button
                      disabled={!gpu.available}
                      className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                        gpu.available
                          ? 'bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] text-[#0F2F2C] hover:shadow-lg hover:shadow-[var(--mint-mid)]/30'
                          : 'bg-white/5 text-[var(--text-secondary)]/50 cursor-not-allowed'
                      }`}
                    >
                      {gpu.available ? 'Launch Session →' : 'Unavailable'}
                    </button>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            Session <span className="gradient-text">Features</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-xl p-6 hover:border-[var(--mint-mid)]/30 transition-all group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="w-6 h-6 text-[var(--text-primary)]">
                  <LightningIcon />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Instant Deploy</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Launch GPU instances in seconds. Pre-configured environments with all AI frameworks ready.
              </p>
            </div>

            <div className="glass rounded-xl p-6 hover:border-[var(--mint-mid)]/30 transition-all group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="w-6 h-6 text-[var(--text-primary)]">
                  <DollarIcon />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Pay-Per-Hour</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Only pay for what you use. No monthly commitments. Cancel anytime and stop billing instantly.
              </p>
            </div>

            <div className="glass rounded-xl p-6 hover:border-[var(--mint-mid)]/30 transition-all group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="w-6 h-6 text-[var(--text-primary)]">
                  <LockIcon />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Secure Isolation</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Each session runs in an isolated container with dedicated resources. Your data stays private.
              </p>
            </div>

            <div className="glass rounded-xl p-6 hover:border-[var(--mint-mid)]/30 transition-all group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="w-6 h-6 text-[var(--text-primary)]">
                  <ChartIcon />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Real-Time Monitoring</h3>
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                Track GPU usage, memory, CPU, and costs in real-time. Get alerts when sessions end.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 px-4 pt-16">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="glass rounded-2xl p-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to <span className="gradient-text">Deploy</span>?
            </h2>
            <p className="text-lg text-[var(--text-secondary)] mb-8">
              Immortalize your agent first, then launch compute sessions from your agent dashboard
            </p>
            <Link href="/spawner" className="inline-block px-8 py-4 bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] rounded-lg text-lg font-medium hover:shadow-xl hover:shadow-[var(--mint-mid)]/30 transition-all">
              Immortalize Agent →
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
