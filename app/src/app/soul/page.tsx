'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useAccount, useReadContract, usePublicClient } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useClawdNFTMint } from '../../lib/hooks/useClawdNFTMint'
import { useEffect, useState } from 'react'
import { sepolia } from 'viem/chains'
import { formatEther } from 'viem'
import { CLAWD_NFT_ADDRESS, PRICE_TIERS, CLAWD_NFT_ABI } from '../../lib/contracts/clawdNFT'
import { useRouter } from 'next/navigation'
import LobsterIcon from '../../components/icons/LobsterIcon'
import AnimatedNFTShowcase from '../../components/AnimatedNFTShowcase'
import NFTidCompositor from '../../components/NFTidCompositor'
import { getNFTidForAgentSync } from '../../lib/nftidLinkage'
import { calculateRarityScore, getRarityTier } from '../../lib/utils/rarityCalculator'

// Minted NFTs for collection feed
const MINTED_NFTS = [
  {
    tokenId: 1,
    minter: '0x958fC4d5688F7e7425EEa770F54d5126a46A9104',
    txHash: '0xbb1d40e46477e3c8835c2a4b50ffbe253820d9bdb4a187ae96b80095f1251ea2',
    traits: { aura: 5, background: 2, core: 2, eyes: 2, overlay: 4 },
  },
  {
    tokenId: 2,
    minter: '0x958fC4d5688F7e7425EEa770F54d5126a46A9104',
    txHash: '0x5f5efa4d7623e089e25326d8b9b2ad88858c0110854ef0118666316186798d26',
    traits: { aura: 5, background: 3, core: 3, eyes: 4, overlay: 8 },
  },
  {
    tokenId: 3,
    minter: '0x958fC4d5688F7e7425EEa770F54d5126a46A9104',
    txHash: '0x0e55b5805ed939c134f71c0d00c618bb27e55e9d6c2cc35a1c2347cf42544063',
    traits: { aura: 0, background: 8, core: 4, eyes: 3, overlay: 2 },
  },
  {
    tokenId: 4,
    minter: '0x958fC4d5688F7e7425EEa770F54d5126a46A9104',
    txHash: '0x0e3b615684c0b03e69d5a737f1ce99bf42fe61117a035abbdb8fa7c03a6aff48',
    traits: { aura: 1, background: 9, core: 4, eyes: 2, overlay: 4 },
  },
  {
    tokenId: 5,
    minter: '0x958fC4d5688F7e7425EEa770F54d5126a46A9104',
    txHash: '0x751e03087630464a95cd12590e0fe6bd6d771ed95d8bdf088edfb0b96c28f7cc',
    traits: { aura: 8, background: 1, core: 4, eyes: 1, overlay: 8 },
  },
  {
    tokenId: 6,
    minter: '0x958fC4d5688F7e7425EEa770F54d5126a46A9104',
    txHash: '0x37fec3c541ef8e736f69060ea2151f8b67039be1d679780aaac187d1b87957c8',
    traits: { aura: 1, background: 5, core: 8, eyes: 7, overlay: 7 },
  },
  {
    tokenId: 7,
    minter: '0x958fC4d5688F7e7425EEa770F54d5126a46A9104',
    txHash: '0xb7ad3f338fcfd10fcbb36b2a8c2db9f57138874b6d1222f169c19ef85f2c5396',
    traits: { aura: 3, background: 7, core: 7, eyes: 3, overlay: 3 },
  },
  {
    tokenId: 8,
    minter: '0x958fC4d5688F7e7425EEa770F54d5126a46A9104',
    txHash: '0xae81e2382bef1ffd8b574ee5f8eddb45c918be15fb1d9b79783a45d7d135c5ba',
    traits: { aura: 3, background: 7, core: 9, eyes: 7, overlay: 5 },
  },
  {
    tokenId: 9,
    minter: '0x958fC4d5688F7e7425EEa770F54d5126a46A9104',
    txHash: '0x31df28dd7df12275827a057024cfde52de8e00a32ccc2354fd7e07387e256c0e',
    traits: { aura: 1, background: 3, core: 3, eyes: 5, overlay: 2 },
  },
]

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

  const wrongNetwork = chain && chain.id !== sepolia.id

  // State for owned NFTs
  const [ownedNFTs, setOwnedNFTs] = useState<Array<{
    tokenId: number
    traits: { aura: number; background: number; core: number; eyes: number; overlay: number }
    linkedAgent: string | null
  }>>([])
  const [loadingOwnedNFTs, setLoadingOwnedNFTs] = useState(false)

  // Read balance of connected wallet
  const { data: balance } = useReadContract({
    address: CLAWD_NFT_ADDRESS.sepolia,
    abi: [{
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'owner', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
    }],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: sepolia.id,
  })

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

        // Query Transfer events to find owned tokens
        // Alternative: iterate through all tokenIds and check ownership (expensive!)
        // For now, use a simple approach: query recent Minted events
        const currentSupply = Number(totalSupply || 0)
        
        // Check last 100 minted tokens for ownership (simple approach)
        const startToken = Math.max(1, currentSupply - 99)
        const tokenChecks = []
        
        for (let tokenId = startToken; tokenId <= currentSupply; tokenId++) {
          tokenChecks.push(
            publicClient.readContract({
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
            }).then(owner => ({ tokenId, owner }))
          )
        }

        const results = await Promise.allSettled(tokenChecks)
        const ownedTokenIds: number[] = []

        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value.owner) {
            const owner = result.value.owner as string
            if (owner.toLowerCase() === address.toLowerCase()) {
              ownedTokenIds.push(result.value.tokenId)
            }
          }
        })

        // Fetch traits for owned tokens
        for (const tokenId of ownedTokenIds) {
          try {
            const traits = await publicClient.readContract({
              address: CLAWD_NFT_ADDRESS.sepolia,
              abi: CLAWD_NFT_ABI,
              functionName: 'getTraits',
              args: [BigInt(tokenId)],
            }) as [number, number, number, number, number]

            const linkedAgent = getNFTidForAgentSync(tokenId)

            owned.push({
              tokenId,
              traits: {
                aura: traits[0],
                background: traits[1],
                core: traits[2],
                eyes: traits[3],
                overlay: traits[4],
              },
              linkedAgent,
            })
          } catch (err) {
            console.warn(`Failed to fetch traits for token ${tokenId}:`, err)
          }
        }

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
    <div className="min-h-screen bg-black text-white pt-32 pb-20 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 z-[1]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/5 via-black to-[#FF8C4A]/5"></div>
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#E8523D]/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[#FF8C4A]/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
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
              <div className="text-6xl font-bold bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">
                Soul NFTid
              </div>
            </motion.div>
            
            <p className="text-xl text-white/60 max-w-3xl mx-auto leading-relaxed">
              Generative on-chain identity for autonomous agents. Each NFTid is unique — composed from 5 trait layers with guaranteed no duplicates.
            </p>

            <Link
              href={`https://sepolia.etherscan.io/address/${CLAWD_NFT_ADDRESS.sepolia}`}
              target="_blank"
              className="inline-block mt-6 text-white/40 hover:text-[#E8523D] text-sm transition-colors"
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
              className="group relative overflow-hidden bg-white/[0.02] border border-white/10 rounded-2xl p-8 hover:border-[#E8523D]/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/0 to-[#E8523D]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-4xl font-bold bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text mb-2">
                  {totalSupply?.toString() || '0'} / 10,000
                </div>
                <div className="text-sm text-white/50">Minted Supply</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="group relative overflow-hidden bg-white/[0.02] border border-white/10 rounded-2xl p-8 hover:border-[#E8523D]/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/0 to-[#E8523D]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-4xl font-bold bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text mb-2">
                  {priceInEth} ETH
                </div>
                <div className="text-sm text-white/50">Current Price (~${currentTier.usd})</div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="group relative overflow-hidden bg-white/[0.02] border border-white/10 rounded-2xl p-8 hover:border-[#E8523D]/50 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#E8523D]/0 to-[#E8523D]/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative">
                <div className="text-4xl font-bold bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text mb-2">
                  81,000+
                </div>
                <div className="text-sm text-white/50">Unique Combinations</div>
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
                className="bg-white/[0.02] border border-white/10 rounded-2xl p-8"
              >
                <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-white to-white/60 text-transparent bg-clip-text">
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
                      <div className="w-2 h-2 rounded-full bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] mt-2 group-hover:scale-150 transition-transform"></div>
                      <div>
                        <div className="font-semibold text-white mb-1">{item.title}</div>
                        <div className="text-sm text-white/50">{item.desc}</div>
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
                className="bg-white/[0.02] border border-white/10 rounded-2xl p-6"
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
                          ? 'bg-gradient-to-r from-[#E8523D]/20 to-[#FF8C4A]/20 border border-[#E8523D]/30'
                          : 'bg-black/30 border border-white/5'
                      }`}
                    >
                      <span className="text-sm font-mono text-white/70">#{tier.range}</span>
                      <span className="text-sm font-bold text-white">
                        {tier.price} <span className="text-white/50">({tier.usd})</span>
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
                    ⚠️ Please switch to Sepolia testnet to mint
                  </p>
                </motion.div>
              )}

              {!isConnected ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/[0.02] border border-white/10 rounded-2xl p-12 text-center"
                >
                  <h3 className="text-2xl font-bold mb-4">Connect to Mint</h3>
                  <p className="text-white/50 mb-8">
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
                      className="relative overflow-hidden bg-gradient-to-br from-[#E8523D]/10 to-[#FF8C4A]/10 border border-[#E8523D]/30 rounded-2xl p-8"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#E8523D]/20 rounded-full blur-3xl"></div>
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-6">
                          <LobsterIcon size={32} className="text-[#E8523D]" />
                          <div>
                            <h3 className="text-xl font-bold">Free Mint Available</h3>
                            <p className="text-sm text-white/50">For Birth Certificate holders</p>
                          </div>
                        </div>

                        <button
                          onClick={handleMint}
                          disabled={isMintPending || isMintConfirming || wrongNetwork}
                          className="w-full px-6 py-4 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] rounded-lg font-semibold hover:shadow-xl hover:shadow-[#E8523D]/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
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
                              href={`https://sepolia.etherscan.io/tx/${mintHash}`}
                              target="_blank"
                              className="text-xs text-white/50 hover:text-[#E8523D] transition-colors"
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
                    className="bg-white/[0.02] border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-6">
                      <LobsterIcon size={32} className="text-[#E8523D]" />
                      <div>
                        <h3 className="text-xl font-bold">Mint NFTid</h3>
                        <p className="text-sm text-white/50">{priceInEth} ETH per mint</p>
                      </div>
                    </div>

                    <button
                      onClick={handleMint}
                      disabled={isMintPending || isMintConfirming || wrongNetwork || Number(totalSupply || 0) >= 10000}
                      className="w-full px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#E8523D]/50 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
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
                          href={`https://sepolia.etherscan.io/tx/${mintHash}`}
                          target="_blank"
                          className="text-xs text-white/50 hover:text-[#E8523D] transition-colors"
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
                    className="bg-white/[0.02] border border-white/10 rounded-2xl p-6"
                  >
                    <h3 className="text-sm font-bold mb-4 text-center text-white/70">
                      Preview: Traits Cycling Every Second
                    </h3>
                    <div className="flex justify-center">
                      <AnimatedNFTShowcase size={280} />
                    </div>
                    <p className="text-xs text-white/40 text-center mt-4">
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
              <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">
                My NFTids
              </h2>

              {loadingOwnedNFTs ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-[#E8523D]/30 border-t-[#E8523D] rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white/50 text-sm">Loading your NFTids...</p>
                </div>
              ) : ownedNFTs.length === 0 ? (
                <div className="text-center py-12 bg-white/[0.02] border border-white/10 rounded-2xl">
                  <div className="text-6xl mb-4">🦞</div>
                  <p className="text-white/50 mb-4">You don't own any NFTids yet</p>
                  <p className="text-sm text-white/30">
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
                      <Link key={nft.tokenId} href={`/soul/${nft.tokenId}`}>
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ scale: 1.03 }}
                          className="bg-white/[0.02] border border-white/10 hover:border-[#E8523D]/50 rounded-2xl p-4 transition-all cursor-pointer group"
                        >
                          {/* NFT Image */}
                          <div className="mb-3 rounded-lg overflow-hidden aspect-square w-full relative">
                            <NFTidCompositor traits={nft.traits} size={300} />
                            {/* Rarity Badge */}
                            <div className="absolute top-2 right-2">
                              <div className={`px-2 py-1 rounded-lg bg-gradient-to-r ${rarityInfo.color} text-white text-xs font-bold shadow-lg`}>
                                {rarityInfo.tier}
                              </div>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-white group-hover:text-[#E8523D] transition-colors">
                                NFTid #{nft.tokenId}
                              </span>
                              <span className="text-xs px-2 py-1 rounded bg-[#E8523D]/10 text-[#E8523D] font-semibold">
                                OWNED
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/40">Rarity Score</span>
                              <span className="text-white font-mono">{rarityScore}</span>
                            </div>
                            
                            {nft.linkedAgent && (
                              <div className="text-xs text-white/50 bg-black/30 rounded px-2 py-1">
                                🔗 Linked to Agent
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Collection Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-[#E8523D] to-[#FF8C4A] text-transparent bg-clip-text">
              Recent Mints
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {MINTED_NFTS.map((nft) => (
                <Link key={nft.tokenId} href={`/soul/${nft.tokenId}`}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.03 }}
                    className="bg-white/[0.02] border border-white/10 hover:border-[#E8523D]/50 rounded-2xl p-6 transition-all cursor-pointer group"
                  >
                    {/* NFT Image */}
                    <div className="mb-4 rounded-lg overflow-hidden aspect-square w-full">
                      <NFTidCompositor traits={nft.traits} size={300} />
                    </div>

                    {/* Info */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">NFTid</span>
                        <span className="text-sm font-mono font-bold text-white group-hover:text-[#E8523D] transition-colors">
                          #{nft.tokenId}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/50">Minted by</span>
                        <span className="text-sm font-mono text-white/70">
                          {nft.minter.slice(0, 6)}...{nft.minter.slice(-4)}
                        </span>
                      </div>
                      <Link
                        href={`https://sepolia.etherscan.io/tx/${nft.txHash}`}
                        target="_blank"
                        className="text-xs text-[#E8523D] hover:underline block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View TX →
                      </Link>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>

            <p className="text-center text-white/40 text-sm mt-8">
              View all mints on{' '}
              <Link
                href={`https://sepolia.etherscan.io/address/${CLAWD_NFT_ADDRESS.sepolia}#events`}
                target="_blank"
                className="text-[#E8523D] hover:underline"
              >
                Etherscan
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
