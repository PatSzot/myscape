// Shared 2-D canvas drawing utilities for export animations

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.arcTo(x + w, y,     x + w, y + rr,     rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
  ctx.lineTo(x + rr, y + h)
  ctx.arcTo(x, y + h,     x, y + h - rr,     rr)
  ctx.lineTo(x, y + rr)
  ctx.arcTo(x, y,         x + rr, y,          rr)
  ctx.closePath()
}

// Draw a rounded-rect image card centred at (cx, cy).
// A white shadow card is drawn first, then the image is clipped inside.
export function drawCard(ctx, img, cx, cy, w, h, r, opacity, rot, shadowPx) {
  if (w < 2 || h < 2) return
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity))
  ctx.translate(cx, cy)
  if (rot) ctx.rotate(rot)

  // Shadow
  ctx.shadowColor  = 'rgba(0,0,0,0.38)'
  ctx.shadowBlur   = shadowPx * 2.2
  ctx.shadowOffsetY = shadowPx
  ctx.fillStyle    = '#ffffff'
  roundRect(ctx, -w / 2, -h / 2, w, h, r)
  ctx.fill()

  // Reset shadow before clip+image so shadow doesn't bleed onto image
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur  = 0
  ctx.shadowOffsetY = 0

  // Clip + draw image
  ctx.beginPath()
  roundRect(ctx, -w / 2, -h / 2, w, h, r)
  ctx.clip()
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, -w / 2, -h / 2, w, h)
  } else {
    ctx.fillStyle = '#cccccc'
    ctx.fillRect(-w / 2, -h / 2, w, h)
  }
  ctx.restore()
}

// Returns card pixel dimensions for an image fitted into (baseW × baseH)
// while preserving the image's aspect ratio (object-fit: cover style).
export function cardDims(img, baseW, baseH) {
  if (!img || !img.naturalWidth) return { w: baseW, h: baseH }
  const ia = img.naturalWidth / img.naturalHeight
  const ca = baseW / baseH
  return ia > ca
    ? { w: baseW, h: baseW / ia }
    : { w: baseH * ia, h: baseH }
}

// Deterministic pseudo-random float in [0,1] for index i, salt s
export function pseed(i, s) {
  return Math.abs(Math.sin(i * 93.71 + s * 413.13)) % 1
}
