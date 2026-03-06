import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi'
import { sepolia } from 'viem/chains'
import { NFTID_REGISTRY_ADDRESS, NFTID_REGISTRY_ABI } from '../contracts/nftidRegistry'
import { linkNFTidToAgent, unlinkNFTid as unlinkNFTidLocal } from '../nftidLinkage'

export function useLinkNFTid() {
  const [isLinking, setIsLinking] = useState(false)

  const { data: hash, writeContract, error: linkError, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    chainId: sepolia.id,
  })

  // Check if an NFTid is already linked
  const useIsNFTidLinked = (nftidTokenId?: number) => {
    return useReadContract({
      address: NFTID_REGISTRY_ADDRESS.sepolia,
      abi: NFTID_REGISTRY_ABI,
      functionName: 'isNFTidLinked',
      args: nftidTokenId ? [BigInt(nftidTokenId)] : undefined,
      chainId: sepolia.id,
      query: {
        enabled: !!nftidTokenId,
      },
    })
  }

  // Check if an agent is already linked
  const useIsAgentLinked = (agentWallet?: string) => {
    return useReadContract({
      address: NFTID_REGISTRY_ADDRESS.sepolia,
      abi: NFTID_REGISTRY_ABI,
      functionName: 'isAgentLinked',
      args: agentWallet ? [agentWallet as `0x${string}`] : undefined,
      chainId: sepolia.id,
      query: {
        enabled: !!agentWallet,
      },
    })
  }

  // Get NFTid for an agent
  const useGetNFTidForAgent = (agentWallet?: string) => {
    return useReadContract({
      address: NFTID_REGISTRY_ADDRESS.sepolia,
      abi: NFTID_REGISTRY_ABI,
      functionName: 'getNFTidForAgent',
      args: agentWallet ? [agentWallet as `0x${string}`] : undefined,
      chainId: sepolia.id,
      query: {
        enabled: !!agentWallet,
      },
    })
  }

  // Get agent for an NFTid
  const useGetAgentForNFTid = (nftidTokenId?: number) => {
    return useReadContract({
      address: NFTID_REGISTRY_ADDRESS.sepolia,
      abi: NFTID_REGISTRY_ABI,
      functionName: 'getAgentForNFTid',
      args: nftidTokenId ? [BigInt(nftidTokenId)] : undefined,
      chainId: sepolia.id,
      query: {
        enabled: !!nftidTokenId,
      },
    })
  }

  const linkNFTid = async (nftidTokenId: number, agentWallet: string) => {
    setIsLinking(true)
    try {
      writeContract({
        address: NFTID_REGISTRY_ADDRESS.sepolia,
        abi: NFTID_REGISTRY_ABI,
        functionName: 'linkNFTid',
        args: [BigInt(nftidTokenId), agentWallet as `0x${string}`],
        chainId: sepolia.id,
      })

      // Also update localStorage as backup
      linkNFTidToAgent(nftidTokenId, agentWallet)
    } catch (err) {
      console.error('Failed to link NFTid:', err)
    } finally {
      setIsLinking(false)
    }
  }

  const unlinkNFTid = async (nftidTokenId: number) => {
    setIsLinking(true)
    try {
      writeContract({
        address: NFTID_REGISTRY_ADDRESS.sepolia,
        abi: NFTID_REGISTRY_ABI,
        functionName: 'unlinkNFTid',
        args: [BigInt(nftidTokenId)],
        chainId: sepolia.id,
      })

      // Also update localStorage as backup
      unlinkNFTidLocal(nftidTokenId)
    } catch (err) {
      console.error('Failed to unlink NFTid:', err)
    } finally {
      setIsLinking(false)
    }
  }

  const unlinkAgent = async (agentWallet: string) => {
    setIsLinking(true)
    try {
      writeContract({
        address: NFTID_REGISTRY_ADDRESS.sepolia,
        abi: NFTID_REGISTRY_ABI,
        functionName: 'unlinkAgent',
        args: [agentWallet as `0x${string}`],
        chainId: sepolia.id,
      })
    } catch (err) {
      console.error('Failed to unlink agent:', err)
    } finally {
      setIsLinking(false)
    }
  }

  return {
    linkNFTid,
    unlinkNFTid,
    unlinkAgent,
    linkHash: hash,
    isLinking: isPending || isConfirming || isLinking,
    isLinkSuccess: isSuccess,
    linkError,
    // Export hooks for use in components
    useIsNFTidLinked,
    useIsAgentLinked,
    useGetNFTidForAgent,
    useGetAgentForNFTid,
  }
}
