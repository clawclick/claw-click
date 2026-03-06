// Rarity weights from traits/weights.json
const TRAIT_WEIGHTS = {
  auras: [85, 75, 90, 60, 50, 95, 40, 70, 55, 45],
  backgrounds: [80, 75, 85, 70, 65, 90, 60, 95, 50, 55],
  cores: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10],
  eyes: [95, 85, 75, 65, 55, 45, 35, 25, 15],
  overlays: [90, 80, 70, 60, 50, 40, 30, 20, 10],
}

export interface Traits {
  aura: number
  background: number
  core: number
  eyes: number
  overlay: number
}

export function calculateRarityScore(traits: Traits): number {
  // Validate traits
  if (!traits || typeof traits !== 'object') {
    console.error('Invalid traits object:', traits)
    return 0
  }

  const auraScore = TRAIT_WEIGHTS.auras[traits.aura] || 0
  const backgroundScore = TRAIT_WEIGHTS.backgrounds[traits.background] || 0
  const coreScore = TRAIT_WEIGHTS.cores[traits.core] || 0
  const eyesScore = TRAIT_WEIGHTS.eyes[traits.eyes] || 0
  const overlayScore = TRAIT_WEIGHTS.overlays[traits.overlay] || 0

  return auraScore + backgroundScore + coreScore + eyesScore + overlayScore
}

export function getRarityTier(score: number): {
  tier: string
  color: string
  description: string
} {
  if (score >= 401) {
    return {
      tier: 'Legendary',
      color: 'from-yellow-500 to-amber-600',
      description: 'Top 1% rarity',
    }
  }
  if (score >= 301) {
    return {
      tier: 'Epic',
      color: 'from-purple-500 to-pink-600',
      description: 'Top 5% rarity',
    }
  }
  if (score >= 201) {
    return {
      tier: 'Rare',
      color: 'from-blue-500 to-cyan-600',
      description: 'Top 15% rarity',
    }
  }
  if (score >= 101) {
    return {
      tier: 'Uncommon',
      color: 'from-green-500 to-emerald-600',
      description: 'Top 40% rarity',
    }
  }
  return {
    tier: 'Common',
    color: 'from-gray-500 to-slate-600',
    description: 'Standard rarity',
  }
}

// Trait names for display (must match array sizes: 10, 10, 10, 9, 9)
export const TRAIT_NAMES = {
  aura: [
    'Solar Flare', 'Cosmic Wind', 'Void Energy', 'Prism Light', 'Shadow Pulse',
    'Nova Burst', 'Lunar Halo', 'Quantum Field', 'Digital Matrix', 'Ethereal Glow',
  ],
  background: [
    'Deep Space', 'Nebula Cloud', 'Starfield', 'Cosmic Dust', 'Void',
    'Galaxy Core', 'Dark Matter', 'Supernova', 'Asteroid Belt', 'Wormhole',
  ],
  core: [
    'Genesis', 'Neural', 'Plasma', 'Quantum', 'Void',
    'Crimson', 'Solar', 'Frozen', 'Overclock', 'Dark Matter',
  ],
  eyes: [
    'Standard', 'Laser', 'Hollow', 'Empty', 'Binary',
    'Cross', 'Glitched', 'Tridot', 'Scan Lines',
  ],
  overlay: [
    'Chromatic Glitch', 'Data Corruption', 'Signal Noise', 'Pixel Storm', 'Scan Lines',
    'RGB Split', 'Digital Decay', 'Static Burst', 'Ghost Image',
  ],
}

export function getTraitName(layer: keyof typeof TRAIT_NAMES, index: number): string {
  return TRAIT_NAMES[layer][index] || `${layer} #${index}`
}
