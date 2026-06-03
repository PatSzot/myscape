// ─── Shuffle 2D canvas renderer ───────────────────────────────────────────────
// Two stacks of cycling photo cards; right stack is 0.25 cycles behind left.

const DEPTH_Y_OFFSETS = [0, 0.145, 0.229, 0.362]  // fraction of cardSize, upward from stack center
const DEPTH_SCALES    = [1.0, 0.80, 0.70, 0.50]
const DEPTH_OPACITIES = [1.0, 0.90, 0.70, 0.50]
const QUEUE_SIZE      = 4

const EXIT_START = 0.45  // cycle fraction where front card starts exiting
const EXIT_END   = 0.80  // cycle fraction where front card fully exits
const ADV_START  = 0.45  // cycle fraction where rear cards start advancing

function easeIn(t)         { return t * t }
function easeOut(t)        { return 1 - (1 - t) * (1 - t) }
function lerp(a, b, t)     { return a + (b - a) * t }
function clamp(v, lo, hi)  { return Math.max(lo, Math.min(hi, v)) }

function drawImageCover(ctx, img, x, y, w, h) {
  const imgAr = img.naturalWidth / img.naturalHeight
  const boxAr = w / h
  let sx, sy, sw, sh
  if (imgAr > boxAr) {
    sh = img.naturalHeight; sw = sh * boxAr
    sx = (img.naturalWidth - sw) / 2; sy = 0
  } else {
    sw = img.naturalWidth; sh = sw / boxAr
    sx = 0; sy = (img.naturalHeight - sh) / 2
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function drawStack(ctx, imgs, W, H, cx, stackClock, cornerFraction) {
  if (!imgs.length) return

  const cardSize = Math.min(W, H) * 0.77
  const cy       = H * 0.50
  const cycleN   = Math.floor(stackClock)
  const t        = stackClock - cycleN  // 0..1 within current cycle

  // Draw back→front so front card appears on top
  for (let d = QUEUE_SIZE - 1; d >= 0; d--) {
    const idx = ((cycleN + d) % imgs.length + imgs.length) % imgs.length
    const img = imgs[idx]
    if (!img) continue

    // Rest geometry (start of cycle) — deeper cards stack below the front card
    const restY   = cy + DEPTH_Y_OFFSETS[d] * cardSize
    const restSc  = DEPTH_SCALES[d]
    const restAlp = DEPTH_OPACITIES[d]

    let yCenter = restY
    let scale   = restSc
    let alpha   = restAlp
    let rot     = 0

    if (d === 0 && t > EXIT_START) {
      // Front card exits: fly upward + clockwise rotation + fade
      const et = clamp((t - EXIT_START) / (EXIT_END - EXIT_START), 0, 1)
      const ea = easeIn(et)
      yCenter  = cy - H * 0.96 * ea
      rot      = (10 * Math.PI / 180) * ea
    } else if (d > 0 && t > ADV_START) {
      // Rear cards advance upward toward front
      const at  = clamp((t - ADV_START) / (1 - ADV_START), 0, 1)
      const aa  = easeOut(at)
      const tY  = cy + DEPTH_Y_OFFSETS[d - 1] * cardSize
      const tSc = DEPTH_SCALES[d - 1]
      const tAl = DEPTH_OPACITIES[d - 1]
      yCenter   = lerp(restY, tY, aa)
      scale     = lerp(restSc, tSc, aa)
      alpha     = lerp(restAlp, tAl, aa)
    }

    if (alpha < 0.01) continue

    const w = cardSize * scale
    const h = cardSize * scale
    const r = Math.round(Math.min(w, h) * cornerFraction)

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(cx, yCenter)
    ctx.rotate(rot)
    ctx.beginPath()
    if (r > 0) {
      const x = -w / 2; const y = -h / 2
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r)
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h)
      ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(x, y + r)
      ctx.arcTo(x, y, x + r, y, r)
      ctx.closePath()
    } else {
      ctx.rect(-w / 2, -h / 2, w, h)
    }
    ctx.clip()
    drawImageCover(ctx, img, -w / 2, -h / 2, w, h)
    ctx.restore()
  }
}

function renderAt(target, imgs, clock, cornerFraction, bgColor) {
  const ctx = target.getContext('2d')
  const W   = target.width
  const H   = target.height
  ctx.clearRect(0, 0, W, H)
  if (bgColor) {
    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, W, H)
  }
  drawStack(ctx, imgs, W, H, W * 0.50, clock, cornerFraction)
}

export function createShuffleRenderer(canvas, options = {}) {
  let { images = [], cornerFraction = 0, speed = 1.5 } = options

  let clock  = 0
  let paused = false
  let rafId  = null
  let lastTs = null

  // speed = cycles per second, independent of image count
  function clockRate() { return speed }

  function tick(ts) {
    if (!paused) {
      if (lastTs !== null) clock += ((ts - lastTs) / 1000) * clockRate()
      lastTs = ts
      renderAt(canvas, images, clock, cornerFraction, null)
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
    setImages(imgs)      { images = imgs },
    setCornerFraction(c) { cornerFraction = c },
    setSpeed(s)          { speed = s },
    pause()              { paused = true },
    resume()             { paused = false; lastTs = null },
    togglePause()        { paused ? this.resume() : this.pause() },
    isPaused()           { return paused },
    reset()              { clock = 0; lastTs = null },

    // Frame-perfect step for export (advances clock exactly 1/fps seconds)
    stepFrame(fps, targetCanvas, bgColor) {
      clock += clockRate() / fps
      renderAt(targetCanvas || canvas, images, clock, cornerFraction, bgColor ?? null)
    },

    start:     startLoop,
    stop,
    getCanvas() { return canvas },
  }
}
