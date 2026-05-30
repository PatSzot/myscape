// ─── Playback constants ───────────────────────────────────────────────────────
const RATE      = 0.25   // 4× slower, −2 octaves in pitch
const IR_SEC    = 8      // reverb impulse response duration (seconds)
const IR_DECAY  = 4.2    // exponential tail falloff
const DRY       = 0.10   // minimal dry signal
const WET       = 0.95   // reverb dominates
const LPF_HZ    = 1500   // low-pass cutoff for warmth

// ─── Module state ─────────────────────────────────────────────────────────────
let ctx        = null
let src        = null
let buf        = null
let tStart     = 0   // ctx.currentTime when source.start() was called

// ─── Reverb IR (generated algorithmically) ────────────────────────────────────
function makeIR() {
  const rate = ctx.sampleRate
  const len  = Math.ceil(rate * IR_SEC)
  const ir   = ctx.createBuffer(2, len, rate)
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch)
    for (let i = 0; i < len; i++) {
      d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, IR_DECAY)
    }
  }
  return ir
}

// ─── Audio graph ──────────────────────────────────────────────────────────────
function buildGraph() {
  src = ctx.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = RATE
  src.loop = true

  // Warmth filter
  const lpf = ctx.createBiquadFilter()
  lpf.type = 'lowpass'
  lpf.frequency.value = LPF_HZ

  // Reverb
  const conv = ctx.createConvolver()
  conv.buffer = makeIR()

  const dry = ctx.createGain()
  const wet = ctx.createGain()
  dry.gain.value = DRY
  wet.gain.value = WET

  src.connect(lpf)
  lpf.connect(dry)
  lpf.connect(conv)
  conv.connect(wet)
  dry.connect(ctx.destination)
  wet.connect(ctx.destination)
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function loadSong(file) {
  await unload()

  ctx = new AudioContext()
  await ctx.resume()   // unlock iOS

  const ab = await file.arrayBuffer()
  buf = await ctx.decodeAudioData(ab)

  buildGraph()
  tStart = ctx.currentTime
  src.start()

  return {
    name:     file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
    loopSecs: buf.duration / RATE,
  }
}

export async function togglePlay() {
  if (!ctx) return false
  if (ctx.state === 'running') { await ctx.suspend(); return false }
  await ctx.resume()
  return true
}

export function getProgress() {
  if (!ctx || !buf) return { pct: 0, elapsed: 0, total: 0 }
  const total   = buf.duration / RATE
  const elapsed = (ctx.currentTime - tStart) % total
  return { pct: (elapsed / total) * 100, elapsed, total }
}

export function isPlaying() {
  return ctx?.state === 'running'
}

export async function unload() {
  if (src) { try { src.stop() } catch {} src = null }
  if (ctx) { await ctx.close(); ctx = null }
  buf = null; tStart = 0
}
