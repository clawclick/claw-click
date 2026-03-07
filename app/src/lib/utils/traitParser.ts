/**
 * Trait Parser Utility
 * 
 * Handles parsing of NFTid traits from contract responses.
 * wagmi/viem can return struct data in different formats:
 * - Array format: [aura, background, core, eyes, overlay]
 * - Object format: { aura, background, core, eyes, overlay }
 * - Named tuple format: { 0: aura, 1: background, ... }
 * 
 * This utility normalizes all formats to a consistent object structure.
 */

export interface ParsedTraits {
  aura: number
  background: number
  core: number
  eyes: number
  overlay: number
}

/**
 * Parse traits from any format returned by the contract
 */
export function parseTraits(traits: any): ParsedTraits | null {
  if (!traits) {
    console.warn('parseTraits: No traits provided')
    return null
  }

  try {
    // Case 1: Array format [aura, background, core, eyes, overlay]
    if (Array.isArray(traits)) {
      if (traits.length < 5) {
        console.error('parseTraits: Array has less than 5 elements', traits)
        return null
      }
      return {
        aura: Number(traits[0]),
        background: Number(traits[1]),
        core: Number(traits[2]),
        eyes: Number(traits[3]),
        overlay: Number(traits[4]),
      }
    }

    // Case 2: Object/struct format
    if (typeof traits === 'object') {
      // Try named properties first
      if ('aura' in traits || '0' in traits) {
        return {
          aura: Number(traits.aura ?? traits[0]),
          background: Number(traits.background ?? traits[1]),
          core: Number(traits.core ?? traits[2]),
          eyes: Number(traits.eyes ?? traits[3]),
          overlay: Number(traits.overlay ?? traits[4]),
        }
      }
    }

    console.error('parseTraits: Unrecognized format', traits)
    return null
  } catch (error) {
    console.error('parseTraits: Error parsing traits', error, traits)
    return null
  }
}

/**
 * Validate parsed traits
 */
export function validateTraits(traits: ParsedTraits): boolean {
  const { aura, background, core, eyes, overlay } = traits
  
  // Check all traits are numbers and within valid range (0-9)
  return (
    Number.isInteger(aura) && aura >= 0 && aura <= 9 &&
    Number.isInteger(background) && background >= 0 && background <= 9 &&
    Number.isInteger(core) && core >= 0 && core <= 9 &&
    Number.isInteger(eyes) && eyes >= 0 && eyes <= 9 &&
    Number.isInteger(overlay) && overlay >= 0 && overlay <= 9
  )
}
