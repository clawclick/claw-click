'use client'

import { useEffect, useRef, useState } from 'react'

interface NFTidCompositorProps {
  traits: {
    background: number
    core: number
    eyes: number
    overlay: number
    aura: number
  }
  size?: number
  className?: string
}

// Asset mappings (index to filename)
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

export default function NFTidCompositor({ traits, size = 400, className }: NFTidCompositorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    setIsLoading(true)
    setError(null)

    // Validate traits
    if (
      typeof traits.background !== 'number' ||
      typeof traits.core !== 'number' ||
      typeof traits.eyes !== 'number' ||
      typeof traits.overlay !== 'number' ||
      typeof traits.aura !== 'number' ||
      isNaN(traits.background) ||
      isNaN(traits.core) ||
      isNaN(traits.eyes) ||
      isNaN(traits.overlay) ||
      isNaN(traits.aura)
    ) {
      console.error('Invalid traits:', traits)
      setError('Invalid trait data')
      setIsLoading(false)
      return
    }

    // Layer order: Background → Core → Eyes → Overlay → Aura
    const layers = [
      TRAIT_FILES.backgrounds[traits.background],
      TRAIT_FILES.cores[traits.core],
      TRAIT_FILES.eyes[traits.eyes],
      TRAIT_FILES.overlays[traits.overlay],
      TRAIT_FILES.auras[traits.aura],
    ]

    console.log('Loading NFTid layers:', { traits, layers })

    // Load all images
    Promise.all(
      layers.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.onload = () => resolve(img)
            img.onerror = () => reject(new Error(`Failed to load: ${src}`))
            img.src = src
          })
      )
    )
      .then((images) => {
        // Clear canvas
        ctx.clearRect(0, 0, size, size)

        // Draw each layer
        images.forEach((img) => {
          ctx.drawImage(img, 0, 0, size, size)
        })

        setIsLoading(false)
      })
      .catch((err) => {
        console.error('Failed to composite NFTid:', err)
        setError('Failed to load image layers')
        setIsLoading(false)
      })
  }, [traits, size])

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size, maxWidth: '100%', maxHeight: '100%' }}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className={`rounded-lg ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 w-full h-full object-contain`}
      />
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E8523D]"></div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
