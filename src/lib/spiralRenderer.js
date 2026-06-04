// ─── Spiral 2D canvas renderer ────────────────────────────────────────────────
// Reverse-engineered from Spiral-1-1.json (Jitter/Lottie source).
//
// Source: 1350×1350, 60 fps, 1296 frames (21.6 s), 19 user layers + 1 connector.
//
// Transform hierarchy (replicated exactly):
//   canvas center (W/2, H/2)
//   └─ group null [ind=22]: rotate 0→−720° over 1296 fr (linear), scale 30%
//      └─ per image layer: p=[180,180], a=[427,445] in 821×857 precomp
//            rotate by fixed angleOffset (−684°,−648°,…,−36° in source)
//            scale: initScale → 820 (peak) → snap 100 → regrow to initScale
//            opacity: outer 100%, inner dim→100%, then 0 after peak
//
// N-photo scaling keeps the same timing structure (stagger = TOTAL_F / N).

const TOTAL_F    = 1296   // 21.6 s at 60 fps
const GROUP_ROT  = -720   // degrees: total group rotation over TOTAL_F (linear)
const PAR_SCALE  = 0.30   // parent null layer scale (30%)
const CHILD_POS  = 180    // child position x = y in parent space
const REF_W      = 821    // precomp reference width  (px)
const REF_H      = 857    // precomp reference height (px)
const ANCHOR_X   = 427    // child anchor x in precomp (~REF_W/2)
const ANCHOR_Y   = 445    // child anchor y in precomp (~REF_H/2)
const REF_CANVAS = 1350   // source canvas side length (px)
const PEAK_S     = 820    // peak scale % — image fills canvas at this value
const SNAP_S     = 100    // scale % immediately after peak snap
const ANG_STEP   = 36     // angular step between layers (degrees) — 360°/10
const HIDDEN_MUL = 10     // hidden window = HIDDEN_MUL × stagger (~648 frames in source)
const S_OUTER    = 784    // outermost layer initScale (layer 0 in source)
const S_INNER    = 136    // innermost layer initScale (layer 18 in source)

// ─── Build per-layer params from N ───────────────────────────────────────────

function buildLayers(N) {
  const stagger    = TOTAL_F / N
  const hiddenDur  = Math.min(HIDDEN_MUL * stagger, TOTAL_F - stagger)
  const scaleStep  = N > 1 ? (S_OUTER - S_INNER) / (N - 1) : 0
  // Source: 10 outer (100% opacity), 9 inner (90%→10%). Maintain ratio.
  const outerCount = Math.max(1, Math.ceil(N / 2))
  const innerCount = N - outerCount

  return Array.from({ length: N }, (_, i) => {
    const initScale = S_OUTER - i * scaleStep
    const peakFrame = (i + 1) * stagger
    const hiddenEnd = peakFrame + hiddenDur

    // Angular offset: −36° step, outermost layer has the most negative value
    const angleOffset = -(N - i) * ANG_STEP

    // Opacity
    let initOpacity, fadeToFullFrame
    if (i < outerCount) {
      initOpacity     = 100
      fadeToFullFrame = 0
    } else {
      const idx       = i - outerCount + 1          // 1-based inner index
      initOpacity     = Math.max(10, 100 - idx * 90 / Math.max(innerCount, 1))
      // Fades to 100% in sync with corresponding outer layer's peakFrame
      fadeToFullFrame = idx * stagger
    }

    return { i, angleOffset, initScale, peakFrame, hiddenEnd, initOpacity, fadeToFullFrame }
  })
}

// ─── Layer state at frame fMod (0..TOTAL_F) ──────────────────────────────────

function getLayerState(layer, fMod) {
  const { initScale, peakFrame, hiddenEnd, initOpacity, fadeToFullFrame } = layer

  if (fMod < peakFrame) {
    // Phase 1 — GROWING: initScale → PEAK_S (linear)
    const t     = peakFrame > 0 ? fMod / peakFrame : 1
    const scale = initScale + (PEAK_S - initScale) * t

    // Inner layers fade from initOpacity → 100 by fadeToFullFrame
    let opacity = 100
    if (initOpacity < 100 && fadeToFullFrame > 0 && fMod < fadeToFullFrame) {
      opacity = initOpacity + (100 - initOpacity) * (fMod / fadeToFullFrame)
    }
    return { scale, opacity }
  }

  // Phase 2 — POST-PEAK:
  //   Scale: SNAP_S → initScale (linear, runs continuously even while hidden)
  //   Opacity: 0 until hiddenEnd, then 100 (outer layers reappear; inner stay hidden)
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
  const fMod = ((frame % TOTAL_F) + TOTAL_F) % TOTAL_F

  ctx.fillStyle = bgColor || '#000'
  ctx.fillRect(0, 0, W, H)

  // Group rotation: linear −720° over TOTAL_F
  const groupRot = (GROUP_ROT * Math.PI / 180) * (fMod / TOTAL_F)

  // Scale factor: maps source 1350 px canvas to actual render resolution
  const cScale = Math.min(W, H) / REF_CANVAS

  // Draw back-to-front: layer[N-1] (innermost, smallest) first — layer[0] ends up on top
  for (let li = layers.length - 1; li >= 0; li--) {
    const layer = layers[li]
    const { scale, opacity } = getLayerState(layer, fMod)
    if (opacity < 0.5) continue

    const photo = photos.length > 0 ? photos[layer.i % photos.length] : null

    ctx.save()
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity / 100))

    // ── Replicate Lottie transform hierarchy exactly ──────────────────────────
    ctx.translate(W / 2, H / 2)                          // canvas center (parent pos)
    ctx.rotate(groupRot)                                  // group rotation
    ctx.scale(PAR_SCALE * cScale, PAR_SCALE * cScale)    // parent 30% + canvas scale
    ctx.translate(CHILD_POS, CHILD_POS)                  // child position in parent space
    ctx.rotate(layer.angleOffset * Math.PI / 180)        // child content rotation (fixed)
    ctx.scale(scale / 100, scale / 100)                  // child scale (% → ratio)
    ctx.translate(-ANCHOR_X, -ANCHOR_Y)                  // negative anchor

    if (photo) {
      drawCoverFit(ctx, photo, 0, 0, REF_W, REF_H)
    } else {
      // Placeholder tile
      ctx.fillStyle = '#111110'
      ctx.fillRect(0, 0, REF_W, REF_H)
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.font = `bold ${Math.round(REF_W * 0.25)}px "IBM Plex Mono", monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('M', REF_W / 2, REF_H / 2)
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
