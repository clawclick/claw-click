'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { GPUSessionsIcon } from '../../components/home/ProductIcons'

export default function ComputePage() {
  const gpuOptions = [
    { name: 'RTX 4090', gpus: 1, ram: '24GB', price: '$0.50/hr', status: 'available' },
    { name: 'A100 40GB', gpus: 1, ram: '40GB', price: '$2.50/hr', status: 'available' },
    { name: 'H100 80GB', gpus: 1, ram: '80GB', price: '$4.00/hr', status: 'limited' },
    { name: 'RTX 4090 x4', gpus: 4, ram: '96GB', price: '$1.80/hr', status: 'available' },
    { name: 'A100 x8', gpus: 8, ram: '320GB', price: '$18.00/hr', status: 'limited' },
    { name: 'H100 x8', gpus: 8, ram: '640GB', price: '$30.00/hr', status: 'coming soon' },
  ]

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
          <h2 className="text-3xl font-bold text-center mb-12">
            Available <span className="gradient-text">GPU Instances</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gpuOptions.map((gpu, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-white/[0.03] border rounded-xl p-6 transition-all ${
                  gpu.status === 'available' 
                    ? 'border-white/10 hover:border-[#E8523D]/50 hover:shadow-lg hover:shadow-[#E8523D]/20 cursor-pointer' 
                    : 'border-white/5 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold">{gpu.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded font-semibold ${
                    gpu.status === 'available' 
                      ? 'bg-green-500/20 text-green-400' 
                      : gpu.status === 'limited'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-white/10 text-white/40'
                  }`}>
                    {gpu.status}
                  </span>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">GPUs:</span>
                    <span className="font-semibold">{gpu.gpus}x</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">VRAM:</span>
                    <span className="font-semibold">{gpu.ram}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Price:</span>
                    <span className="font-semibold text-[#E8523D]">{gpu.price}</span>
                  </div>
                </div>

                <button 
                  disabled={gpu.status !== 'available'}
                  className="w-full py-2 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-sm font-medium hover:shadow-lg hover:shadow-[#E8523D]/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {gpu.status === 'available' ? 'Launch Session' : gpu.status === 'limited' ? 'Limited Stock' : 'Coming Soon'}
                </button>
              </motion.div>
            ))}
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
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/30 transition-all">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] flex items-center justify-center mb-3">
                <span className="text-white font-bold">⚡</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Instant Deploy</h3>
              <p className="text-white/50 text-sm">
                Launch GPU instances in seconds. Pre-configured environments with all AI frameworks ready.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/30 transition-all">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] flex items-center justify-center mb-3">
                <span className="text-white font-bold">$</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Pay-Per-Hour</h3>
              <p className="text-white/50 text-sm">
                Only pay for what you use. No monthly commitments. Cancel anytime and stop billing instantly.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/30 transition-all">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] flex items-center justify-center mb-3">
                <span className="text-white font-bold">🔒</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Secure Isolation</h3>
              <p className="text-white/50 text-sm">
                Each session runs in an isolated container with dedicated resources. Your data stays private.
              </p>
            </div>

            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-6 hover:border-[#E8523D]/30 transition-all">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] flex items-center justify-center mb-3">
                <span className="text-white font-bold">📊</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Real-Time Monitoring</h3>
              <p className="text-white/50 text-sm">
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
