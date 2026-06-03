import { useEffect, useRef, useState } from 'react'
import exifr from 'exifr'
import ScapeCanvas from './components/ScapeCanvas.jsx'
import LandscapeCanvas from './components/LandscapeCanvas.jsx'
import LeftPanel from './components/LeftPanel.jsx'
import RightPanel from './components/RightPanel.jsx'

import { PRESETS } from './lib/presets.js'
import './styles/layout.css'

// ─── EXIF helper ──────────────────────────────────────────────────────────────

async function readMeta(file) {
  try {
    const data = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude'],
    })
    if (!data) return {}

    const dt   = data.DateTimeOriginal || data.CreateDate
    const date = dt instanceof Date
      ? dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : null

    let location = null
    if (data.GPSLatitude != null && data.GPSLongitude != null) {
      const lat    = data.GPSLatitude
      const lon    = data.GPSLongitude
      const latDir = lat >= 0 ? 'N' : 'S'
      const lonDir = lon >= 0 ? 'E' : 'W'
      location = `${Math.abs(lat).toFixed(4)}° ${latDir}  ${Math.abs(lon).toFixed(4)}° ${lonDir}`
    }

    return { date, location }
  } catch {
    return {}
  }
}

// ─── Image compression (for share uploads) ────────────────────────────────────

function compressImageToDataUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const MAX = 1024
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight, 1))
      const w = Math.max(1, Math.round(img.naturalWidth  * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}

// ─── Image rotation ───────────────────────────────────────────────────────────

function rotateImage90(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.naturalHeight
      canvas.height = img.naturalWidth
      const ctx = canvas.getContext('2d')
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(Math.PI / 2)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      canvas.toBlob(blob => resolve(URL.createObjectURL(blob)), 'image/jpeg', 0.92)
    }
    img.src = url
  })
}

// ─── Preview dimensions ───────────────────────────────────────────────────────

function getPreviewDimensions(aspectRatio, containerW, containerH) {
  const padding = 40
  const w = Math.max(1, containerW - padding * 2)
  const h = Math.max(1, containerH - padding * 2)
  const ratios = { '1:1': 1, '9:16': 9 / 16, '16:9': 16 / 9 }
  const ratio  = ratios[aspectRatio] ?? 1
  if (w / h > ratio) {
    return { width: Math.round(h * ratio), height: h }
  }
  return { width: w, height: Math.round(w / ratio) }
}

// ─── Route flags ──────────────────────────────────────────────────────────────

const _params   = new URLSearchParams(window.location.search)
const SHARE_ID  = _params.get('s')
const VIEW_MODE = _params.has('view') || !!SHARE_ID

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const scapeCanvasRef = useRef(null)
  const canvasAreaRef  = useRef(null)
  const photoInputRef  = useRef(null)
  const poolRef        = useRef([])

  const [images,          setImages]          = useState([])
  const [theme,           setTheme]           = useState('dark')
  const [corners,         setCorners]         = useState('sharp')
  const [scapeName,       setScapeName]       = useState('')
  const [presetId,        setPresetId]        = useState('landscape')
  const [controls,        setControls]        = useState(PRESETS['sphere'].defaults)
  const [aspectRatio,     setAspectRatio]     = useState('1:1')
  const [previewDims,     setPreviewDims]     = useState({ width: 400, height: 400 })

  // ── Body background ────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.background = theme === 'dark' ? '#191812' : '#F0EDE4'
  }, [theme])

  // ── Load shared scape ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!SHARE_ID) return
    fetch(`/api/share?id=${SHARE_ID}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`API ${r.status}`)))
      .then(({ images: imgs = [], settings = {} }) => {
        if (settings.theme)   setTheme(settings.theme)
        if (settings.corners) setCorners(settings.corners)
        if (settings.name)    setScapeName(settings.name)
        if (imgs.length > 0) {
          poolRef.current = imgs
          setImages([...imgs])
        }
      })
      .catch(err => console.error('Failed to load shared scape:', err))
  }, [])

  // ── Preview dimensions (recompute on container or aspect ratio change) ─────
  useEffect(() => {
    const el = canvasAreaRef.current
    if (!el) return
    const compute = () =>
      setPreviewDims(getPreviewDimensions(aspectRatio, el.offsetWidth, el.offsetHeight))
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [aspectRatio])

  // ── Photo pool helpers ─────────────────────────────────────────────────────
  function applyPool(next) {
    poolRef.current = next
    setImages([...next])
  }

  async function handleLoad(files) {
    const metas = await Promise.all(files.map(readMeta))
    const fresh = files.map((f, i) => ({ url: URL.createObjectURL(f), meta: metas[i] }))
    applyPool([...poolRef.current, ...fresh])
  }

  function handleDelete(url) {
    URL.revokeObjectURL(url)
    applyPool(poolRef.current.filter(img => img.url !== url))
  }

  async function handleRotate(url) {
    const idx = poolRef.current.findIndex(img => img.url === url)
    if (idx === -1) return
    const rotated = await rotateImage90(url)
    URL.revokeObjectURL(url)
    const next = [...poolRef.current]
    next[idx] = { ...next[idx], url: rotated }
    applyPool(next)
  }

  function handlePresetChange(id) {
    setPresetId(id)
    if (PRESETS[id]) setControls(PRESETS[id].defaults)
  }

  // ── Share link ─────────────────────────────────────────────────────────────
  async function handleCopyLink() {
    const entries = await Promise.all(
      poolRef.current.map(async ({ url, meta }) => ({
        dataUrl: await compressImageToDataUrl(url),
        meta,
      }))
    )
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries, settings: { theme, corners, name: scapeName } }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Upload failed (${res.status})`)
    }
    const { id } = await res.json()
    return `${window.location.origin}/?view&s=${id}`
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const panelBg = theme === 'dark' ? '#191812' : '#F0EDE4'

  return (
    <div className={`app-layout${VIEW_MODE ? ' view-mode' : ''}`}
      data-theme={theme}
      style={{ background: panelBg }}>

      {/* Hidden file input */}
      <input
        ref={photoInputRef} type="file" accept="image/*" multiple
        onChange={e => {
          const files = Array.from(e.target.files ?? [])
            .filter(f => f.type.startsWith('image/'))
            .slice(0, 100)
          if (files.length) handleLoad(files)
          e.target.value = ''
        }}
        style={{ position: 'fixed', top: -200, opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
      />

      {/* Left panel */}
      {!VIEW_MODE && (
        <LeftPanel
          theme={theme}           onThemeChange={setTheme}
          corners={corners}       onCornersChange={setCorners}
          scapeName={scapeName}   onScapeNameChange={setScapeName}
          presetId={presetId}     controls={controls}
          onPresetChange={handlePresetChange}
          onControlsChange={setControls}
          aspectRatio={aspectRatio}
          onAspectChange={(value) => setAspectRatio(value)}
          images={images}
          onUploadClick={() => photoInputRef.current?.click()}
          onDelete={handleDelete}
          onRotate={handleRotate}
          onShare={handleCopyLink}
        />
      )}

      {/* Center canvas */}
      <div ref={canvasAreaRef} className="canvas-area">

        {presetId === 'landscape' ? (
          /* Landscape: original particle scatter fills the canvas area */
          <LandscapeCanvas
            ref={scapeCanvasRef}
            images={images}
            corner={corners === 'rounded' ? 0.04 : 0.0}
          />
        ) : (
          /* Animation presets: constrained aspect-ratio box */
          <div className="scape-canvas-wrapper"
            style={{ width: previewDims.width, height: previewDims.height }}>
            <ScapeCanvas
              ref={scapeCanvasRef}
              photos={images.map(img => img.url)}
              presetId={presetId}
              controls={controls}
              scapeName={scapeName}
              corner={corners === 'rounded' ? 0.04 : 0}
              theme={theme}
            />
          </div>
        )}

        {/* Upload prompt overlay when no photos and landscape selected */}
        {!VIEW_MODE && images.length === 0 && presetId === 'landscape' && (
          <div
            onClick={() => photoInputRef.current?.click()}
            style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', pointerEvents: 'none',
            }}
          >
            <div style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: theme === 'dark' ? 'rgba(240,237,228,0.18)' : 'rgba(26,26,24,0.16)',
              userSelect: 'none',
            }}>
              Upload photos to replace letters
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      {!VIEW_MODE && <RightPanel theme={theme} />}

    </div>
  )
}
