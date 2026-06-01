import { renderFrame as renderPile }     from './styles/pileAnimation.js'
import { renderFrame as renderCarousel } from './styles/carouselAnimation.js'
import { renderFrame as renderHelix }    from './styles/helixAnimation.js'

const W = 1080
const H = 1920
const FPS = 30
const MIN_IMAGES = 7  // duplicate if fewer, so animations look full

const RENDERERS = { pile: renderPile, carousel: renderCarousel, helix: renderHelix }

// Load a single image from a URL into an HTMLImageElement
function loadImg(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload  = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// Best supported mime type for this browser
function pickMime() {
  const candidates = [
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ]
  return candidates.find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm'
}

/**
 * startExport({ images, style, durationSec, bgColor, corner, onProgress })
 *   images      — array of { url, meta }
 *   style       — 'pile' | 'carousel' | 'helix'
 *   durationSec — loop length in seconds (5–60)
 *   bgColor     — CSS colour string for background (e.g. '#191812')
 *   onProgress  — (0–1) callback, called each frame
 * Returns Promise<{ blob, ext }>
 */
export async function startExport({ images, style, durationSec, bgColor = '#000000', onProgress }) {
  if (!window.MediaRecorder) throw new Error('NO_MEDIARECORDER')

  const renderFn = RENDERERS[style]
  if (!renderFn) throw new Error(`Unknown style: ${style}`)

  // Load all images as HTMLImageElements
  let loaded = (await Promise.all(images.map(({ url }) => loadImg(url)))).filter(Boolean)
  if (!loaded.length) throw new Error('No images could be loaded.')

  // Pad to MIN_IMAGES so animations look populated
  while (loaded.length < MIN_IMAGES) loaded = [...loaded, ...loaded]

  // Create recording canvas
  const canvas = document.createElement('canvas')
  canvas.width  = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const mimeType = pickMime()
  const stream   = canvas.captureStream(FPS)
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
  const chunks   = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  const loopMs = durationSec * 1000
  const opts   = { bgColor }

  return new Promise((resolve, reject) => {
    recorder.onstop = () => {
      const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
      resolve({ blob: new Blob(chunks, { type: mimeType }), ext })
    }
    recorder.onerror = e => reject(e)

    recorder.start(200)
    const t0 = performance.now()

    function tick() {
      const elapsed = performance.now() - t0
      if (elapsed >= loopMs) {
        // Render final frame at exactly t=0 to close the loop cleanly
        renderFn(ctx, loaded, 0, W, H, opts)
        recorder.stop()
        if (onProgress) onProgress(1)
        return
      }
      const t = (elapsed / loopMs) * Math.PI * 2
      renderFn(ctx, loaded, t, W, H, opts)
      if (onProgress) onProgress(elapsed / loopMs)
      requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  })
}
