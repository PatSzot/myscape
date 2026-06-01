// Style 1: Dynamic Pile — images float in a 3-D cloud, camera slowly orbits.
// t ∈ [0, 2π] → one full loop. All positions are sin/cos-driven so t=2π
// returns exactly to the t=0 state (seamless loop).

import { drawCard, cardDims, pseed } from '../drawHelpers.js'

const FOCAL      = 900   // perspective focal length (pixels)
const CARD_H     = 400   // card height at scale = 1
const CARD_W     = 280   // card width  at scale = 1  (portrait)
const CORNER_R   = 18    // corner radius at scale = 1
const SHADOW_PX  = 14    // shadow size   at scale = 1
const BASE_R     = 240   // cloud radius (world-px at z=0)
const DRIFT      = 60    // oscillation amplitude (world-px)

export function renderFrame(ctx, images, t, W, H, options = {}) {
  const { bgColor = '#000000' } = options
  const cx = W / 2
  const cy = H / 2

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)
  if (!images.length) return

  const N = images.length

  // Camera rotates half a turn per loop (always changing angle → never stale)
  const camAngle = t * 0.5
  const cosC = Math.cos(camAngle)
  const sinC = Math.sin(camAngle)

  const particles = images.map((img, i) => {
    const phase = (i / N) * Math.PI * 2
    const s1 = pseed(i, 1)
    const s2 = pseed(i, 2)
    const s3 = pseed(i, 3)
    const s4 = pseed(i, 4)

    // Base position on a flattened sphere
    const r   = BASE_R * (0.6 + s1 * 0.8)
    const ang = (i / N) * Math.PI * 2 + s2 * 0.7
    const bx  = r * Math.cos(ang)
    const by  = (s3 - 0.5) * 380
    const bz  = r * Math.sin(ang) * 0.5   // flatter in Z

    // Slow oscillation around base (different freq/phase per axis)
    const wx = bx + Math.sin(t * 0.7 + phase)       * DRIFT
    const wy = by + Math.cos(t * 0.5 + phase * 1.3) * DRIFT * 0.8
    const wz = bz + Math.sin(t * 0.6 + phase * 0.9) * DRIFT * 0.7

    // Rotate world point around Y by camera angle
    const rx = wx * cosC - wz * sinC
    const rz = wx * sinC + wz * cosC
    const ry = wy

    // Perspective projection
    const denom = Math.max(FOCAL - rz, 80)
    const scale = FOCAL / denom
    const sx    = cx + rx * scale
    const sy    = cy + ry * scale

    // Slow card self-rotation
    const rot = Math.sin(t * 0.3 + phase * 1.7) * 0.12 + (s4 - 0.5) * 0.28

    const opacity = Math.min(1, Math.max(0.18, scale * 0.88))
    const { w, h } = cardDims(img, CARD_W * scale, CARD_H * scale)

    return { sx, sy, scale, rot, opacity, img, w, h, depth: rz }
  })

  // Painter's sort: back → front
  particles.sort((a, b) => a.depth - b.depth)

  for (const p of particles) {
    drawCard(ctx, p.img, p.sx, p.sy, p.w, p.h,
      CORNER_R * p.scale, p.opacity, p.rot, SHADOW_PX * p.scale)
  }
}
