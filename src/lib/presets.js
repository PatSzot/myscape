// ─── Preset layout functions ──────────────────────────────────────────────────
// Exact math from imagetool.paulsoulhiard.com (decompiled production bundle).
// Each function: layoutXxx(mesh, index, count, animOffset, controls, aspectRatio)
// Sets mesh.position, mesh.scale, and optionally mesh.userData.opacity.
// animOffset: 0→1 looping over loopS seconds.

export const TAU = Math.PI * 2

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))   // ≈ 2.39996

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)) }
function smoothstep(x)  { const t = clamp(x, 0, 1); return t * t * (3 - 2 * t) }
function seededRandom(x){ return ((Math.sin(x * 12.9898) * 43758.5453) % 1 + 1) % 1 }

// ─── SPHERE ──────────────────────────────────────────────────────────────────
// Golden-angle point distribution on a sphere; whole sphere rotates around Y.

const SPHERE_R     = 2.0
const SPHERE_SCALE = 0.7

export function layoutSphere(mesh, index, count, animOffset, controls) {
  const s = Math.max(1, count - 1)
  const r = 1 - 2 * index / s
  const o = Math.sqrt(Math.max(0, 1 - r * r))
  const a = index * GOLDEN_ANGLE + animOffset * TAU
  const l = Math.cos(a) * o
  const c = Math.sin(a) * o
  const u = animOffset * TAU
  const h = Math.cos(u)
  const d = Math.sin(u)
  const f = r * h - c * d
  const g = r * d + c * h
  mesh.position.set(l * SPHERE_R, f * SPHERE_R, g * SPHERE_R)
  mesh.scale.setScalar(SPHERE_SCALE * controls.scale)
  mesh.userData.opacity = undefined
}

// ─── RING ─────────────────────────────────────────────────────────────────────
// Cards evenly spaced in a circle in the XY plane; ring rotates continuously.

const RING_R      = 2.2
const RING_SCALE  = 0.55
const RING_Z_STEP = 0.001   // prevents z-fighting

export function layoutRing(mesh, index, count, animOffset, controls) {
  const angle = (index / Math.max(1, count)) * TAU + animOffset * TAU
  mesh.position.set(
    Math.cos(angle) * RING_R * controls.radius,
    Math.sin(angle) * RING_R * controls.radius,
    -index * RING_Z_STEP,
  )
  mesh.scale.setScalar(RING_SCALE * controls.scale)
  mesh.userData.opacity = undefined
}

// ─── HELIX ────────────────────────────────────────────────────────────────────
// Double helix (DNA shape); cards scroll upward, fade at top/bottom.

const HELIX_STRANDS = 2
const HELIX_H       = 3 * 2.18    // ≈ 6.54 total height
const HELIX_R_BASE  = 1.1
const HELIX_PHASE   = 0.43
const HELIX_SPREAD  = 0.32
const HELIX_TURNS   = 3
const HELIX_SCALE   = 0.58

export function layoutHelix(mesh, index, count, animOffset, controls) {
  const strand    = index % HELIX_STRANDS
  const pos       = Math.floor(index / HELIX_STRANDS)
  const perStrand = Math.max(1, Math.ceil(count / HELIX_STRANDS))
  const a         = (pos / perStrand + animOffset) % 1
  const radius    = HELIX_R_BASE * Math.max(0.001, controls.radius)
  const y         = (a - 0.5) * HELIX_H + (strand - 0.5) * HELIX_SPREAD
  const angle     = a * HELIX_TURNS * TAU + strand * HELIX_PHASE * TAU
  const radMod    = 0.92 + 0.08 * Math.sin(a * TAU * 2 + strand * Math.PI)
  mesh.position.set(
    Math.cos(angle) * radius * radMod,
    y,
    Math.sin(angle) * radius,
  )
  mesh.scale.setScalar(HELIX_SCALE * controls.scale)
  mesh.userData.opacity = smoothstep(a / 0.1) * (1 - smoothstep((a - 0.9) / 0.1))
}

// ─── FLOW ─────────────────────────────────────────────────────────────────────
// Cards fly through a tunnel toward camera; stable random XY per card.

const FLOW_Z_START   = -6
const FLOW_Z_END     = 6
const FLOW_SPREAD    = 3
const FLOW_SCALE_MIN = 0.08
const FLOW_SCALE_MAX = 1.9

export function layoutFlow(mesh, index, count, animOffset, controls, aspectRatio = 1) {
  const seed    = index + 1
  const norm    = (index / Math.max(1, count) + animOffset) % 1
  const zoom    = Math.max(0.001, controls.zoom)
  const spreadY = FLOW_SPREAD * 2.7 / zoom
  const spreadX = FLOW_SPREAD * 2.7 * aspectRatio / zoom
  const h       = clamp(zoom, 0.4, 3)
  const base    = clamp(0.38 / h, 0.08, 0.55)
  const spread  = base + norm * (1 - base)
  const x       = (seededRandom(seed * 1.7) - 0.5) * spreadX * spread
  const y       = (seededRandom(seed * 2.3) - 0.5) * spreadY * spread
  const z       = FLOW_Z_START * h + (FLOW_Z_END - FLOW_Z_START * h) * norm
  const scale   = (FLOW_SCALE_MIN / h + (FLOW_SCALE_MAX - FLOW_SCALE_MIN) * norm) / zoom
  mesh.position.set(x, y, z)
  mesh.rotation.set(0, 0, 0)
  mesh.scale.setScalar(scale * controls.scale)
  mesh.userData.opacity =
    smoothstep(norm / 0.18) *
    (1 - smoothstep((norm - 0.72) / 0.18)) *
    (0.18 + norm * 0.82)
}

// ─── Preset map ───────────────────────────────────────────────────────────────

export const PRESET_LAYOUTS = {
  sphere: layoutSphere,
  ring:   layoutRing,
  helix:  layoutHelix,
  flow:   layoutFlow,
}

export const PRESET_IDS = ['sphere', 'ring', 'helix', 'flow']

export const PRESET_DEFAULTS = {
  sphere: { count: 35, zoom: 1.0, radius: 1.0, scale: 0.8, corners: 0.08, speed: 1.0 },
  ring:   { count: 35, zoom: 1.0, radius: 1.0, scale: 0.8, corners: 0.08, speed: 1.0 },
  helix:  { count: 35, zoom: 1.0, radius: 1.0, scale: 0.8, corners: 0.08, speed: 1.0 },
  flow:   { count: 35, zoom: 1.0, radius: 1.0, scale: 0.8, corners: 0.08, speed: 1.0 },
}
