/**
 * FUNLAN QR Code Generator & Renderer
 * 
 * Generates unique 5x5 FUNLAN emoji grids from wallet addresses.
 * Each grid is deterministic - same wallet always produces same QR.
 * 
 * Total combinations: 120^25 = 9.53 × 10^51 (more than atoms in Earth)
 */

import { keccak256, toBytes } from 'viem'

// 120 Core FUNLAN Emojis (same order as Solidity contract)
export const FUNLAN_EMOJIS = [
  // Actions (0-24)
  '🛠️', '🚀', '📈', '💰', '🔥', '📝', '🔍', '💬', '🤝', '🎯',
  '⚡', '🛡️', '🔄', '✅', '❌', '🔗', '📊', '🎨', '🧪', '🏗️',
  '🔓', '🔒', '📤', '📥', '♻️',
  
  // Data (25-39)
  '📦', '🧠', '📜', '💾', '🗄️', '📁', '📄', '🔢', '📍', '🕒',
  '🔐', '🌐', '☁️', '💿', '🗺️',
  
  // Logic (40-51)
  '✓', '✗', '❓', '➡️', '⬅️', '🔁', '🔀', '⚖️', '🎲', '🧮',
  '🔬', '🎯',
  
  // Time (52-59)
  '⏰', '⏱️', '⏸️', '▶️', '⏩', '⏪', '🕐', '♾️',
  
  // State (60-69)
  '🟢', '🔴', '🟡', '🟣', '⚪', '🔵', '🟠', '⚫', '💚', '❤️',
  
  // Social (70-84)
  '👤', '🤖', '👥', '💬', '📢', '🤝', '⚔️', '🎭', '🏆', '💎',
  '⭐', '🚨', '👍', '👎', '🙏',
  
  // System (85-96)
  '⚙️', '🔧', '🖥️', '🌍', '🏠', '🔌', '🔋', '📡', '🛰️', '🖨️',
  '⌨️', '🎛️',
  
  // Math (97-106)
  '➕', '➖', '✖️', '➗', '🟰', '📐', '📊', '📈', '📉', '%',
  
  // Meta (107-114)
  '🦞', '🔥', '💡', '🎨', '🧬', '✍️', '🎤', '👁️',
  
  // Objects (115-119)
  '💰', '🔑', '📱', '🌐', '🏦'
] as const

// Category names for display
export const EMOJI_CATEGORIES = {
  actions: { start: 0, end: 24, name: 'Actions' },
  data: { start: 25, end: 39, name: 'Data' },
  logic: { start: 40, end: 51, name: 'Logic' },
  time: { start: 52, end: 59, name: 'Time' },
  state: { start: 60, end: 69, name: 'State' },
  social: { start: 70, end: 84, name: 'Social' },
  system: { start: 85, end: 96, name: 'System' },
  math: { start: 97, end: 106, name: 'Math' },
  meta: { start: 107, end: 114, name: 'Meta' },
  objects: { start: 115, end: 119, name: 'Objects' }
} as const

/**
 * Generate a 5x5 FUNLAN QR grid from a wallet address
 * Uses the same algorithm as the Solidity contract
 */
export function generateFUNLANGrid(wallet: `0x${string}`): number[] {
  // Hash the wallet address
  let hash = keccak256(toBytes(wallet))
  const hashBytes = hexToBytes(hash)
  
  const grid: number[] = []
  
  for (let i = 0; i < 25; i++) {
    // Re-hash when we run out of bytes
    if (i > 0 && i % 32 === 0) {
      hash = keccak256(toBytes(hash))
    }
    
    // Get the byte at position i % 32
    const randomByte = hashBytes[i % 32]
    
    // Map to emoji index (0-119)
    grid.push(randomByte % 120)
  }
  
  return grid
}

/**
 * Convert grid indices to emoji strings
 */
export function gridToEmojis(grid: number[]): string[] {
  return grid.map(index => FUNLAN_EMOJIS[index])
}

/**
 * Generate a 5x5 emoji grid as a 2D array
 */
export function generateFUNLANMatrix(wallet: `0x${string}`): string[][] {
  const grid = generateFUNLANGrid(wallet)
  const emojis = gridToEmojis(grid)
  
  // Convert to 5x5 matrix
  const matrix: string[][] = []
  for (let row = 0; row < 5; row++) {
    matrix.push(emojis.slice(row * 5, (row + 1) * 5))
  }
  
  return matrix
}

/**
 * Generate FUNLAN QR as a single string (for display)
 */
export function generateFUNLANString(wallet: `0x${string}`): string {
  const matrix = generateFUNLANMatrix(wallet)
  return matrix.map(row => row.join('')).join('\n')
}

/**
 * Generate SVG representation of the FUNLAN QR
 */
export function generateFUNLANSVG(wallet: `0x${string}`, size: number = 200): string {
  const matrix = generateFUNLANMatrix(wallet)
  const cellSize = size / 5
  const fontSize = cellSize * 0.7
  
  const cells = matrix.flatMap((row, y) => 
    row.map((emoji, x) => `
      <text 
        x="${x * cellSize + cellSize / 2}" 
        y="${y * cellSize + cellSize / 2 + fontSize / 3}" 
        font-size="${fontSize}px" 
        text-anchor="middle"
        dominant-baseline="middle"
      >${emoji}</text>
    `)
  ).join('')
  
  return `
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="${size}" 
      height="${size}" 
      viewBox="0 0 ${size} ${size}"
    >
      <rect width="${size}" height="${size}" fill="#000000" rx="10" />
      <rect 
        x="2" y="2" 
        width="${size - 4}" height="${size - 4}" 
        fill="none" 
        stroke="#E8523D" 
        stroke-width="2" 
        rx="8" 
      />
      ${cells}
    </svg>
  `.trim()
}

/**
 * Generate base64 data URI for the SVG
 */
export function generateFUNLANDataURI(wallet: `0x${string}`, size: number = 200): string {
  const svg = generateFUNLANSVG(wallet, size)
  // Browser-compatible base64 encoding
  const encoded = typeof window !== 'undefined' 
    ? btoa(svg)
    : Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${encoded}`
}

/**
 * Get category of an emoji by index
 */
export function getEmojiCategory(index: number): string {
  for (const [key, cat] of Object.entries(EMOJI_CATEGORIES)) {
    if (index >= cat.start && index <= cat.end) {
      return cat.name
    }
  }
  return 'Unknown'
}

/**
 * Analyze a FUNLAN grid for category distribution
 */
export function analyzeGrid(wallet: `0x${string}`): Record<string, number> {
  const grid = generateFUNLANGrid(wallet)
  const distribution: Record<string, number> = {}
  
  for (const index of grid) {
    const category = getEmojiCategory(index)
    distribution[category] = (distribution[category] || 0) + 1
  }
  
  return distribution
}

// Helper function
function hexToBytes(hex: string): number[] {
  const bytes: number[] = []
  for (let i = 2; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2), 16))
  }
  return bytes
}

/**
 * Get unique signature string from FUNLAN grid
 * Format: "🦞🔥💎..." (25 emojis)
 */
export function getFUNLANSignature(wallet: `0x${string}`): string {
  const grid = generateFUNLANGrid(wallet)
  return gridToEmojis(grid).join('')
}

/**
 * Check if the grid has the "🦞" lobster emoji
 * Special significance for claw.click agents!
 */
export function hasLobster(wallet: `0x${string}`): boolean {
  const grid = generateFUNLANGrid(wallet)
  return grid.includes(107) // 🦞 is at index 107
}

/**
 * Count total unique combinations
 * 120 emojis ^ 25 positions = 9.53 × 10^51
 */
export const TOTAL_COMBINATIONS_STRING = '9.53 × 10^51'
// Computed: BigInt(120) ** BigInt(25) = 953962166...
export const TOTAL_COMBINATIONS = '953962166400000000000000000000000000000000000000000000' // 120^25
