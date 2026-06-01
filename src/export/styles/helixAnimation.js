// Style 3: DNA Double Helix — two columns of images wind along opposing sine waves
// while scrolling continuously. t ∈ [0, 2π] → images scroll by exactly one full
// content-height → seamless loop.

import { drawCard, cardDims } from '../drawHelpers.js'

const FOCAL      = 700   // perspective focal length
const AMPLITUDE  = 230   // x oscillation amplitude (px at scale=1)
const Z_AMP      = 320   // z-depth amplitude
const CARD_H     = 290   // card height at scale = 1
const CARD_W     = 200   // card width  at scale = 1
const CORNER_R   = 14
const SHADOW_PX  = 11

export function renderFrame(ctx, images, t, W, H, options = {}) {
  const { bgColor = '#000000' } = options
  const cx = W / 2

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)
  if (!images.length) return

  const N  = images.length
  // Split into two strands (A = even indices, B = odd)
  const nA = Math.ceil(N / 2)
  const nB = N - nA

  // Content height = spread across canvas with a small buffer above/below
  const CONTENT_H = H * 1.1
  const spacingA  = nA > 1 ? CONTENT_H / nA : CONTENT_H
  const spacingB  = nB > 1 ? CONTENT_H / nB : CONTENT_H

  // How much to scroll per loop: one full content height
  const scrollA = (t / (Math.PI * 2)) * CONTENT_H
  const scrollB = scrollA

  // Collect all items for depth-sorting
  const items = []

  // ── Strand A ──────────────────────────────────────────────────────────────
  for (let j = 0; j < nA; j++) {
    const imgIdx = j * 2
    const img    = images[imgIdx]

    // Phase drives both x position and z depth — creates the helical winding
    const phase = t + (j / nA) * Math.PI * 2

    const x = cx - AMPLITUDE * Math.cos(phase)  // oscillates left/right
    const z = Z_AMP * Math.cos(phase)            // depth matches x phase

    // y scrolls downward, wrapping within content height
    const rawY = j * spacingA + scrollA
    const y    = ((rawY % CONTENT_H) + CONTENT_H) % CONTENT_H - spacingA * 0.5

    // Perspective
    const denom  = Math.max(FOCAL - z, 80)
    const scale  = FOCAL / denom
    const screenX = x  // x is already in screen space (no perspective x-shift needed for helix)
    const screenY = y

    const opacity = Math.min(1, Math.max(0.15, scale * 0.88))
    const { w, h } = cardDims(img, CARD_W * scale, CARD_H * scale)

    items.push({ sx: screenX, sy: screenY, scale, rot: 0, opacity, img, w, h, depth: z })
  }

  // ── Strand B ──────────────────────────────────────────────────────────────
  for (let j = 0; j < nB; j++) {
    const imgIdx = j * 2 + 1
    const img    = images[imgIdx]

    // B strand is π out of phase from A → always on opposite side
    const phase = t + (j / nB) * Math.PI * 2 + Math.PI

    const x = cx - AMPLITUDE * Math.cos(phase)
    const z = Z_AMP * Math.cos(phase)

    const rawY = j * spacingB + scrollB
    const y    = ((rawY % CONTENT_H) + CONTENT_H) % CONTENT_H - spacingB * 0.5

    const denom  = Math.max(FOCAL - z, 80)
    const scale  = FOCAL / denom
    const opacity = Math.min(1, Math.max(0.15, scale * 0.88))
    const { w, h } = cardDims(img, CARD_W * scale, CARD_H * scale)

    items.push({ sx: x, sy: y, scale, rot: 0, opacity, img, w, h, depth: z })
  }

  // Painter's sort: lowest z (farthest) first
  items.sort((a, b) => a.depth - b.depth)

  for (const item of items) {
    // Only draw items within visible canvas bounds (+ card half-height buffer)
    const halfH = item.h / 2
    if (item.sy < -halfH - 20 || item.sy > H + halfH + 20) continue
    drawCard(ctx, item.img, item.sx, item.sy, item.w, item.h,
      CORNER_R * item.scale, item.opacity, item.rot, SHADOW_PX * item.scale)
  }
}
