import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { base } from 'viem/chains'
import { NFTID_REGISTRY_ADDRESS, NFTID_REGISTRY_ABI } from '../contracts/nftidRegistry'
import { linkNFTidToAgent, unlinkNFTid as unlinkNFTidLocal } from '../nftidLinkage'

export function useLinkNFTid() {
  const [isLinking, setIsLinking] = useState(false)

  const { data: hash, writeContract, error: linkError, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: base.id,
  })

  // Check if an NFTid is already linked
  const useIsNFTidLinked = (nftidTokenId?: number) => {
    return useReadContract({
      address: NFTID_REGISTRY_ADDRESS.base,
      abi: NFTID_REGISTRY_ABI,
      functionName: 'isNFTidLinked',
      args: nftidTokenId ? [BigInt(nftidTokenId)] : undefined,
      chainId: base.id,
      query: {
        enabled: !!nftidTokenId,
        refetchInterval: 5000,  // Refetch every 5 seconds
      },
    })
  }

  // Check if a token is already linked
  const useIsTokenLinked = (tokenAddress?: string) => {
    return useReadContract({
      address: NFTID_REGISTRY_ADDRESS.base,
      abi: NFTID_REGISTRY_ABI,
      functionName: 'isTokenLinked',
      args: tokenAddress ? [tokenAddress as `0x${string}`] : undefined,
      chainId: base.id,
      query: {
        enabled: !!tokenAddress,
      },
    })
  }

  // Get NFTid for a token
  const useGetNFTidForToken = (tokenAddress?: string) => {
    return useReadContract({
      address: NFTID_REGISTRY_ADDRESS.base,
      abi: NFTID_REGISTRY_ABI,
      functionName: 'getNFTidForToken',
      args: tokenAddress ? [tokenAddress as `0x${string}`] : undefined,
      chainId: base.id,
      query: {
        enabled: !!tokenAddress,
      },
    })
  }

  // Get token for an NFTid
  const useGetTokenForNFTid = (nftidTokenId?: number) => {
    return useReadContract({
      address: NFTID_REGISTRY_ADDRESS.base,
      abi: NFTID_REGISTRY_ABI,
      functionName: 'getTokenForNFTid',
      args: nftidTokenId ? [BigInt(nftidTokenId)] : undefined,
      chainId: base.id,
      query: {
        enabled: !!nftidTokenId,
        refetchInterval: 5000,  // Refetch every 5 seconds
      },
    })
  }

  const linkNFTid = async (nftidTokenId: number, tokenAddress: string) => {
    setIsLinking(true)
    try {
      writeContract({
        address: NFTID_REGISTRY_ADDRESS.base,
        abi: NFTID_REGISTRY_ABI,
        functionName: 'linkNFTid',
        args: [BigInt(nftidTokenId), tokenAddress as `0x${string}`],
        chainId: base.id,
        gas: 500000n,  // Explicit gas limit
      })

      // Also update localStorage as backup
      linkNFTidToAgent(nftidTokenId, tokenAddress)
    } catch (err) {
      console.error('Failed to link NFTid:', err)
      throw err
    } finally {
      setIsLinking(false)
    }
  }

  const unlinkNFTid = async (nftidTokenId: number) => {
    setIsLinking(true)
    try {
      writeContract({
        address: NFTID_REGISTRY_ADDRESS.base,
        abi: NFTID_REGISTRY_ABI,
        functionName: 'unlinkNFTid',
        args: [BigInt(nftidTokenId)],
        chainId: base.id,
      })

      // Also update localStorage as backup
      unlinkNFTidLocal(nftidTokenId)
    } catch (err) {
      console.error('Failed to unlink NFTid:', err)
    } finally {
      setIsLinking(false)
    }
  }

  return {
    linkNFTid,
    unlinkNFTid,
    linkHash: hash,
    isLinking: isPending || isConfirming || isLinking,
    isLinkSuccess: isSuccess,
    linkError,
    // Export hooks for use in components
    useIsNFTidLinked,
    useIsTokenLinked,
    useGetNFTidForToken,
    useGetTokenForNFTid,
  }
}
