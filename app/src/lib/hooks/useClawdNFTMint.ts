import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { base } from 'viem/chains'
import { CLAWD_NFT_ADDRESS, CLAWD_NFT_ABI } from '../contracts/clawdNFT'
import { parseEther } from 'viem'

export function useClawdNFTMint() {
  const { address } = useAccount()
  const chainId = base.id // Base mainnet

  // Read total supply
  const { data: totalSupply, refetch: refetchSupply } = useReadContract({
    address: CLAWD_NFT_ADDRESS.base,
    abi: CLAWD_NFT_ABI,
    functionName: 'totalSupply',
    chainId,
  })

  // Read current price
  const { data: currentPrice } = useReadContract({
    address: CLAWD_NFT_ADDRESS.base,
    abi: CLAWD_NFT_ABI,
    functionName: 'getCurrentPrice',
    chainId,
  })

  // Check free mint eligibility
  const { data: isEligibleForFreeMint } = useReadContract({
    address: CLAWD_NFT_ADDRESS.base,
    abi: CLAWD_NFT_ABI,
    functionName: 'isEligibleForFreeMint',
    args: address ? [address] : undefined,
    chainId,
  })

  // Get remaining free mints (V2)
  const { data: remainingFreeMints } = useReadContract({
    address: CLAWD_NFT_ADDRESS.base,
    abi: CLAWD_NFT_ABI,
    functionName: 'getRemainingFreeMints',
    args: address ? [address] : undefined,
    chainId,
  })

  // Count agents created by user (V2)
  const { data: agentsCreated } = useReadContract({
    address: CLAWD_NFT_ADDRESS.base,
    abi: CLAWD_NFT_ABI,
    functionName: 'countAgentsCreated',
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
    const maxAttempts = 10 // Reduced from 50 to lower gas usage
    // Explicitly check if eligible is true (not undefined or false)
    const useFreeMint = isEligibleForFreeMint === true
    const value = useFreeMint ? parseEther('0') : (currentPrice || parseEther('0.0015'))

    mint({
      address: CLAWD_NFT_ADDRESS.base,
      abi: CLAWD_NFT_ABI,
      functionName: 'mint',
      args: [useFreeMint, BigInt(maxAttempts)],  // V2: useFreeMint boolean first
      value,
      gas: 1000000n, // 1M gas - conservative limit, plenty for ~10 iterations
    })
  }

  return {
    // Read data
    totalSupply,
    currentPrice,
    isEligibleForFreeMint,
    remainingFreeMints,  // V2
    agentsCreated,       // V2
    
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
