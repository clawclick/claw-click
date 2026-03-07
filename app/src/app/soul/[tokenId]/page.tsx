'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAccount, useReadContract } from 'wagmi'
import { base } from 'viem/chains'
import { CLAWD_NFT_ADDRESS, CLAWD_NFT_ABI } from '../../../lib/contracts/clawdNFT'
import { useLinkNFTid } from '../../../lib/hooks/useLinkNFTid'
import NFTidCompositor from '../../../components/NFTidCompositor'
import { useState, useEffect } from 'react'
import { isAddress } from 'viem'
import { getAgentByWallet } from '../../../lib/agents'
import { calculateRarityScore, getRarityTier, getTraitName, TRAIT_NAMES } from '../../../lib/utils/rarityCalculator'
import { parseTraits, validateTraits } from '../../../lib/utils/traitParser'

interface PageProps {
  params: { tokenId: string }
}

export default function NFTidDetailPage({ params }: PageProps) {
  const tokenId = parseInt(params.tokenId)
  const { address, isConnected } = useAccount()
  const [agentAddressInput, setAgentAddressInput] = useState('')
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkedAgentData, setLinkedAgentData] = useState<any>(null)
  const [loadingAgent, setLoadingAgent] = useState(false)

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
    address: CLAWD_NFT_ADDRESS.base,
    abi: CLAWD_NFT_ABI,
    functionName: 'getTraits',
    args: [BigInt(tokenId)],
    chainId: base.id,
  })

  // Get NFT owner
  const { data: owner } = useReadContract({
    address: CLAWD_NFT_ADDRESS.base,
    abi: [{
      name: 'ownerOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'tokenId', type: 'uint256' }],
      outputs: [{ name: '', type: 'address' }],
    }],
    functionName: 'ownerOf',
    args: [BigInt(tokenId)],
    chainId: base.id,
  })

  // Check if linked
  const { data: isLinked } = useIsNFTidLinked(tokenId)
  const { data: linkedAgent } = useGetAgentForNFTid(tokenId)

  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase()

  // Fetch linked agent data
  useEffect(() => {
    async function fetchAgentData() {
      if (!linkedAgent || linkedAgent === '0x0000000000000000000000000000000000000000') return
      setLoadingAgent(true)
      try {
        const agent = await getAgentByWallet(linkedAgent as `0x${string}`)
        setLinkedAgentData(agent)
      } catch (err) {
        console.error('Failed to fetch agent data:', err)
      } finally {
        setLoadingAgent(false)
      }
    }

    fetchAgentData()
  }, [linkedAgent])

  const handleLink = async () => {
    if (!isAddress(agentAddressInput)) {
      alert('Invalid agent address')
      return
    }
    
    try {
      await linkNFTid(tokenId, agentAddressInput)
      setShowLinkForm(false)
      setAgentAddressInput('')
    } catch (err: any) {
      console.error('Link failed:', err)
      
      // Show user-friendly error message
      const errorMsg = err.shortMessage || err.message || 'Unknown error'
      if (errorMsg.includes('Not authorized') || errorMsg.includes('must be agent creator')) {
        alert('You must be the creator of this agent to link it. Check that you deployed this agent from your wallet.')
      } else if (errorMsg.includes('Agent has no birth certificate')) {
        alert('This agent does not have a birth certificate. Only immortalized agents can be linked.')
      } else if (errorMsg.includes('rejected')) {
        alert('Transaction rejected. Make sure you approved the transaction in your wallet.')
      } else {
        alert(`Link failed: ${errorMsg}`)
      }
    }
  }

  const handleUnlink = async () => {
    if (confirm('Are you sure you want to unlink this NFTid?')) {
      await unlinkNFTid(tokenId)
    }
  }

  // Parse traits using helper
  const parsedTraits = traits ? parseTraits(traits) : null

  // Calculate rarity
  const rarityScore = parsedTraits ? calculateRarityScore(parsedTraits) : 0
  const rarityInfo = getRarityTier(rarityScore)

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
              <div className="w-full aspect-square rounded-lg overflow-hidden mb-6 flex items-center justify-center bg-black/30">
                {parsedTraits ? (
                  <NFTidCompositor traits={parsedTraits} size={500} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-black/50 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[#E8523D]/30 border-t-[#E8523D] rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Rarity Score */}
              {parsedTraits && (
                <div className="mb-6 p-4 bg-gradient-to-br from-black/50 to-black/20 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/50">Rarity Score</span>
                    <span className="text-2xl font-bold text-white">{rarityScore}</span>
                  </div>
                  <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${rarityInfo.color} text-white text-sm font-bold text-center`}>
                    {rarityInfo.tier}
                  </div>
                  <p className="text-xs text-white/40 text-center mt-2">{rarityInfo.description}</p>
                </div>
              )}

              {/* Traits */}
              {parsedTraits && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white/70 mb-3">Traits</h3>
                  {Object.entries(parsedTraits).map(([key, value]) => {
                    const traitKey = key as keyof typeof TRAIT_NAMES
                    const traitName = getTraitName(traitKey, value)
                    return (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <div className="flex flex-col">
                          <span className="text-white/50 capitalize text-xs">{key}</span>
                          <span className="text-white text-sm">{traitName}</span>
                        </div>
                        <span className="font-mono text-[#E8523D]">#{value}</span>
                      </div>
                    )
                  })}
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

                    {loadingAgent ? (
                      <div className="p-4 bg-black/30 rounded-lg text-center">
                        <div className="w-6 h-6 border-2 border-[#E8523D]/30 border-t-[#E8523D] rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs text-white/50">Loading agent data...</p>
                      </div>
                    ) : linkedAgentData ? (
                      <div className="p-4 bg-black/30 rounded-lg border border-white/5 space-y-3">
                        <div>
                          <p className="text-xs text-white/50 mb-1">Agent Name</p>
                          <p className="text-base font-bold text-white">{linkedAgentData.name}</p>
                          <p className="text-xs text-white/40">${linkedAgentData.symbol}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/5">
                          <div>
                            <p className="text-xs text-white/50 mb-1">Price</p>
                            <p className="text-sm text-white">
                              {linkedAgentData.priceUsd ? `$${linkedAgentData.priceUsd.toFixed(6)}` : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-white/50 mb-1">Market Cap</p>
                            <p className="text-sm text-white">
                              {linkedAgentData.mcapUsd 
                                ? linkedAgentData.mcapUsd >= 1_000 
                                  ? `$${(linkedAgentData.mcapUsd / 1_000).toFixed(1)}K`
                                  : `$${linkedAgentData.mcapUsd.toFixed(0)}`
                                : '$0'}
                            </p>
                          </div>
                        </div>
                        <div className="pt-3 border-t border-white/5">
                          <p className="text-xs text-white/50 mb-1">Wallet Address</p>
                          <p className="font-mono text-xs text-white/70 break-all">{linkedAgent as string}</p>
                        </div>
                        <Link
                          href={`/immortal/agent/${linkedAgent}`}
                          className="block w-full px-4 py-3 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg text-center text-white font-semibold hover:shadow-lg hover:shadow-[#E8523D]/40 transition-all"
                        >
                          View Agent Page →
                        </Link>
                      </div>
                    ) : (
                      <div className="p-4 bg-black/30 rounded-lg">
                        <p className="text-xs text-white/50 mb-2">Agent Wallet</p>
                        <p className="font-mono text-sm text-white break-all mb-3">{linkedAgent as string}</p>
                        <Link
                          href={`/immortal/agent/${linkedAgent}`}
                          className="block w-full px-4 py-3 bg-black/50 border border-white/10 hover:border-[#E8523D]/50 rounded-lg text-center text-white transition-all"
                        >
                          View Agent Page →
                        </Link>
                      </div>
                    )}

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
                            <p className="text-xs text-white/50 p-3 bg-[#E8523D]/5 border border-[#E8523D]/20 rounded-lg">
                              ℹ️ You can only link agents that YOU created from this wallet. Paste the agent wallet address below.
                            </p>
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
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
