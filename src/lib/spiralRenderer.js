// ─── Spiral 2D canvas renderer ────────────────────────────────────────────────
// Renders N photos in a radial spiral layout:
//   - Outer layers (high initScale) → outer ring, large tile, peaks later
//   - Inner layers (low initScale)  → inner ring, small tile, peaks earlier
//   - Group rotates −720° over TOTAL_F (21.6 s at 60 fps)
//   - Each photo zooms from its orbital tile size → fills canvas at peak
//
// Source: Spiral-1-1.json (Jitter) — 1350×1350, 60 fps, 1296 frames, 19 layers.

const TOTAL_F    = 1296   // 21.6 s at 60 fps
const GROUP_ROT  = -720   // total group rotation over TOTAL_F (degrees)
const PEAK_S     = 820    // peak scale (image fills canvas at this value)
const SNAP_S     = 100    // scale immediately after peak snap
const ANG_STEP   = 36     // angular step between layers (°) — 360°/10
const HIDDEN_MUL = 10     // hidden window = HIDDEN_MUL × stagger
const S_OUTER    = 784    // initScale for outermost layer
const S_INNER    = 136    // initScale for innermost layer

// Radial layout constants (fractions of min(W,H))
const ORBIT_R_OUTER = 0.37  // outer ring radius
const ORBIT_R_INNER = 0.06  // inner ring radius
const TILE_OUTER    = 0.20  // outer tile size
const TILE_INNER    = 0.05  // inner tile size
const SNAP_TILE     = 0.03  // tile size at the post-peak snap moment

// ─── Build per-layer params from N ───────────────────────────────────────────

function buildLayers(N) {
  const stagger    = TOTAL_F / N
  const hiddenDur  = Math.min(HIDDEN_MUL * stagger, TOTAL_F - stagger)
  const scaleStep  = N > 1 ? (S_OUTER - S_INNER) / (N - 1) : 0
  const outerCount = Math.max(1, Math.ceil(N / 2))
  const innerCount = N - outerCount

  return Array.from({ length: N }, (_, i) => {
    const initScale = S_OUTER - i * scaleStep
    const peakFrame = (i + 1) * stagger
    const hiddenEnd = peakFrame + hiddenDur

    // Angular offset: −ANG_STEP per layer, outermost most negative
    const angleOffset = -(N - i) * ANG_STEP

    let initOpacity, fadeToFullFrame
    if (i < outerCount) {
      initOpacity     = 100
      fadeToFullFrame = 0
    } else {
      const idx       = i - outerCount + 1
      initOpacity     = Math.max(10, 100 - idx * 90 / Math.max(innerCount, 1))
      fadeToFullFrame = idx * stagger
    }

    return { i, angleOffset, initScale, peakFrame, hiddenEnd, initOpacity, fadeToFullFrame }
  })
}

// ─── Layer state at frame fMod (0..TOTAL_F) ──────────────────────────────────

function getLayerState(layer, fMod) {
  const { initScale, peakFrame, hiddenEnd, initOpacity, fadeToFullFrame } = layer

  if (fMod < peakFrame) {
    // Phase 1 — growing: initScale → PEAK_S
    const t     = peakFrame > 0 ? fMod / peakFrame : 1
    const scale = initScale + (PEAK_S - initScale) * t

    let opacity = 100
    if (initOpacity < 100 && fadeToFullFrame > 0 && fMod < fadeToFullFrame) {
      opacity = initOpacity + (100 - initOpacity) * (fMod / fadeToFullFrame)
    }
    return { scale, opacity }
  }

  // Phase 2 — post-peak: SNAP_S → initScale (regrow), hidden until hiddenEnd
  const regrowLen = TOTAL_F - peakFrame
  const tR        = regrowLen > 0 ? (fMod - peakFrame) / regrowLen : 1
  const scale     = SNAP_S + (initScale - SNAP_S) * tR
  const isHidden  = fMod < Math.min(hiddenEnd, TOTAL_F)
  return { scale, opacity: isHidden ? 0 : 100 }
}

// ─── Cover-fit a photo into [x, y, w, h] ─────────────────────────────────────

function drawCoverFit(ctx, photo, x, y, w, h) {
  const iw  = photo.naturalWidth
  const ih  = photo.naturalHeight
  const iAr = iw / ih
  const bAr = w / h
  let sx, sy, sw, sh
  if (iAr > bAr) { sh = ih; sw = ih * bAr; sx = (iw - sw) / 2; sy = 0 }
  else            { sw = iw; sh = iw / bAr; sx = 0; sy = (ih - sh) / 2 }
  ctx.drawImage(photo, sx, sy, sw, sh, x, y, w, h)
}

// ─── Render one frame to a canvas ────────────────────────────────────────────

function renderTo(target, photos, frame, bgColor, layers) {
  const ctx  = target.getContext('2d')
  const W    = target.width
  const H    = target.height
  const N    = layers.length
  const fMod = ((frame % TOTAL_F) + TOTAL_F) % TOTAL_F

  ctx.fillStyle = bgColor || '#000'
  ctx.fillRect(0, 0, W, H)

  // Group rotates −720° over TOTAL_F
  const groupRot = (GROUP_ROT * Math.PI / 180) * (fMod / TOTAL_F)

  const S = Math.min(W, H)  // reference size

  // Draw back-to-front: innermost (small) first, outermost on top
  for (let li = N - 1; li >= 0; li--) {
    const layer  = layers[li]
    const { scale, opacity } = getLayerState(layer, fMod)
    if (opacity < 0.5) continue

    const photo = photos.length > 0 ? photos[layer.i % photos.length] : null

    // radFrac: 0 = innermost (layer.i = N-1), 1 = outermost (layer.i = 0)
    const radFrac = N > 1 ? 1 - layer.i / (N - 1) : 0.5

    // Orbital radius and base tile size for this layer
    const orbitR   = S * (ORBIT_R_INNER + radFrac * (ORBIT_R_OUTER - ORBIT_R_INNER))
    const tileSize = S * (TILE_INNER    + radFrac * (TILE_OUTER    - TILE_INNER))

    // Angular position = fixed layer angle + group rotation
    const theta = layer.angleOffset * Math.PI / 180 + groupRot

    // Orbital center in canvas space
    const cx = W / 2 + orbitR * Math.cos(theta)
    const cy = H / 2 + orbitR * Math.sin(theta)

    // Derive draw size, position, and tilt from scale animation
    let drawSize, drawX, drawY, tilt

    if (scale >= layer.initScale) {
      // Growing toward peak: tile zooms to full canvas, drifts to canvas center
      const t   = Math.min(1, (scale - layer.initScale) / Math.max(PEAK_S - layer.initScale, 1))
      drawSize  = tileSize + t * (S - tileSize)
      drawX     = cx + t * (W / 2 - cx)
      drawY     = cy + t * (H / 2 - cy)
      tilt      = (1 - t) * layer.angleOffset * Math.PI / 180  // un-tilts as it fills canvas
    } else {
      // Regrow: post-snap tiny tile grows back to orbital size
      const snapSize = S * SNAP_TILE
      const t   = Math.min(1, Math.max(0, (scale - SNAP_S) / Math.max(layer.initScale - SNAP_S, 1)))
      drawSize  = snapSize + t * (tileSize - snapSize)
      drawX     = cx
      drawY     = cy
      tilt      = layer.angleOffset * Math.PI / 180
    }

    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity / 100))
    ctx.translate(drawX, drawY)
    ctx.rotate(tilt)

    if (photo) {
      drawCoverFit(ctx, photo, -drawSize / 2, -drawSize / 2, drawSize, drawSize)
    } else {
      // Placeholder tile
      ctx.fillStyle = '#111110'
      ctx.fillRect(-drawSize / 2, -drawSize / 2, drawSize, drawSize)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.font = `bold ${Math.round(drawSize * 0.35)}px "IBM Plex Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('M', 0, 0)
    }

    ctx.restore()
  }
}

// ─── Public factory ───────────────────────────────────────────────────────────

export function createSpiralRenderer(canvas, options = {}) {
  let bgColor = options.bgColor ?? '#0d0d0d'
  let speed   = options.speed   ?? 1.0
  let photos  = options.photos  ?? []

  let frame  = 0
  let paused = false
  let rafId  = null
  let lastTs = null

  // Layer cache — rebuilt only when photo count changes
  let cachedN      = -1
  let cachedLayers = []

  function getLayers() {
    const N = photos.length > 0 ? photos.length : 6
    if (N !== cachedN) { cachedLayers = buildLayers(N); cachedN = N }
    return cachedLayers
  }

  function render(target, bg) {
    renderTo(target || canvas, photos, frame, bg ?? bgColor, getLayers())
  }

  function tick(ts) {
    if (!paused) {
      if (lastTs !== null) frame = (frame + (ts - lastTs) / 1000 * 60 * speed) % TOTAL_F
      lastTs = ts
      render(canvas, bgColor)
    }
    rafId = requestAnimationFrame(tick)
  }

  function startLoop() {
    if (rafId !== null) return
    lastTs = null
    rafId  = requestAnimationFrame(tick)
  }

  function stop() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
  }

  startLoop()

  return {
    setPhotos(p)  { photos = p || []; cachedN = -1 },
    setBgColor(c) { bgColor = c },
    setSpeed(s)   { speed = s },

    pause()       { paused = true },
    resume()      { paused = false; lastTs = null },
    togglePause() { paused ? this.resume() : this.pause() },
    isPaused()    { return paused },
    reset()       { frame = 0; lastTs = null },

    // Frame-perfect step for export
    stepFrame(fps, targetCanvas, bg) {
      frame = (frame + 60 * speed / fps) % TOTAL_F
      render(targetCanvas || canvas, bg ?? bgColor)
    },

    start:     startLoop,
    stop,
    getCanvas() { return canvas },
  }
}
