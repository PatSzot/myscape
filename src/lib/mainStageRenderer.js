// ─── MainStage 2D canvas renderer ─────────────────────────────────────────────
// Full-bleed portrait slideshow: slides scroll upward with mask breathing
// and Ken-Burns pan/zoom during the hold phase.
//
// Animation anatomy (per photo cycle, t = 0..1):
//   0 .. HOLD_FRAC   → Hold:       mask breathes FULL↔INHALED, Ken-Burns drift
//   HOLD_FRAC .. 1.0 → Transition: current exits up, next enters from below

const HOLD_FRAC  = 0.28
const TRANS_FRAC = 0.72  // = 1 - HOLD_FRAC

// Mask size ratios relative to canvas (anchored at top-left)
// Derived from Jitter source: FULL 1080×1920, INHALED 860×1700 (cx=430, cy=850)
const M_INHL_W  = 860 / 1080   // ~0.796
const M_INHL_H  = 1700 / 1920  // ~0.885
const M_CORNER  = 28 / 1080    // corner-radius ratio, applied only when inhaled

// Ken-Burns parameters (applied during hold phase)
const KB_ZOOM_START = 1.06  // slight zoom-in at start of hold
const KB_ZOOM_END   = 1.00  // eases back to cover-fit by end of hold
const KB_PAN_START  = 0.30  // fractional vertical center (0=top, 1=bottom)
const KB_PAN_END    = 0.52

function easeIn(t)     { return t * t * t }
function easeMask(t)   { return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2 }
function lerp(a, b, t) { return a + (b - a) * t }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

// Compute source crop for cover-fit with zoom + vertical pan
function coverCrop(img, dw, dh, zoom, panFrac) {
  const imgAr = img.naturalWidth / img.naturalHeight
  const boxAr = dw / dh
  let bw, bh
  if (imgAr > boxAr) { bh = img.naturalHeight; bw = bh * boxAr }
  else               { bw = img.naturalWidth;  bh = bw / boxAr }
  const sw   = bw / zoom
  const sh   = bh / zoom
  const sx   = (img.naturalWidth  - sw) / 2
  const maxY = img.naturalHeight - sh
  const sy   = clamp(maxY * panFrac, 0, maxY)
  return { sx, sy, sw, sh }
}

// Draw one slide (photo) with a clipping mask and Ken-Burns crop
function drawSlide(ctx, img, offsetY, maskW, maskH, maskR, zoom, panFrac) {
  if (!img) return
  ctx.save()
  ctx.translate(0, offsetY)

  const x = 0, y = 0, w = maskW, h = maskH
  const r = maskR

  ctx.beginPath()
  if (r > 0) {
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r); ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r); ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r); ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r); ctx.closePath()
  } else {
    ctx.rect(x, y, w, h)
  }
  ctx.clip()

  const { sx, sy, sw, sh } = coverCrop(img, w, h, zoom, panFrac)
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)

  ctx.restore()
}

function renderAt(target, imgEls, clock, bgColor) {
  const ctx = target.getContext('2d')
  const W = target.width
  const H = target.height
  const N = imgEls.length

  ctx.fillStyle = bgColor || '#000000'
  ctx.fillRect(0, 0, W, H)
  if (!N) return

  const idx   = Math.floor(clock) % N
  const photoT = clock - Math.floor(clock)  // 0..1 within this photo's cycle

  if (photoT < HOLD_FRAC) {
    // ── Hold phase ──────────────────────────────────────────────────────────
    const holdT = photoT / HOLD_FRAC  // 0..1

    // Mask breath: 0→1→0 triangle mapped through easeMask
    const breathPhase = holdT < 0.5 ? holdT * 2 : (1 - holdT) * 2
    const breathT = easeMask(breathPhase)

    const maskW = lerp(W, W * M_INHL_W, breathT)
    const maskH = lerp(H, H * M_INHL_H, breathT)
    const maskR = Math.round(Math.min(maskW, maskH) * M_CORNER * breathT)

    const zoom    = lerp(KB_ZOOM_START, KB_ZOOM_END, holdT)
    const panFrac = lerp(KB_PAN_START,  KB_PAN_END,  holdT)

    drawSlide(ctx, imgEls[idx], 0, maskW, maskH, maskR, zoom, panFrac)

  } else {
    // ── Transition phase ─────────────────────────────────────────────────────
    const transT  = (photoT - HOLD_FRAC) / TRANS_FRAC  // 0..1
    const tEased  = easeIn(transT)
    const nextIdx = (idx + 1) % N

    // Current slide exits upward
    const currOffY = -H * tEased
    // Next slide enters from below
    const nextOffY = H * (1 - tEased)

    drawSlide(ctx, imgEls[idx],     currOffY, W, H, 0, KB_ZOOM_END,   KB_PAN_END)
    drawSlide(ctx, imgEls[nextIdx], nextOffY, W, H, 0, KB_ZOOM_START, KB_PAN_START)
  }
}

// ─── Public factory ────────────────────────────────────────────────────────────

export function createMainStageRenderer(canvas, options = {}) {
  let { photos = [], bgColor = '#000000', speed = 1.0 } = options

  let imgEls = []
  let clock  = 0
  let paused = false
  let rafId  = null
  let lastTs = null

  function clockRate() { return speed }

  function tick(ts) {
    if (!paused) {
      if (lastTs !== null) clock += ((ts - lastTs) / 1000) * clockRate()
      lastTs = ts
      renderAt(canvas, imgEls, clock, bgColor)
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
    setPhotos(els) { imgEls = els },
    setBgColor(c)  { bgColor = c },
    setSpeed(s)    { speed = s },

    pause()        { paused = true },
    resume()       { paused = false; lastTs = null },
    togglePause()  { paused ? this.resume() : this.pause() },
    isPaused()     { return paused },
    reset()        { clock = 0; lastTs = null },

    // Frame-perfect step for export
    stepFrame(fps, targetCanvas, bg) {
      clock += clockRate() / fps
      renderAt(targetCanvas || canvas, imgEls, clock, bg ?? bgColor)
    },

    start:     startLoop,
    stop,
    getCanvas() { return canvas },
  }
}
