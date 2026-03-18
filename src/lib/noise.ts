// src/lib/noise.ts

// Value noise implementation for silk texture
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a)
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3
  const u = h < 2 ? x : y
  const v = h < 2 ? y : x
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v)
}

// Build a fixed permutation table
const perm = new Uint8Array(256)
for (let i = 0; i < 256; i++) perm[i] = i
// Deterministic shuffle (seed = 42)
let seed = 42
for (let i = 255; i > 0; i--) {
  seed = (seed * 1664525 + 1013904223) & 0xffffffff
  const j = ((seed >>> 0) % (i + 1))
  const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp
}
const p = new Uint8Array(512)
for (let i = 0; i < 512; i++) p[i] = perm[i & 255]

export function noise2d(x: number, y: number): number {
  const X = Math.floor(x) & 255
  const Y = Math.floor(y) & 255
  x -= Math.floor(x)
  y -= Math.floor(y)
  const u = fade(x)
  const v = fade(y)
  const a = p[X] + Y
  const b = p[X + 1] + Y
  return lerp(
    lerp(grad(p[a], x, y), grad(p[b], x - 1, y), u),
    lerp(grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1), u),
    v
  )
}

export interface SilkColor {
  label: string
  base: [number, number, number]
}

// 8 silk colors matching Eden spec
export const SILK_COLORS: SilkColor[] = [
  { label: 'Forest',   base: [58,  84,  72]  },
  { label: 'Ocean',    base: [45,  85,  130] },
  { label: 'Lavender', base: [100, 75,  150] },
  { label: 'Rose',     base: [180, 80,  110] },
  { label: 'Copper',   base: [130, 85,  60]  },
  { label: 'Rust',     base: [160, 90,  50]  },
  { label: 'Gold',     base: [160, 130, 60]  },
  { label: 'Slate',    base: [90,  95,  105] },
]

// 8 solid colors from Eden spec
export const SOLID_COLORS: string[] = [
  '#CC768D',
  '#D17866',
  '#DCAB6F',
  '#39624D',
  '#5B82B5',
  '#9C7FC1',
  '#AC8472',
  '#383441',
]

// 10 gradient colors from Eden spec
export const GRADIENT_COLORS: string[] = [
  'linear-gradient(135deg, #5B82B5, #9C7FC1)',
  'linear-gradient(135deg, #CC768D, #D17866)',
  'linear-gradient(135deg, #5BC8C8, #39624D)',
  'linear-gradient(135deg, #39624D, #8BC87A)',
  'linear-gradient(135deg, #CC768D, #DCAB6F)',
  'linear-gradient(135deg, #F5F5F0, #FFFFFF)',
  'linear-gradient(135deg, #9C7FC1, #CC768D)',
  'linear-gradient(135deg, #5B82B5, #5BC8C8)',
  'linear-gradient(135deg, #DCAB6F, #FFFFFF)',
  'linear-gradient(135deg, #AAAAAA, #FFFFFF)',
]

/**
 * Draws silk texture onto a canvas using Perlin noise over the base color.
 * Uses a deterministic noise table so texture is consistent across renders.
 */
export function drawSilkBanner(
  canvas: HTMLCanvasElement,
  base: [number, number, number]
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = canvas
  const imageData = ctx.createImageData(width, height)
  const data = imageData.data

  const scaleX = 4 / width
  const scaleY = 4 / height

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = noise2d(x * scaleX, y * scaleY) * 0.5 + 0.5
      const variation = Math.round((n - 0.5) * 30)
      const idx = (y * width + x) * 4
      data[idx]     = Math.max(0, Math.min(255, base[0] + variation))
      data[idx + 1] = Math.max(0, Math.min(255, base[1] + variation))
      data[idx + 2] = Math.max(0, Math.min(255, base[2] + variation))
      data[idx + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/**
 * Get the silk color definition by label, defaulting to Forest.
 */
export function getSilkColor(label: string): SilkColor {
  return SILK_COLORS.find((c) => c.label === label) ?? SILK_COLORS[0]
}
