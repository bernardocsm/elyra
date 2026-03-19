// src/lib/noise.ts

// ─── Perlin noise helpers ─────────────────────────────────────────────────────

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

// Deterministic permutation table (seed = 42)
const perm = new Uint8Array(256)
for (let i = 0; i < 256; i++) perm[i] = i
let _seed = 42
for (let i = 255; i > 0; i--) {
  _seed = (_seed * 1664525 + 1013904223) & 0xffffffff
  const j = ((_seed >>> 0) % (i + 1))
  const tmp = perm[i]; perm[i] = perm[j]; perm[j] = tmp
}
const p = new Uint8Array(512)
for (let i = 0; i < 512; i++) p[i] = perm[i & 255]

/** Single-octave Perlin noise, returns roughly [-1, 1] */
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
    lerp(grad(p[a], x, y),     grad(p[b], x - 1, y),     u),
    lerp(grad(p[a + 1], x, y - 1), grad(p[b + 1], x - 1, y - 1), u),
    v
  )
}

/**
 * Fractional Brownian Motion — 3 octaves, output ~[-1, 1].
 * Richer, fabric-like texture vs single octave.
 */
function fbm2d(x: number, y: number): number {
  const v =
    noise2d(x,     y)     * 0.500 +
    noise2d(x * 2, y * 2) * 0.250 +
    noise2d(x * 4, y * 4) * 0.125
  // Max theoretical = 0.875; normalise to [-1, 1]
  return v / 0.875
}

// ─── Color data ──────────────────────────────────────────────────────────────

export interface SilkColor {
  label: string
  base: [number, number, number]
}

/**
 * 8 Silk swatches matching Eden spec order:
 * Verde escuro | Azul | Roxo | Rosa/fúcsia | Marrom/cobre | Laranja/ferrugem | Dourado | Cinza
 */
export const SILK_COLORS: SilkColor[] = [
  { label: 'Forest',   base: [58,  84,  72]  }, // #3A5448 — active default
  { label: 'Ocean',    base: [45,  85,  130] }, // azul
  { label: 'Lavender', base: [100, 75,  150] }, // roxo
  { label: 'Rose',     base: [180, 80,  110] }, // rosa/fúcsia
  { label: 'Copper',   base: [130, 85,  60]  }, // marrom/cobre
  { label: 'Rust',     base: [160, 90,  50]  }, // laranja/ferrugem
  { label: 'Gold',     base: [160, 130, 60]  }, // dourado
  { label: 'Slate',    base: [90,  95,  105] }, // cinza
]

/** 8 solid colors from Eden spec (order: rosa→salmão→dourado→verde→azul→roxo→marrom→preto) */
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

/** 10 gradients (linear-gradient 135deg) from Eden spec */
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

// ─── Canvas rendering ─────────────────────────────────────────────────────────

/**
 * Draws silk texture onto a canvas using FBM Perlin noise.
 *
 * Per-channel noise with independent phase offsets creates the subtle
 * colour shift observed in Eden's silk banners:
 *   R: ±15 amplitude  (centre pixel measured: base[0]+15 = 73 for Forest)
 *   G: ±22 amplitude  (centre pixel measured: base[1]+22 = 106 for Forest)
 *   B: ±19 amplitude  (centre pixel measured: base[2]+19 = 91 for Forest)
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

  // Scale so one noise "tile" covers the full canvas (~4 periods)
  const sx = 4 / width
  const sy = 4 / height

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Independent FBM per channel with phase offsets
      const nr = fbm2d(x * sx,          y * sy)
      const ng = fbm2d(x * sx + 3.7,    y * sy + 2.1)
      const nb = fbm2d(x * sx + 7.3,    y * sy + 4.8)

      // Per-channel amplitudes matching Eden measurements
      const vr = Math.round(nr * 15)
      const vg = Math.round(ng * 22)
      const vb = Math.round(nb * 19)

      const idx = (y * width + x) * 4
      data[idx]     = Math.max(0, Math.min(255, base[0] + vr))
      data[idx + 1] = Math.max(0, Math.min(255, base[1] + vg))
      data[idx + 2] = Math.max(0, Math.min(255, base[2] + vb))
      data[idx + 3] = 255
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

/** Get a SilkColor by label, defaulting to Forest. */
export function getSilkColor(label: string): SilkColor {
  return SILK_COLORS.find((c) => c.label === label) ?? SILK_COLORS[0]
}
