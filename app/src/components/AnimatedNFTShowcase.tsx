'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNFTShowcaseProps {
  size?: number
  className?: string
}

// Asset mappings
const TRAIT_FILES = {
  backgrounds: Array.from({ length: 10 }, (_, i) => `/clawd-assets/backgrounds/background-${i + 1}.png`),
  cores: [
    '/clawd-assets/cores/clawd-genesis-core.png',
    '/clawd-assets/cores/clawd-neural-core.png',
    '/clawd-assets/cores/clawd-plasma-core.png',
    '/clawd-assets/cores/clawd-quantum-core.png',
    '/clawd-assets/cores/clawd-void-core.png',
    '/clawd-assets/cores/clawd-crimson-core.png',
    '/clawd-assets/cores/clawd-solar-core.png',
    '/clawd-assets/cores/clawd-frozen-core.png',
    '/clawd-assets/cores/clawd-overclock-core.png',
    '/clawd-assets/cores/clawd-dark-matter-core.png',
  ],
  eyes: [
    '/clawd-assets/eyes/normal_eyes.png',
    '/clawd-assets/eyes/laser_eyes.png',
    '/clawd-assets/eyes/hollow-eyes.png',
    '/clawd-assets/eyes/no-eyes.png',
    '/clawd-assets/eyes/binary-eyes-v2.png',
    '/clawd-assets/eyes/cross-eyes-v2.png',
    '/clawd-assets/eyes/glitched-eyes-v2.png',
    '/clawd-assets/eyes/tridot-eyes-v2.png',
    '/clawd-assets/eyes/vertical-lines-v2.png',
  ],
  overlays: Array.from({ length: 9 }, (_, i) => `/clawd-assets/overlays/${i + 1}_transparent.png`),
  auras: Array.from({ length: 10 }, (_, i) => `/clawd-assets/auras/${i + 1}_transparent.png`),
}

export default function AnimatedNFTShowcase({ size = 300, className }: AnimatedNFTShowcaseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [loadedImages, setLoadedImages] = useState<{
    backgrounds: HTMLImageElement[]
    cores: HTMLImageElement[]
    eyes: HTMLImageElement[]
    overlays: HTMLImageElement[]
    auras: HTMLImageElement[]
  } | null>(null)

  // Preload all images once
  useEffect(() => {
    const loadAllImages = async () => {
      const backgrounds = await Promise.all(
        TRAIT_FILES.backgrounds.map((src) => {
          return new Promise<HTMLImageElement>((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => resolve(img) // Continue even if one fails
            img.src = src
          })
        })
      )

      const cores = await Promise.all(
        TRAIT_FILES.cores.map((src) => {
          return new Promise<HTMLImageElement>((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => resolve(img)
            img.src = src
          })
        })
      )

      const eyes = await Promise.all(
        TRAIT_FILES.eyes.map((src) => {
          return new Promise<HTMLImageElement>((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => resolve(img)
            img.src = src
          })
        })
      )

      const overlays = await Promise.all(
        TRAIT_FILES.overlays.map((src) => {
          return new Promise<HTMLImageElement>((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => resolve(img)
            img.src = src
          })
        })
      )

      const auras = await Promise.all(
        TRAIT_FILES.auras.map((src) => {
          return new Promise<HTMLImageElement>((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => resolve(img)
            img.src = src
          })
        })
      )

      setLoadedImages({ backgrounds, cores, eyes, overlays, auras })
    }

    loadAllImages()
  }, [])

  // Animate trait changes
  useEffect(() => {
    if (!loadedImages || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let currentTraits = {
      background: Math.floor(Math.random() * 10),
      core: Math.floor(Math.random() * 10),
      eyes: Math.floor(Math.random() * 9),
      overlay: Math.floor(Math.random() * 9),
      aura: Math.floor(Math.random() * 10),
    }

    const drawCurrentCombo = () => {
      ctx.clearRect(0, 0, size, size)
      
      // Draw layers in order
      ctx.drawImage(loadedImages.backgrounds[currentTraits.background], 0, 0, size, size)
      ctx.drawImage(loadedImages.cores[currentTraits.core], 0, 0, size, size)
      ctx.drawImage(loadedImages.eyes[currentTraits.eyes], 0, 0, size, size)
      ctx.drawImage(loadedImages.overlays[currentTraits.overlay], 0, 0, size, size)
      ctx.drawImage(loadedImages.auras[currentTraits.aura], 0, 0, size, size)
    }

    drawCurrentCombo()

    // Change 3-4 random traits every second
    const interval = setInterval(() => {
      // Pick 3-4 random layers to change
      const layersToChange = Math.floor(Math.random() * 2) + 3 // 3 or 4
      const layers = ['background', 'core', 'eyes', 'overlay', 'aura']
      
      // Shuffle and pick first N
      const shuffled = layers.sort(() => Math.random() - 0.5).slice(0, layersToChange)
      
      shuffled.forEach((layer) => {
        if (layer === 'background' || layer === 'core' || layer === 'aura') {
          currentTraits[layer as keyof typeof currentTraits] = Math.floor(Math.random() * 10)
        } else if (layer === 'eyes' || layer === 'overlay') {
          currentTraits[layer as keyof typeof currentTraits] = Math.floor(Math.random() * 9)
        }
      })

      drawCurrentCombo()
    }, 1000) // Change every second

    return () => clearInterval(interval)
  }, [loadedImages, size])

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-lg border border-white/10"
      />
      {!loadedImages && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8523D]"></div>
        </div>
      )}
    </div>
  )
}
