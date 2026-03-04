'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { GPUSessionsIcon } from '../../components/home/ProductIcons'
import { LightningIcon, DollarIcon, LockIcon, ChartIcon } from '../../components/ComputeIcons'
import { clawsFunApiUrl } from '../../lib/api'

interface GpuCard {
  gpuName: string
  numGpus: number
  hourlyPrice: number
  numOffers: number
}

export default function ComputePage() {
  const [gpuCards, setGpuCards] = useState<GpuCard[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchAvailable = useCallback(async () => {
    try {
      // Single broad search — gpuType 'any' returns all available GPUs
      // Query for 1-GPU and multi-GPU configs
      const queries = [1, 2, 4, 8].map(numGpus =>
        fetch(clawsFunApiUrl('/api/session/estimate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gpuType: 'any', numGpus, durationHours: 1 }),
        }).then(r => r.ok ? r.json() : null).catch(() => null)
      )

      const results = await Promise.all(queries)
      const cards: GpuCard[] = []
      const seen = new Set<string>()

      for (let i = 0; i < results.length; i++) {
        const data = results[i]
        if (!data?.available || !data.gpuName) continue
        const numGpus = [1, 2, 4, 8][i]
        const key = `${data.gpuName}-${numGpus}`
        if (seen.has(key)) continue
        seen.add(key)
        cards.push({
          gpuName: data.gpuName,
          numGpus,
          hourlyPrice: data.hourlyPrice,
          numOffers: data.numOffers,
        })
      }

      // Also probe common GPU names individually for single-GPU to find variety
      const gpuProbes = ['RTX 4090', 'RTX 3090', 'RTX A6000', 'A100', 'A100 80GB', 'H100', 'H100 80GB', 'L40', 'L40S', 'A40', 'RTX 4080', 'RTX A5000']
      const probeResults = await Promise.all(
        gpuProbes.map(gpuType =>
          fetch(clawsFunApiUrl('/api/session/estimate'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gpuType, numGpus: 1, durationHours: 1 }),
          }).then(r => r.ok ? r.json() : null).catch(() => null)
        )
      )

      for (const data of probeResults) {
        if (!data?.available || !data.gpuName) continue
        const key = `${data.gpuName}-1`
        if (seen.has(key)) continue
        seen.add(key)
        cards.push({
          gpuName: data.gpuName,
          numGpus: 1,
          hourlyPrice: data.hourlyPrice,
          numOffers: data.numOffers,
        })
      }

      // Sort by price ascending
      cards.sort((a, b) => a.hourlyPrice - b.hourlyPrice)
      setGpuCards(cards)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch GPU availability:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAvailable()
    const interval = setInterval(fetchAvailable, 120_000)
    return () => clearInterval(interval)
  }, [fetchAvailable])

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden z-[2]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/3 via-black to-black"></div>
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
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 text-[#E8523D]">
              <GPUSessionsIcon />
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold">
              <span className="gradient-text">GPU Compute</span> & Sessions
            </h1>

            <p className="text-xl text-white/50 max-w-3xl mx-auto">
              Rent powerful GPU instances for your immortalized agents. Deploy, manage, and scale AI workloads on-demand.
            </p>

            <div className="flex items-center justify-center gap-3 pt-8">
              <Link href="/immortal" className="px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-base font-semibold hover:shadow-xl hover:shadow-[#E8523D]/40 transition-all">
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
            {loading ? (
              // Skeleton loaders
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="bg-white/[0.03] border border-white/5 rounded-xl p-6 animate-pulse">
                  <div className="h-6 bg-white/10 rounded w-2/3 mb-4"></div>
                  <div className="space-y-3 mb-6">
                    <div className="h-4 bg-white/5 rounded w-full"></div>
                    <div className="h-4 bg-white/5 rounded w-3/4"></div>
                    <div className="h-4 bg-white/5 rounded w-1/2"></div>
                  </div>
                  <div className="h-9 bg-white/5 rounded-lg"></div>
                </div>
              ))
            ) : gpuCards.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <p className="text-white/40 text-lg">No GPU instances currently available. Check back soon.</p>
              </div>
            ) : (
              gpuCards.map((gpu, idx) => {
                const label = gpu.numGpus > 1 ? `${gpu.gpuName} x${gpu.numGpus}` : gpu.gpuName
                const status = gpu.numOffers <= 3 ? 'limited' : 'available'
                return (
                  <motion.div
                    key={`${gpu.gpuName}-${gpu.numGpus}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-white/[0.03] border border-white/10 rounded-xl p-6 transition-all hover:border-[#E8523D]/50 hover:shadow-lg hover:shadow-[#E8523D]/20 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold">{label}</h3>
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${
                        status === 'available'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {status}
                      </span>
                    </div>

                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">GPUs:</span>
                        <span className="font-semibold">{gpu.numGpus}x</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Price:</span>
                        <span className="font-semibold text-[#E8523D]">
                          ${gpu.hourlyPrice < 1 ? gpu.hourlyPrice.toFixed(3) : gpu.hourlyPrice.toFixed(2)}/hr
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">Machines:</span>
                        <span className="font-semibold text-white/70">{gpu.numOffers} available</span>
                      </div>
                    </div>

                    <Link href="/session/new">
                      <button className="w-full py-2 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#E8523D]/30 transition-all">
                        Launch Session →
                      </button>
                    </Link>
                  </motion.div>
                )
              })
            )}
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
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/30 transition-all group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="w-6 h-6 text-white">
                  <LightningIcon />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Instant Deploy</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Launch GPU instances in seconds. Pre-configured environments with all AI frameworks ready.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/30 transition-all group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="w-6 h-6 text-white">
                  <DollarIcon />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Pay-Per-Hour</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Only pay for what you use. No monthly commitments. Cancel anytime and stop billing instantly.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/30 transition-all group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="w-6 h-6 text-white">
                  <LockIcon />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Secure Isolation</h3>
              <p className="text-white/50 text-sm leading-relaxed">
                Each session runs in an isolated container with dedicated resources. Your data stays private.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/30 transition-all group">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <div className="w-6 h-6 text-white">
                  <ChartIcon />
                </div>
              </div>
              <h3 className="text-xl font-bold mb-2">Real-Time Monitoring</h3>
              <p className="text-white/50 text-sm leading-relaxed">
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
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-12"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Ready to <span className="gradient-text">Deploy</span>?
            </h2>
            <p className="text-lg text-white/50 mb-8">
              Immortalize your agent first, then launch compute sessions from your agent dashboard
            </p>
            <Link href="/immortal" className="inline-block px-8 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-lg font-medium hover:shadow-xl hover:shadow-[#E8523D]/30 transition-all">
              Immortalize Agent →
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
