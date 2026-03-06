/**
 * NFTid <-> Agent Linkage
 * 
 * Now uses on-chain AgentNFTidRegistry contract on Sepolia!
 * localStorage kept as fallback during transition
 */

import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'
import { NFTID_REGISTRY_ADDRESS, NFTID_REGISTRY_ABI } from './contracts/nftidRegistry'

export interface NFTidLink {
  nftidTokenId: number
  agentWallet: string
  linkedAt: number
}

const STORAGE_KEY = 'nftid_agent_links'

// Create public client for reading from contract
const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http(`https://eth-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_ETH_SEPOLIA || 'BdgPEmQddox2due7mrt9J'}`),
})

// Get all linkages from localStorage (backup)
export function getAllLinks(): NFTidLink[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

// Link an NFTid to an agent (localStorage backup - actual linking done via contract write)
export function linkNFTidToAgent(nftidTokenId: number, agentWallet: string): void {
  const links = getAllLinks()
  
  // Remove any existing links for this NFTid or agent (1:1 mapping)
  const filtered = links.filter(
    l => l.nftidTokenId !== nftidTokenId && l.agentWallet.toLowerCase() !== agentWallet.toLowerCase()
  )
  
  // Add new link
  filtered.push({
    nftidTokenId,
    agentWallet: agentWallet.toLowerCase(),
    linkedAt: Date.now(),
  })
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

// Get agent linked to an NFTid (reads from contract first, falls back to localStorage)
export async function getAgentForNFTid(nftidTokenId: number): Promise<string | null> {
  try {
    const agent = await sepoliaClient.readContract({
      address: NFTID_REGISTRY_ADDRESS.sepolia,
      abi: NFTID_REGISTRY_ABI,
      functionName: 'getAgentForNFTid',
      args: [BigInt(nftidTokenId)],
    }) as `0x${string}`

    if (agent && agent !== '0x0000000000000000000000000000000000000000') {
      return agent.toLowerCase()
    }
  } catch (err) {
    console.warn('Failed to read from contract, using localStorage:', err)
  }

  // Fallback to localStorage
  const links = getAllLinks()
  const link = links.find(l => l.nftidTokenId === nftidTokenId)
  return link ? link.agentWallet : null
}

// Get NFTid linked to an agent (reads from contract first, falls back to localStorage)
export async function getNFTidForAgent(agentWallet: string): Promise<number | null> {
  try {
    const nftidBigInt = await sepoliaClient.readContract({
      address: NFTID_REGISTRY_ADDRESS.sepolia,
      abi: NFTID_REGISTRY_ABI,
      functionName: 'getNFTidForAgent',
      args: [agentWallet as `0x${string}`],
    }) as bigint

    if (nftidBigInt && nftidBigInt > BigInt(0)) {
      return Number(nftidBigInt)
    }
  } catch (err) {
    console.warn('Failed to read from contract, using localStorage:', err)
  }

  // Fallback to localStorage
  const links = getAllLinks()
  const link = links.find(l => l.agentWallet.toLowerCase() === agentWallet.toLowerCase())
  return link ? link.nftidTokenId : null
}

// Synchronous versions for backward compatibility (use localStorage only)
export function getAgentForNFTidSync(nftidTokenId: number): string | null {
  const links = getAllLinks()
  const link = links.find(l => l.nftidTokenId === nftidTokenId)
  return link ? link.agentWallet : null
}

export function getNFTidForAgentSync(agentWallet: string): number | null {
  const links = getAllLinks()
  const link = links.find(l => l.agentWallet.toLowerCase() === agentWallet.toLowerCase())
  return link ? link.nftidTokenId : null
}

// Unlink an NFTid (localStorage backup - actual unlinking done via contract write)
export function unlinkNFTid(nftidTokenId: number): void {
  const links = getAllLinks()
  const filtered = links.filter(l => l.nftidTokenId !== nftidTokenId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}

// Unlink an agent (localStorage backup - actual unlinking done via contract write)
export function unlinkAgent(agentWallet: string): void {
  const links = getAllLinks()
  const filtered = links.filter(l => l.agentWallet.toLowerCase() !== agentWallet.toLowerCase())
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
}
