/**
 * ClawClick SDK — FUNLAN Emoji Grid Generator
 *
 * Deterministic 5x5 emoji grid from wallet address.
 * Same wallet = same grid. Total combos: 120^25 ≈ 9.53 × 10^51
 */

import { keccak256, toBytes } from 'viem';

const FUNLAN_EMOJIS = [
  // Actions (0-24)
  '🛠️','🚀','📈','💰','🔥','📝','🔍','💬','🤝','🎯',
  '⚡','🛡️','🔄','✅','❌','🔗','📊','🎨','🧪','🏗️',
  '🔓','🔒','📤','📥','♻️',
  // Data (25-39)
  '📦','🧠','📜','💾','🗄️','📁','📄','🔢','📍','🕒',
  '🔐','🌐','☁️','💿','🗺️',
  // Logic (40-51)
  '✓','✗','❓','➡️','⬅️','🔁','🔀','⚖️','🎲','🧮','🔬','🎯',
  // Time (52-59)
  '⏰','⏱️','⏸️','▶️','⏩','⏪','🕐','♾️',
  // State (60-69)
  '🟢','🔴','🟡','🟣','⚪','🔵','🟠','⚫','💚','❤️',
  // Social (70-84)
  '👤','🤖','👥','💬','📢','🤝','⚔️','🎭','🏆','💎','⭐','🚨','👍','👎','🙏',
  // System (85-96)
  '⚙️','🔧','🖥️','🌍','🏠','🔌','🔋','📡','🛰️','🖨️','⌨️','🎛️',
  // Math (97-106)
  '➕','➖','✖️','➗','🟰','📐','📊','📈','📉','%',
  // Meta (107-114)
  '🦞','🔥','💡','🎨','🧬','✍️','🎤','👁️',
  // Objects (115-119)
  '💰','🔑','📱','🌐','🏦',
];

export interface FunlanGrid {
  grid: string[][];
  flat: string[];
  text: string;
}

/** Generate a deterministic 5×5 FUNLAN emoji grid from a wallet address */
export function generateFunlanGrid(wallet: `0x${string}`): FunlanGrid {
  const grid: string[][] = [];
  const flat: string[] = [];
  let entropy = keccak256(toBytes(wallet.toLowerCase()));

  for (let row = 0; row < 5; row++) {
    const rowEmojis: string[] = [];
    for (let col = 0; col < 5; col++) {
      const idx = (row * 5) + col;
      // Use 2 hex chars per cell from entropy, re-hash when exhausted
      const byteOffset = (idx * 2) % 64;
      if (byteOffset === 0 && idx > 0) {
        entropy = keccak256(toBytes(entropy));
      }
      const hexByte = entropy.slice(2 + byteOffset, 4 + byteOffset);
      const val = parseInt(hexByte, 16) % FUNLAN_EMOJIS.length;
      const emoji = FUNLAN_EMOJIS[val];
      rowEmojis.push(emoji);
      flat.push(emoji);
    }
    grid.push(rowEmojis);
  }

  const text = grid.map(r => r.join(' ')).join('\n');
  return { grid, flat, text };
}

/** Check if grid contains the lobster emoji 🦞 */
export function hasLobster(wallet: `0x${string}`): boolean {
  const { flat } = generateFunlanGrid(wallet);
  return flat.includes('🦞');
}

/** Format grid as FUNLAN.md content */
export function toFunlanMarkdown(wallet: `0x${string}`): string {
  const { text } = generateFunlanGrid(wallet);
  return `# FUNLAN Identity Grid

Wallet: \`${wallet}\`
Generated: ${new Date().toISOString()}

\`\`\`
${text}
\`\`\`

This grid is deterministically derived from the wallet address using keccak256.
Same wallet always produces the same grid. 120 emoji alphabet, 5×5 = 25 cells.
Total unique combinations: 120^25 ≈ 9.53 × 10^51
`;
}
