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
  const [tokenAddressInput, setTokenAddressInput] = useState('')
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkedTokenData, setLinkedTokenData] = useState<any>(null)
  const [loadingToken, setLoadingToken] = useState(false)

  const {
    linkNFTid,
    unlinkNFTid,
    isLinking,
    isLinkSuccess,
    linkError,
    useGetTokenForNFTid,
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

  // Check if linked (refetch every 5 seconds after link success)
  const { data: isLinked, refetch: refetchLinked } = useIsNFTidLinked(tokenId)
  const { data: linkedToken, refetch: refetchToken } = useGetTokenForNFTid(tokenId)
  
  // Debug: log the query results
  useEffect(() => {
    console.log('[NFTid] Query results:', { 
      tokenId, 
      isLinked, 
      linkedToken,
      linkedTokenType: typeof linkedToken,
      isZeroAddress: linkedToken === '0x0000000000000000000000000000000000000000'
    })
  }, [tokenId, isLinked, linkedToken])
  
  // Refetch link status when link succeeds (multiple times to force cache update)
  useEffect(() => {
    if (isLinkSuccess) {
      // Refetch immediately
      refetchLinked()
      refetchToken()
      
      // Refetch again after 1 second
      setTimeout(() => {
        refetchLinked()
        refetchToken()
      }, 1000)
      
      // And again after 3 seconds
      setTimeout(() => {
        refetchLinked()
        refetchToken()
      }, 3000)
      
      // And again after 5 seconds
      setTimeout(() => {
        refetchLinked()
        refetchToken()
      }, 5000)
    }
  }, [isLinkSuccess, refetchLinked, refetchToken])

  const isOwner = address && owner && address.toLowerCase() === (owner as string).toLowerCase()

  // Fetch linked token data
  useEffect(() => {
    async function fetchTokenData() {
      if (!linkedToken || linkedToken === '0x0000000000000000000000000000000000000000') return
      setLoadingToken(true)
      try {
        const agent = await getAgentByWallet(linkedToken as `0x${string}`)
        setLinkedTokenData(agent)
      } catch (err) {
        console.error('Failed to fetch token data:', err)
      } finally {
        setLoadingToken(false)
      }
    }

    fetchTokenData()
  }, [linkedToken])

  const handleLink = async () => {
    if (!isAddress(tokenAddressInput)) {
      alert('❌ Invalid address. Please enter a valid token address (0x...)')
      return
    }
    
    try {
      await linkNFTid(tokenId, tokenAddressInput)
      setShowLinkForm(false)
      setTokenAddressInput('')
    } catch (err: any) {
      console.error('Link failed:', err)
      
      const errorMsg = err.shortMessage || err.message || 'Unknown error'
      if (errorMsg.includes('You did not create this token')) {
        alert('❌ You must be the creator of this token to link it.')
      } else if (errorMsg.includes('Token has no birth certificate')) {
        alert('❌ This token has no birth certificate. Only immortalized tokens can be linked.')
      } else if (errorMsg.includes('rejected')) {
        alert('❌ Transaction rejected in wallet.')
      } else {
        alert(`❌ Link failed: ${errorMsg}`)
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
    <div className="min-h-screen text-[var(--text-primary)] pt-20 md:pt-32 pb-12 md:pb-20 relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden z-[2] pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--mint-mid)]/5 via-transparent to-transparent"></div>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Back button */}
          <Link
            href="/soul"
            className="inline-flex items-center gap-2 text-white/50 hover:text-[var(--mint-dark)] transition-colors mb-6 md:mb-8"
          >
            <span>←</span> Back to Soul NFTids
          </Link>

          {/* Main Grid - Mobile Responsive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
            {/* NFT Image - Mobile Responsive */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl md:rounded-2xl p-4 md:p-6 lg:p-8 glass border border-[var(--glass-border)]"
            >
              <div className="w-full aspect-square rounded-lg overflow-hidden mb-4 md:mb-6 flex items-center justify-center" style={{background:'var(--glass-bg)'}}>
                {parsedTraits ? (
                  <NFTidCompositor traits={parsedTraits} size={300} className="w-full h-full md:w-full md:h-full" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{background:'var(--glass-bg)'}}>
                    <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-[var(--glass-border)] border-t-[var(--mint-mid)] rounded-full animate-spin"></div>
                  </div>
                )}
              </div>

              {/* Rarity Score - Mobile Responsive */}
              {parsedTraits && (
                <div className="mb-4 md:mb-6 p-3 md:p-4 rounded-lg border border-[var(--glass-border)]" style={{background:'var(--glass-bg)'}}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs md:text-sm text-[var(--text-secondary)]">Rarity Score</span>
                    <span className="text-xl md:text-2xl font-bold text-white">{rarityScore}</span>
                  </div>
                  <div className={`px-2 md:px-3 py-1 rounded-full bg-gradient-to-r ${rarityInfo.color} text-white text-xs md:text-sm font-bold text-center`}>
                    {rarityInfo.tier}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]/70 text-center mt-2">{rarityInfo.description}</p>
                </div>
              )}

              {/* Traits - Mobile Responsive */}
              {parsedTraits && (
                <div className="space-y-2">
                  <h3 className="text-xs md:text-sm font-bold text-[var(--text-secondary)] mb-3">Traits</h3>
                  {Object.entries(parsedTraits).map(([key, value]) => {
                    const traitKey = key as keyof typeof TRAIT_NAMES
                    const traitName = getTraitName(traitKey, value)
                    return (
                      <div key={key} className="flex items-center justify-between text-xs md:text-sm">
                        <div className="flex flex-col">
                          <span className="text-[var(--text-secondary)] capitalize text-xs">{key}</span>
                          <span className="text-[var(--text-primary)] text-xs md:text-sm">{traitName}</span>
                        </div>
                        <span className="font-mono text-[var(--mint-dark)] text-xs">#{value}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>

            {/* Info & Actions - Mobile Responsive */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-4 md:space-y-6"
            >
              {/* Title - Mobile Responsive */}
              <div>
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">
                  <span className="bg-gradient-to-r from-[var(--mint-light)] to-[var(--mint-dark)] text-transparent bg-clip-text">
                    NFTid #{tokenId}
                  </span>
                </h1>
                <p className="text-sm md:text-base text-[var(--text-secondary)]">Soul NFT Identity</p>
              </div>

              {/* Owner Info - Mobile Responsive */}
              <div className="rounded-lg md:rounded-xl p-4 md:p-6 glass border border-[var(--glass-border)]">
                <h3 className="text-xs md:text-sm font-bold text-[var(--text-secondary)] mb-3">Owner</h3>
                <div className="flex items-start md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs md:text-sm text-[var(--text-secondary)] break-all">
                      {owner as string || 'Loading...'}
                    </p>
                  </div>
                  {isOwner && (
                    <span className="px-2 md:px-3 py-1 rounded-full bg-[var(--mint-light)]/20 text-[var(--mint-dark)] text-xs font-semibold flex-shrink-0">
                      YOU
                    </span>
                  )}
                </div>
              </div>

              {/* Token Linkage - Mobile Responsive */}
              <div className="rounded-lg md:rounded-xl p-4 md:p-6 glass border border-[var(--glass-border)]">
                <h3 className="text-xs md:text-sm font-bold text-[var(--text-secondary)] mb-3">Token Linkage</h3>
                
                {isLinked && linkedToken && linkedToken !== '0x0000000000000000000000000000000000000000' ? (
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs md:text-sm text-green-400">Linked to Token</span>
                    </div>

                    {loadingToken ? (
                      <div className="p-3 md:p-4 bg-black/30 rounded-lg text-center">
                        <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-[var(--glass-border)] border-t-[var(--mint-mid)] rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-xs text-white/50">Loading token data...</p>
                      </div>
                    ) : linkedTokenData ? (
                      <div className="glass p-3 md:p-4 rounded-lg space-y-2 md:space-y-3">
                        <div>
                          <p className="text-xs text-[var(--text-secondary)] mb-1">Token Name</p>
                          <p className="text-sm md:text-base font-bold text-[var(--text-primary)] break-words">{linkedTokenData.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]/70">${linkedTokenData.symbol}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 md:gap-3 pt-2 md:pt-3 border-t border-[var(--glass-border)]">
                          <div>
                            <p className="text-xs text-[var(--text-secondary)] mb-1">Price</p>
                            <p className="text-xs md:text-sm text-[var(--text-primary)]">
                              {linkedTokenData.priceUsd ? `$${linkedTokenData.priceUsd.toFixed(6)}` : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-secondary)] mb-1">Market Cap</p>
                            <p className="text-xs md:text-sm text-[var(--text-primary)]">
                              {linkedTokenData.mcapUsd 
                                ? linkedTokenData.mcapUsd >= 1_000 
                                  ? `$${(linkedTokenData.mcapUsd / 1_000).toFixed(1)}K`
                                  : `$${linkedTokenData.mcapUsd.toFixed(0)}`
                                : '$0'}
                            </p>
                          </div>
                        </div>
                        <div className="pt-2 md:pt-3 border-t border-[var(--glass-border)]">
                          <p className="text-xs text-[var(--text-secondary)] mb-1">Token Address</p>
                          <p className="font-mono text-xs text-[var(--text-secondary)] break-all">{linkedToken as string}</p>
                        </div>
                        <Link
                          href={`/spawner/agent/${linkedToken}`}
                          className="block w-full px-3 md:px-4 py-2 md:py-3 rounded-lg text-center text-[#083A36] font-semibold hover:opacity-90 transition-all text-sm"
                          style={{background:'var(--mint-mid)'}}
                        >
                          View Agent Page →
                        </Link>
                      </div>
                    ) : (
                      <div className="p-3 md:p-4 rounded-lg" style={{background:'var(--glass-bg)'}}>
                        <p className="text-xs text-white/50 mb-2">Token Address</p>
                        <p className="font-mono text-xs md:text-sm text-[var(--text-primary)] break-all mb-2 md:mb-3">{linkedToken as string}</p>
                        <Link
                          href={`/spawner/agent/${linkedToken}`}
                          className="block w-full px-3 md:px-4 py-2 md:py-3 rounded-lg text-center text-[var(--text-primary)] transition-all border border-[var(--glass-border)] hover:border-[var(--mint-mid)] hover:bg-[var(--mint-light)]/10 text-sm"
                        >
                          View Agent Page →
                        </Link>
                      </div>
                    )}

                    {isOwner && (
                      <button
                        onClick={handleUnlink}
                        disabled={isLinking}
                        className="w-full px-3 md:px-4 py-2 md:py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg transition-all disabled:opacity-50 text-sm"
                      >
                        {isLinking ? 'Unlinking...' : 'Unlink Token'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-white/30"></div>
                      <span className="text-xs md:text-sm text-[var(--text-secondary)]">Not Linked</span>
                    </div>

                    {isOwner && (
                      <>
                        {!showLinkForm ? (
                          <button
                            onClick={() => setShowLinkForm(true)}
                            className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg transition-all border border-[var(--glass-border)] text-[var(--mint-dark)] hover:bg-[var(--mint-light)]/20 text-sm"
                          >
                            Link to Token
                          </button>
                        ) : (
                          <div className="space-y-2 md:space-y-3">
                            <input
                              type="text"
                              placeholder="Paste token address (0x...)"
                              value={tokenAddressInput}
                              onChange={(e) => setTokenAddressInput(e.target.value)}
                              className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg text-white text-xs md:text-sm font-mono focus:outline-none"
                              style={{background:'var(--glass-bg)',border:'1px solid var(--glass-border)'}}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={handleLink}
                                disabled={isLinking || !tokenAddressInput}
                                className="flex-1 px-3 md:px-4 py-2 md:py-3 rounded-lg font-semibold transition-all disabled:opacity-50 text-[#0F2F2C] text-sm"
                                style={{background:'var(--mint-mid)'}}
                              >
                                {isLinking ? 'Linking...' : 'Confirm Link'}
                              </button>
                              <button
                                onClick={() => setShowLinkForm(false)}
                                className="px-3 md:px-4 py-2 md:py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-sm"
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
                  <p className="text-red-400 text-xs mt-3 md:mt-4 break-words">
                    {(linkError as any).shortMessage || linkError.message}
                  </p>
                )}

                {isLinkSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 md:mt-4 p-3 md:p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
                  >
                    <p className="text-green-400 text-xs md:text-sm">✓ Link updated successfully!</p>
                  </motion.div>
                )}
              </div>

              {/* Actions - Mobile Responsive */}
              <div className="space-y-2 md:space-y-3">
                <Link
                  href={`https://basescan.org/token/${CLAWD_NFT_ADDRESS.base}?a=${tokenId}`}
                  target="_blank"
                  className="block w-full px-3 md:px-4 py-2 md:py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-center transition-all text-sm"
                >
                  View on Basescan →
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
