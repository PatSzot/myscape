// Style 2: Infinite Carousel Ring — images orbit a tilted circle in 3-D perspective.
// t ∈ [0, 2π] → one full revolution of the ring → perfect seamless loop.

import { drawCard, cardDims } from '../drawHelpers.js'

const FOCAL       = 500   // perspective focal length
const RING_CENTER = 600   // distance from camera to ring centre (world-px)
const RING_R      = 430   // ring radius (world-px)
const TILT        = 30 * Math.PI / 180  // ring X-tilt toward viewer
const CARD_H      = 270   // card height at scale = 1
const CARD_W      = 190   // card width  at scale = 1
const CORNER_R    = 14
const SHADOW_PX   = 12

export function renderFrame(ctx, images, t, W, H, options = {}) {
  const { bgColor = '#000000' } = options
  const cx = W / 2
  const cy = H / 2

  ctx.fillStyle = bgColor
  ctx.fillRect(0, 0, W, H)
  if (!images.length) return

  const N    = images.length
  const cosT = Math.cos(TILT)
  const sinT = Math.sin(TILT)

  const items = images.map((img, i) => {
    // Angular position on ring — full rotation = one loop
    const theta = (i / N) * Math.PI * 2 + t

    // 3-D position in ring's local frame (ring lies in XZ plane, Y is up)
    const wx       = RING_R * Math.sin(theta)
    const wz_ring  = RING_R * Math.cos(theta)

    // Apply X-axis tilt: rotate (y=0, z=wz_ring) by TILT around X
    //   y' = 0*cosT - wz_ring*sinT  =  -wz_ring * sinT
    //   z' = 0*sinT + wz_ring*cosT  =   wz_ring * cosT
    const wy = -wz_ring * sinT
    const wz =  wz_ring * cosT

    // Perspective projection (camera at z=0, ring centre at RING_CENTER in +z)
    const totalZ = RING_CENTER + wz
    if (totalZ < 10) return null   // behind camera — skip

    const scale = FOCAL / totalZ
    const sx    = cx + wx * scale
    const sy    = cy + wy * scale

    // Slight card lean matching ring curvature
    const rot = Math.sin(theta) * 0.07

    const opacity = Math.min(1, Math.max(0.12, scale * (FOCAL / (RING_CENTER - RING_R * cosT))))
    const { w, h } = cardDims(img, CARD_W * scale, CARD_H * scale)

    return { sx, sy, scale, rot, opacity, img, w, h, depth: wz }
  }).filter(Boolean)

  // Painter's sort: back → front  (larger wz = farther from camera)
  items.sort((a, b) => b.depth - a.depth)

  for (const item of items) {
    drawCard(ctx, item.img, item.sx, item.sy, item.w, item.h,
      CORNER_R * item.scale, item.opacity, item.rot, SHADOW_PX * item.scale)
  }
}
