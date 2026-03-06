import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { sepolia } from 'viem/chains'
import { CLAWD_NFT_ADDRESS, CLAWD_NFT_ABI } from '../contracts/clawdNFT'
import { parseEther } from 'viem'

export function useClawdNFTMint() {
  const { address } = useAccount()
  const chainId = sepolia.id // TODO: Support multiple chains

  // Read total supply
  const { data: totalSupply, refetch: refetchSupply } = useReadContract({
    address: CLAWD_NFT_ADDRESS.sepolia,
    abi: CLAWD_NFT_ABI,
    functionName: 'totalSupply',
    chainId,
  })

  // Read current price
  const { data: currentPrice } = useReadContract({
    address: CLAWD_NFT_ADDRESS.sepolia,
    abi: CLAWD_NFT_ABI,
    functionName: 'getCurrentPrice',
    chainId,
  })

  // Check free mint eligibility
  const { data: isEligibleForFreeMint } = useReadContract({
    address: CLAWD_NFT_ADDRESS.sepolia,
    abi: CLAWD_NFT_ABI,
    functionName: 'isEligibleForFreeMint',
    args: address ? [address] : undefined,
    chainId,
  })

  // Mint function
  const {
    writeContract: mint,
    data: mintHash,
    isPending: isMintPending,
    error: mintError,
  } = useWriteContract()

  const {
    isLoading: isMintConfirming,
    isSuccess: isMintSuccess,
  } = useWaitForTransactionReceipt({
    hash: mintHash,
  })

  const handleMint = () => {
    const maxAttempts = 50 // Reasonable limit for finding unique combo
    const value = isEligibleForFreeMint ? parseEther('0') : (currentPrice || parseEther('0.0015'))

    mint({
      address: CLAWD_NFT_ADDRESS.sepolia,
      abi: CLAWD_NFT_ABI,
      functionName: 'mint',
      args: [BigInt(maxAttempts)],
      value,
      chainId,
    })
  }

  return {
    // Read data
    totalSupply,
    currentPrice,
    isEligibleForFreeMint,
    
    // Mint actions
    handleMint,
    mintHash,
    isMintPending,
    isMintConfirming,
    isMintSuccess,
    mintError,
    
    // Utils
    refetchSupply,
  }
}
