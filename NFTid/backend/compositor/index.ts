/**
 * Image Compositor Service
 * 
 * Generates composited NFT images by layering traits
 * Serves metadata JSON for tokenURI calls
 */

import { createCanvas, loadImage } from 'canvas';
import path from 'path';

interface Traits {
  aura: number;
  background: number;
  core: number;
  eyes: number;
  overlay: number;
}

/**
 * Composite NFT image from trait layers
 */
export async function compositeImage(traits: Traits): Promise<Buffer> {
  const canvas = createCanvas(1000, 1000);
  const ctx = canvas.getContext('2d');

  const assetsDir = path.join(__dirname, '../../clawd-assets');

  // Layer order: background -> core -> eyes -> overlay -> aura
  const layers = [
    `${assetsDir}/backgrounds/background-${traits.background + 1}.png`,
    `${assetsDir}/cores/clawd-${getCoreFilename(traits.core)}`,
    `${assetsDir}/eyes/${getEyesFilename(traits.eyes)}`,
    `${assetsDir}/overlays/${traits.overlay + 1}_transparent.png`,
    `${assetsDir}/auras/${traits.aura + 1}_transparent.png`,
  ];

  // Draw each layer
  for (const layerPath of layers) {
    try {
      const image = await loadImage(layerPath);
      ctx.drawImage(image, 0, 0, 1000, 1000);
    } catch (error) {
      console.error(`Failed to load layer: ${layerPath}`, error);
    }
  }

  return canvas.toBuffer('image/png');
}

/**
 * Get core filename from index
 */
function getCoreFilename(index: number): string {
  const cores = [
    'genesis-core.png',
    'crimson-core.png',
    'frozen-core.png',
    'solar-core.png',
    'neural-core.png',
    'overclock-core.png',
    'plasma-core.png',
    'void-core.png',
    'quantum-core.png',
    'dark-matter-core.png',
  ];
  return cores[index] || 'genesis-core.png';
}

/**
 * Get eyes filename from index
 */
function getEyesFilename(index: number): string {
  const eyes = [
    'no-eyes.png',
    'normal_eyes.png',
    'hollow-eyes.png',
    'binary-eyes-v2.png',
    'tridot-eyes-v2.png',
    'vertical-lines-v2.png',
    'cross-eyes-v2.png',
    'glitched-eyes-v2.png',
    'laser_eyes.png',
  ];
  return eyes[index] || 'normal_eyes.png';
}

/**
 * Generate metadata JSON for a token
 */
export function generateMetadata(
  tokenId: number,
  traits: Traits,
  traitMetadata: any
): any {
  const rarityScore = calculateRarityScore(traits, traitMetadata);
  const rarityTier = getRarityTier(rarityScore);

  return {
    name: `Clawd #${tokenId}`,
    description: 'An autonomous agent identity on claw.click',
    image: `https://api.claw.click/nftid/image/${tokenId}`,
    attributes: [
      {
        trait_type: 'Aura',
        value: traitMetadata.auras[traits.aura].name,
        weight: traitMetadata.auras[traits.aura].weight,
      },
      {
        trait_type: 'Background',
        value: traitMetadata.backgrounds[traits.background].name,
        weight: traitMetadata.backgrounds[traits.background].weight,
      },
      {
        trait_type: 'Core',
        value: traitMetadata.cores[traits.core].name,
        weight: traitMetadata.cores[traits.core].weight,
      },
      {
        trait_type: 'Eyes',
        value: traitMetadata.eyes[traits.eyes].name,
        weight: traitMetadata.eyes[traits.eyes].weight,
      },
      {
        trait_type: 'Overlay',
        value: traitMetadata.overlays[traits.overlay].name,
        weight: traitMetadata.overlays[traits.overlay].weight,
      },
    ],
    rarity_score: rarityScore,
    rarity_tier: rarityTier,
  };
}

function calculateRarityScore(traits: Traits, metadata: any): number {
  return (
    metadata.auras[traits.aura].weight +
    metadata.backgrounds[traits.background].weight +
    metadata.cores[traits.core].weight +
    metadata.eyes[traits.eyes].weight +
    metadata.overlays[traits.overlay].weight
  );
}

function getRarityTier(score: number): string {
  if (score <= 100) return 'Common';
  if (score <= 200) return 'Uncommon';
  if (score <= 300) return 'Rare';
  if (score <= 400) return 'Epic';
  return 'Legendary';
}
