// ─── MainStage 2D canvas renderer ─────────────────────────────────────────────
// Reverse-engineered from MainStage.json (Jitter/Lottie source).
//
// Structure per 150-frame slot:
//   0..108  TRANSITION — prev slide exits up, curr slide enters from below
//   108..150 HOLD      — curr slide stationary
//
// Mask: alpha-matte rect, no corner radius, anchored at (0,0), right+bottom shrink.
//   FULL    = canvas size  (1080×1920 ref)
//   INHALED = 860×1700 ref (cx=430, cy=850 → left/top edge stays at 0)
//
// Image positioning: Lottie transform with anchor [1000,1500] in 2048×2048 ref.
//   panY=600 → shows lower portion of photo (entry start)
//   panY=960 → shows center                 (hold position)
//   panY=1120→ shows upper portion          (exit end)
//
// Scale/breath:
//   Breath pre-roll: 12 frames before slot start
//   Contract: 0→54 frames, easeQuad
//   Expand:   54→150 frames, easeCubic
//   Entering slide: scale 1.0→0.9→1.0  (light breath)
//   Exiting  slide: scale 1.0→0.6→1.0  (heavy breath)

const STAGGER    = 150  // frames per slot
const TRANS_F    = 108  // transition frames
const B_PREROLL  = 12   // breath starts this many frames before slot
const B_CONTRACT = 54   // frames to reach max contraction
const B_EXPAND   = 96   // frames to recover (54+96=150)

const INHALE_W   = 860 / 1080
const INHALE_H   = 1700 / 1920

const PAN_BOT    = 600   // entry start  (lower portion of photo)
const PAN_CENTER = 960   // hold         (center of photo)
const PAN_TOP    = 1120  // exit end     (upper portion of photo)

const SCALE_ENTRY = 0.9  // light breath peak (entering slide)
const SCALE_EXIT  = 0.6  // heavy breath peak (exiting slide)

// Lottie image transform constants (ref coords: 1080×1920, image ref: 2048×2048)
const ANCHOR_X   = 1000
const ANCHOR_Y   = 1500
const IMG_REF    = 2048

function easeScroll(t)   { return t * t * t }          // ease-in cubic  (slow start, fast landing)
function easeContract(t) { return t * t }              // ease-in quad   (breath contract)
function easeExpand(t)   { return t * t * t }          // ease-in cubic  (breath expand)

function lerp(a, b, t)   { return a + (b - a) * t }
function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)) }

// Returns 0=FULL .. 1=INHALED based on position within a breath cycle
function breathValue(precomp_t) {
  if (precomp_t <= 0) return 0
  if (precomp_t < B_CONTRACT) {
    return easeContract(precomp_t / B_CONTRACT)
  }
  const et = clamp((precomp_t - B_CONTRACT) / B_EXPAND, 0, 1)
  return 1 - easeExpand(et)
}

// Draw one slide: clips to breathing mask rect, then draws image with Lottie transform
function drawSlide(ctx, img, W, H, offsetY, breath, lottieSc, panY_ref) {
  if (!img) return
  ctx.save()
  ctx.translate(0, offsetY)

  // Mask rect (no rounded corners, anchored at top-left)
  const maskW = lerp(W, W * INHALE_W, breath)
  const maskH = lerp(H, H * INHALE_H, breath)
  ctx.beginPath()
  ctx.rect(0, 0, maskW, maskH)
  ctx.clip()

  // Lottie image transform: anchor (1000,1500) in 2048-ref placed at (540, panY) in 1080×1920 ref
  const sx = W / 1080
  const sy = H / 1920
  const drawX = (540 - ANCHOR_X * lottieSc) * sx
  const drawY = (panY_ref - ANCHOR_Y * lottieSc) * sy
  const drawW = IMG_REF * lottieSc * sx
  const drawH = IMG_REF * lottieSc * sy

  // Cover-fit the user photo to the draw rect
  const imgAr = img.naturalWidth / img.naturalHeight
  const boxAr = drawW / drawH
  let isx, isy, isw, ish
  if (imgAr > boxAr) {
    ish = img.naturalHeight; isw = ish * boxAr
    isx = (img.naturalWidth - isw) / 2; isy = 0
  } else {
    isw = img.naturalWidth; ish = isw / boxAr
    isx = 0; isy = (img.naturalHeight - ish) / 2
  }
  ctx.drawImage(img, isx, isy, isw, ish, drawX, drawY, drawW, drawH)

  ctx.restore()
}

function renderAt(canvas, imgEls, clock, bgColor) {
  const ctx = canvas.getContext('2d')
  const W   = canvas.width
  const H   = canvas.height
  const N   = imgEls.length

  ctx.fillStyle = bgColor || '#000000'
  ctx.fillRect(0, 0, W, H)
  if (!N) return

  const slot     = Math.floor(clock)
  const t_frames = (clock - slot) * STAGGER   // 0..150 within slot
  const currIdx  = ((slot % N) + N) % N
  const prevIdx  = ((slot - 1 % N) + N) % N

  if (t_frames < TRANS_F) {
    // ── TRANSITION: prev exits up, curr enters from below ─────────────────────
    const tp     = t_frames / TRANS_F          // 0..1
    const easedP = easeScroll(tp)

    // Both entering and exiting use the same breath precomp_t formula:
    //   precomp_t = B_PREROLL + t_frames  (breath starts 12 frames before slot)
    const b_t = B_PREROLL + t_frames          // 12..120

    // Prev slide (exiting): heavy breath (→60%), pan center→upper
    const prevBreath = breathValue(b_t)
    const prevSc     = lerp(1.0, SCALE_EXIT, prevBreath)
    const prevPanY   = lerp(PAN_CENTER, PAN_TOP, tp)
    drawSlide(ctx, imgEls[prevIdx], W, H, -H * easedP, prevBreath, prevSc, prevPanY)

    // Curr slide (entering): light breath (→90%), pan lower→center
    const currBreath = breathValue(b_t)
    const currSc     = lerp(1.0, SCALE_ENTRY, currBreath)
    const currPanY   = lerp(PAN_BOT, PAN_CENTER, tp)
    drawSlide(ctx, imgEls[currIdx], W, H, H * (1 - easedP), currBreath, currSc, currPanY)

  } else {
    // ── HOLD: only curr visible, breath1 still expanding toward FULL ──────────
    const b_t    = B_PREROLL + t_frames        // 120..162
    const breath = breathValue(b_t)
    const sc     = lerp(1.0, SCALE_ENTRY, breath)
    drawSlide(ctx, imgEls[currIdx], W, H, 0, breath, sc, PAN_CENTER)
  }
}

// ─── Public factory ────────────────────────────────────────────────────────────

export function createMainStageRenderer(canvas, options = {}) {
  let { photos = [], bgColor = '#000000', speed = 1.0 } = options

  let imgEls = []
  let clock  = TRANS_F / STAGGER  // start in hold phase (first photo already on screen)
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
    reset()        { clock = TRANS_F / STAGGER; lastTs = null },

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
