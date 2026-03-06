'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { use } from 'react'
import { useAccount, useReadContract } from 'wagmi'
import { sepolia } from 'viem/chains'
import { CLAWD_NFT_ADDRESS, CLAWD_NFT_ABI } from '../../../lib/contracts/clawdNFT'
import { useLinkNFTid } from '../../../lib/hooks/useLinkNFTid'
import NFTidCompositor from '../../../components/NFTidCompositor'
import { useState } from 'react'
import { isAddress } from 'viem'

interface PageProps {
  params: Promise<{ tokenId: string }>
}

export default function NFTidDetailPage(props: PageProps) {
  const params = use(props.params)
  const tokenId = parseInt(params.tokenId)
  const { address, isConnected } = useAccount()
  const [agentAddressInput, setAgentAddressInput] = useState('')
  const [showLinkForm, setShowLinkForm] = useState(false)

  const {
    linkNFTid,
    unlinkNFTid,
    isLinking,
    isLinkSuccess,
    linkError,
    useGetAgentForNFTid,
    useIsNFTidLinked,
  } = useLinkNFTid()

  // Get NFT traits
  const { data: traits } = useReadContract({
    address: CLAWD_NFT_ADDRESS.sepolia,
    abi: CLAWD_NFT_ABI,
    functionName: 'getTraits',
    args: [BigInt(tokenId)],
    chainId: sepolia.id,
  })

  // Get NFT owner
  const { data: owner } = useReadContract({
    address: CLAWD_NFT_ADDRESS.sepolia,
    abi: [{
      name: 'ownerOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'tokenId', type: 'uint256' }],
      outputs: [{ name: '', type: 'address' }],
    }],
    functionName: 'ownerOf',
    args: [BigInt(tokenId)],
    chainId: sepolia.id,
  })

  // Check if linked
  const { data: isLinked } = useIsNFTidLinked(tokenId)
  const { data: linkedAgent } = useGetAgentForNFTid(tokenId)

  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase()

  const handleLink = async () => {
    if (!isAddress(agentAddressInput)) {
      alert('Invalid agent address')
      return
    }
    await linkNFTid(tokenId, agentAddressInput)
    setShowLinkForm(false)
    setAgentAddressInput('')
  }

  const handleUnlink = async () => {
    if (confirm('Are you sure you want to unlink this NFTid?')) {
      await unlinkNFTid(tokenId)
    }
  }

  // Parse traits
  const parsedTraits = traits ? {
    aura: Number(traits[0]),
    background: Number(traits[1]),
    core: Number(traits[2]),
    eyes: Number(traits[3]),
    overlay: Number(traits[4]),
  } : null

  return (
    <div className="min-h-screen bg-black text-white pt-32 pb-20 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-[1]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/5 via-black to-[#FF8C4A]/5"></div>
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#E8523D]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[#FF8C4A]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Back button */}
          <Link
            href="/soul"
            className="inline-flex items-center gap-2 text-white/50 hover:text-[#E8523D] transition-colors mb-8"
          >
            <span>←</span> Back to Soul NFTids
          </Link>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: NFT Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/[0.02] border border-white/10 rounded-2xl p-8"
            >
              <div className="aspect-square rounded-lg overflow-hidden mb-6">
                {parsedTraits ? (
                  <NFTidCompositor traits={parsedTraits} size={500} />
                ) : (
                  <div className="w-full h-full bg-black/50 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[#E8523D]/30 border-t-[#E8523D] rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Traits */}
              {parsedTraits && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white/70 mb-3">Traits</h3>
                  {Object.entries(parsedTraits).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span className="text-white/50 capitalize">{key}</span>
                      <span className="font-mono text-[#E8523D]">#{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Right: Info & Actions */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* Title */}
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">
                    NFTid #{tokenId}
                  </span>
                </h1>
                <p className="text-white/50">Soul NFT Identity</p>
              </div>

              {/* Owner Info */}
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-bold text-white/70 mb-3">Owner</h3>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-mono text-sm text-white/70 break-all">
                      {owner as string || 'Loading...'}
                    </p>
                  </div>
                  {isOwner && (
                    <span className="px-3 py-1 rounded-full bg-[#E8523D]/10 text-[#E8523D] text-xs font-semibold">
                      YOU
                    </span>
                  )}
                </div>
              </div>

              {/* Linkage Status */}
              <div className="bg-white/[0.02] border border-white/10 rounded-xl p-6">
                <h3 className="text-sm font-bold text-white/70 mb-3">Agent Linkage</h3>
                
                {isLinked && linkedAgent ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-sm text-green-400">Linked to Agent</span>
                    </div>
                    <div className="p-4 bg-black/30 rounded-lg">
                      <p className="text-xs text-white/50 mb-2">Agent Wallet</p>
                      <p className="font-mono text-sm text-white break-all">{linkedAgent as string}</p>
                    </div>
                    {isOwner && (
                      <button
                        onClick={handleUnlink}
                        disabled={isLinking}
                        className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-50"
                      >
                        {isLinking ? 'Unlinking...' : 'Unlink Agent'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white/30"></div>
                      <span className="text-sm text-white/50">Not Linked</span>
                    </div>

                    {isOwner && (
                      <>
                        {!showLinkForm ? (
                          <button
                            onClick={() => setShowLinkForm(true)}
                            className="w-full px-4 py-3 bg-[#E8523D]/10 hover:bg-[#E8523D]/20 border border-[#E8523D]/30 text-[#E8523D] rounded-lg transition-all"
                          >
                            Link to Agent
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <input
                              type="text"
                              placeholder="Enter agent wallet address (0x...)"
                              value={agentAddressInput}
                              onChange={(e) => setAgentAddressInput(e.target.value)}
                              className="w-full px-4 py-3 bg-black/50 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-[#E8523D]/50"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleLink}
                                disabled={isLinking || !agentAddressInput}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg font-semibold hover:shadow-xl hover:shadow-[#E8523D]/40 transition-all disabled:opacity-50"
                              >
                                {isLinking ? 'Linking...' : 'Confirm Link'}
                              </button>
                              <button
                                onClick={() => setShowLinkForm(false)}
                                className="px-4 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {linkError && (
                  <p className="text-red-400 text-xs mt-4">
                    {(linkError as any).shortMessage || linkError.message}
                  </p>
                )}

                {isLinkSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
                  >
                    <p className="text-green-400 text-sm">✓ Link updated successfully!</p>
                  </motion.div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <Link
                  href={`https://sepolia.etherscan.io/token/${CLAWD_NFT_ADDRESS.sepolia}?a=${tokenId}`}
                  target="_blank"
                  className="block w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-center transition-all"
                >
                  View on Etherscan →
                </Link>
                
                <Link
                  href={`https://testnets.opensea.io/assets/sepolia/${CLAWD_NFT_ADDRESS.sepolia}/${tokenId}`}
                  target="_blank"
                  className="block w-full px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-center transition-all"
                >
                  View on OpenSea →
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
