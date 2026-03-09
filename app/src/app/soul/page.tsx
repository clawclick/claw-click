'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAccount, useReadContract, usePublicClient } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useClawdNFTMint } from '../../lib/hooks/useClawdNFTMint'
import { useEffect, useState } from 'react'
import { sepolia, base } from 'viem/chains'
import { formatEther } from 'viem'
import { CLAWD_NFT_ADDRESS, PRICE_TIERS, CLAWD_NFT_ABI } from '../../lib/contracts/clawdNFT'
import { useRouter } from 'next/navigation'
import LobsterIcon from '../../components/icons/LobsterIcon'
import AnimatedNFTShowcase from '../../components/AnimatedNFTShowcase'
import NFTidCompositor from '../../components/NFTidCompositor'
import { getAgentForNFTidSync } from '../../lib/nftidLinkage'
import { calculateRarityScore, getRarityTier } from '../../lib/utils/rarityCalculator'
import { parseTraits, validateTraits } from '../../lib/utils/traitParser'

// No hardcoded minted NFTs - will load from chain

export default function SoulPage() {
  const router = useRouter()
  const { address, isConnected, chain } = useAccount()
  const publicClient = usePublicClient()
  const {
    totalSupply,
    currentPrice,
    isEligibleForFreeMint,
    handleMint,
    mintHash,
    isMintPending,
    isMintConfirming,
    isMintSuccess,
    mintError,
  } = useClawdNFTMint()

  const wrongNetwork = chain && chain.id !== base.id

  // State for owned NFTs
  const [ownedNFTs, setOwnedNFTs] = useState<Array<{
    tokenId: number
    traits: { aura: number; background: number; core: number; eyes: number; overlay: number }
    linkedAgent: string | null
  }>>([])
  const [loadingOwnedNFTs, setLoadingOwnedNFTs] = useState(false)

  // Read balance of connected wallet
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: CLAWD_NFT_ADDRESS.base,
    abi: [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'owner', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    }],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: base.id,
  })
  
  // Refetch balance after successful mint
  useEffect(() => {
    if (isMintSuccess) {
      setTimeout(() => refetchBalance(), 2000)
    }
  }, [isMintSuccess, refetchBalance])

  const getCurrentTier = () => {
    const supply = Number(totalSupply || 0)
    if (supply < PRICE_TIERS.tier1.supply) return PRICE_TIERS.tier1
    if (supply < PRICE_TIERS.tier2.supply) return PRICE_TIERS.tier2
    return PRICE_TIERS.tier3
  }

  const currentTier = getCurrentTier()
  const priceInEth = currentPrice ? formatEther(currentPrice) : currentTier.price

  // Redirect to minted NFT after successful mint
  useEffect(() => {
    if (isMintSuccess && totalSupply !== undefined) {
      const mintedTokenId = Number(totalSupply)
      setTimeout(() => {
        router.push(`/soul/${mintedTokenId}`)
      }, 2000)
    }
  }, [isMintSuccess, totalSupply, router])

  // Load owned NFTs when address or balance changes
  useEffect(() => {
    async function loadOwnedNFTs() {
      if (!address || !publicClient || !balance || balance === BigInt(0)) {
        setOwnedNFTs([])
        return
      }

      setLoadingOwnedNFTs(true)
      try {
        const owned: Array<{
          tokenId: number
          traits: { aura: number; background: number; core: number; eyes: number; overlay: number }
          linkedAgent: string | null
        }> = []

        // Query all Transfer events TO the user address
        // This is more reliable than checking last 100 tokens
        const currentSupply = Number(totalSupply || 0)
        
        if (currentSupply === 0) {
          setOwnedNFTs([])
          setLoadingOwnedNFTs(false)
          return
        }

        // Simple approach: check all tokens from 0 to currentSupply
        // Works fine for small supply (<1000 tokens)
        const numOwned = Number(balance)
        let found = 0
        
        for (let tokenId = 0; tokenId < currentSupply && found < numOwned; tokenId++) {
          try {
            // Check if user still owns this token
            const owner = await publicClient.readContract({
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
            })

            if (owner.toLowerCase() !== address.toLowerCase()) {
              continue
            }

            found++

            // Fetch traits
            const traitsResponse = await publicClient.readContract({
              address: CLAWD_NFT_ADDRESS.base,
              abi: CLAWD_NFT_ABI,
              functionName: 'getTraits',
              args: [BigInt(tokenId)],
            })

            // Parse traits using helper
            const parsedTraits = parseTraits(traitsResponse)
            if (!parsedTraits || !validateTraits(parsedTraits)) {
              continue
            }

            const linkedAgent = getAgentForNFTidSync(tokenId)

            owned.push({
              tokenId,
              traits: parsedTraits,
              linkedAgent,
            })
          } catch (err) {
            // Token might not exist or query failed, continue
            continue
          }
        }

        // Sort by tokenId (newest first)
        owned.sort((a, b) => b.tokenId - a.tokenId)

        setOwnedNFTs(owned)
      } catch (err) {
        console.error('Failed to load owned NFTs:', err)
      } finally {
        setLoadingOwnedNFTs(false)
      }
    }

    loadOwnedNFTs()
  }, [address, balance, publicClient, totalSupply])

  return (
    <div className="min-h-screen relative text-[var(--text-primary)] pt-32 pb-20 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-[1]">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--mint-mid)]/5 via-black to-[var(--mint-dark)]/5"></div>
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[var(--mint-mid)]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[var(--mint-dark)]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5 }}
              className="inline-block mb-6"
            >
              <div className="text-6xl font-bold bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] text-transparent bg-clip-text">
                Soul NFTid
              </div>
            </motion.div>
            
            <p className="text-xl text-[var(--text-secondary)] max-w-3xl mx-auto leading-relaxed">
              Generative on-chain identity for autonomous agents. Each NFTid is unique — composed from 5 trait layers with guaranteed no duplicates.
            </p>

            <Link
              href={`https://basescan.org/address/${CLAWD_NFT_ADDRESS.base}`}
              target="_blank"
              className="inline-block mt-6 text-[var(--text-secondary)]/70 hover:text-[var(--mint-mid)] text-sm transition-colors"
            >
              View Contract →
            </Link>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="group relative overflow-hidden bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl p-8 hover:border-[var(--mint-mid)]/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--mint-mid)]/0 to-[var(--mint-mid)]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-4xl font-bold bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] text-transparent bg-clip-text mb-2">
                  {totalSupply?.toString() || '0'} / 10,000
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Minted Supply</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="group relative overflow-hidden bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl p-8 hover:border-[var(--mint-mid)]/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--mint-mid)]/0 to-[var(--mint-mid)]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-4xl font-bold bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] text-transparent bg-clip-text mb-2">
                  {priceInEth} ETH
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Current Price (~${currentTier.usd})</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="group relative overflow-hidden bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl p-8 hover:border-[var(--mint-mid)]/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--mint-mid)]/0 to-[var(--mint-mid)]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-4xl font-bold bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] text-transparent bg-clip-text mb-2">
                  81,000+
                </div>
                <div className="text-sm text-[var(--text-secondary)]">Unique Combinations</div>
              </div>
            </motion.div>
          </div>

          {/* Main Content Grid */}
          <div className="grid lg:grid-cols-2 gap-8 mb-16">
            {/* Left: Info */}
            <div className="space-y-6">
              {/* How It Works */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl p-8"
              >
                <h2 className="text-2xl font-bold mb-6" style={{color:'#0F2F2C'}}>
                  How It Works
                </h2>
                <div className="space-y-6">
                  {[
                    {
                      title: 'Five Trait Layers',
                      desc: 'Background, Core, Eyes, Overlay, and Aura combine to create your unique identity',
                    },
                    {
                      title: 'On-Chain Randomness',
                      desc: 'Blockhash-based generation ensures fair and verifiable trait selection',
                    },
                    {
                      title: 'Guaranteed Unique',
                      desc: 'Smart contract enforces zero duplicates - your combination will never exist again',
                    },
                    {
                      title: 'Tiered Pricing',
                      desc: 'Price increases with supply: 0.0015 ETH → 0.003 ETH → 0.0045 ETH',
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 group">
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] mt-2 group-hover:scale-150 transition-transform"></div>
                      <div>
                        <div className="font-semibold text-[var(--text-primary)] mb-1">{item.title}</div>
                        <div className="text-sm text-[var(--text-secondary)]">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Price Tiers */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl p-6"
              >
                <h3 className="text-lg font-bold mb-4">Pricing Tiers</h3>
                <div className="space-y-3">
                  {[
                    { range: '0-4,000', price: '0.0015 ETH', usd: '$3', active: Number(totalSupply || 0) < 4000 },
                    { range: '4,001-7,000', price: '0.003 ETH', usd: '$6', active: Number(totalSupply || 0) >= 4000 && Number(totalSupply || 0) < 7000 },
                    { range: '7,001-10,000', price: '0.0045 ETH', usd: '$9', active: Number(totalSupply || 0) >= 7000 },
                  ].map((tier) => (
                    <div
                      key={tier.range}
                      className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                        tier.active
                          ? 'bg-gradient-to-r from-[var(--mint-mid)]/20 to-[var(--mint-dark)]/20 border border-[var(--mint-mid)]/30'
                          : 'relative/30 border border-white/5'
                      }`}
                    >
                      <span className="text-sm font-mono text-[var(--text-secondary)]">#{tier.range}</span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {tier.price} <span className="text-[var(--text-secondary)]">({tier.usd})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Right: Mint */}
            <div className="space-y-6">
              {wrongNetwork && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-500/10 border border-red-500/30 rounded-xl p-6"
                >
                  <p className="text-red-400 text-sm">
                    ⚠️ Please switch to Base network to mint
                  </p>
                </motion.div>
              )}

              {!isConnected ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl p-12 text-center"
                >
                  <h3 className="text-2xl font-bold mb-4">Connect to Mint</h3>
                  <p className="text-[var(--text-secondary)] mb-8">
                    Connect your wallet to mint your unique Soul NFTid
                  </p>
                  <ConnectButton />
                </motion.div>
              ) : (
                <>
                  {/* Free Mint */}
                  {isEligibleForFreeMint && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="relative overflow-hidden bg-gradient-to-br from-[var(--mint-mid)]/10 to-[var(--mint-dark)]/10 border border-[var(--mint-mid)]/30 rounded-2xl p-8"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--mint-mid)]/20 rounded-full blur-3xl"></div>
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-6">
                          <LobsterIcon size={32} className="text-[var(--mint-mid)]" />
                          <div>
                            <h3 className="text-xl font-bold">Free Mint Available</h3>
                            <p className="text-sm text-[var(--text-secondary)]">For Birth Certificate holders</p>
                          </div>
                        </div>

                        <button
                          onClick={handleMint}
                          disabled={isMintPending || isMintConfirming || wrongNetwork || isEligibleForFreeMint === undefined}
                          className="w-full px-6 py-4 bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] rounded-lg font-semibold hover:shadow-xl hover:shadow-[var(--mint-mid)]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                        >
                          {isMintPending || isMintConfirming ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Minting...
                            </span>
                          ) : (
                            'Claim Free Mint'
                          )}
                        </button>

                        {mintError && (
                          <p className="text-red-400 text-xs mt-4">
                            {(mintError as any).shortMessage || mintError.message}
                          </p>
                        )}

                        {isMintSuccess && mintHash && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
                          >
                            <p className="text-green-400 text-sm mb-2">✓ Minted successfully! Redirecting...</p>
                            <Link
                              href={`https://basescan.org/tx/${mintHash}`}
                              target="_blank"
                              className="text-xs text-[var(--text-secondary)] hover:text-[var(--mint-mid)] transition-colors"
                            >
                              View Transaction →
                            </Link>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Paid Mint */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: isEligibleForFreeMint ? 0.5 : 0.4 }}
                    className="bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl p-8 hover:border-[var(--glass-border)] transition-all"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <LobsterIcon size={32} className="text-[var(--mint-mid)]" />
                      <div>
                        <h3 className="text-xl font-bold">Mint NFTid</h3>
                        <p className="text-sm text-[var(--text-secondary)]">{priceInEth} ETH per mint</p>
                      </div>
                    </div>

                    <button
                      onClick={handleMint}
                      disabled={isMintPending || isMintConfirming || wrongNetwork || Number(totalSupply || 0) >= 10000}
                      className="w-full px-6 py-4 bg-white/5 hover:bg-white/10 border border-[var(--glass-border)] hover:border-[var(--mint-mid)]/50 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {Number(totalSupply || 0) >= 10000
                        ? 'Sold Out'
                        : isMintPending || isMintConfirming
                        ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Minting...
                          </span>
                        )
                        : `Mint for ${priceInEth} ETH`}
                    </button>

                    {mintError && !isEligibleForFreeMint && (
                      <p className="text-red-400 text-xs mt-4">
                        {(mintError as any).shortMessage || mintError.message}
                      </p>
                    )}

                    {isMintSuccess && mintHash && !isEligibleForFreeMint && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
                      >
                        <p className="text-green-400 text-sm mb-2">✓ Minted successfully! Redirecting...</p>
                        <Link
                          href={`https://basescan.org/tx/${mintHash}`}
                          target="_blank"
                          className="text-xs text-[var(--text-secondary)] hover:text-[var(--mint-mid)] transition-colors"
                        >
                          View Transaction →
                        </Link>
                      </motion.div>
                    )}
                  </motion.div>

                  {/* Animated Showcase */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl p-6"
                  >
                    <h3 className="text-sm font-bold mb-4 text-center text-[var(--text-secondary)]">
                      Preview: Traits Cycling Every Second
                    </h3>
                    <div className="flex justify-center">
                      <AnimatedNFTShowcase size={280} />
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]/70 text-center mt-4">
                      Each mint is completely unique
                    </p>
                  </motion.div>
                </>
              )}
            </div>
          </div>

          {/* My NFTs Section */}
          {isConnected && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-16"
            >
              <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] text-transparent bg-clip-text">
                My NFTids
              </h2>

              {loadingOwnedNFTs ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-[var(--mint-mid)]/30 border-t-[var(--mint-mid)] rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[var(--text-secondary)] text-sm">Loading your NFTids...</p>
                </div>
              ) : ownedNFTs.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl">
                  <div className="text-6xl mb-4">🦞</div>
                  <p className="text-[var(--text-secondary)] mb-4">You don't own any NFTids yet</p>
                  <p className="text-sm text-[var(--text-secondary)]/50">
                    {isEligibleForFreeMint
                      ? 'You\'re eligible for a free mint! Scroll up to claim it.'
                      : `Mint your first NFTid for ${priceInEth} ETH`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {ownedNFTs.map((nft) => {
                    const rarityScore = calculateRarityScore(nft.traits)
                    const rarityInfo = getRarityTier(rarityScore)
                    
                    return (
                      <motion.div
                        key={nft.tokenId}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.03 }}
                      >
                        <Link href={`/soul/${nft.tokenId}`} className="block bg-white/[0.02] border border-[var(--glass-border)] hover:border-[var(--mint-mid)]/50 rounded-2xl p-4 transition-all cursor-pointer group"
                        >
                          {/* NFT Image */}
                          <div className="mb-3 rounded-lg overflow-hidden aspect-square w-full relative">
                            <NFTidCompositor traits={nft.traits} size={300} />
                            {/* Rarity Badge */}
                            <div className="absolute top-2 right-2">
                              <div className={`px-2 py-1 rounded-lg bg-gradient-to-r ${rarityInfo.color} text-[var(--text-primary)] text-xs font-bold shadow-lg`}>
                                {rarityInfo.tier}
                              </div>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--mint-mid)] transition-colors">
                                NFTid #{nft.tokenId}
                              </span>
                              <span className="text-xs px-2 py-1 rounded bg-[var(--mint-mid)]/10 text-[var(--mint-mid)] font-semibold">
                                OWNED
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-[var(--text-secondary)]/70">Rarity Score</span>
                              <span className="text-[var(--text-primary)] font-mono">{rarityScore}</span>
                            </div>
                            
                            {nft.linkedAgent && (
                              <div className="text-xs text-[var(--text-secondary)] relative/30 rounded px-2 py-1">
                                🔗 Linked to Agent
                              </div>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Collection Feed - Shows minted NFTs from chain */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold mb-6 bg-gradient-to-r from-[var(--mint-mid)] to-[var(--mint-dark)] text-transparent bg-clip-text">
              Recent Mints
            </h2>
            <p className="text-[var(--text-secondary)] mb-4">
              View all minted NFTids on{' '}
              <Link
                href={`https://basescan.org/address/${CLAWD_NFT_ADDRESS.base}#events`}
                target="_blank"
                className="text-[var(--mint-mid)] hover:underline"
              >
                Basescan
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
