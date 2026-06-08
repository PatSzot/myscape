import { useEffect, useRef, useState } from 'react'
import exifr from 'exifr'
import LandscapeCanvas from './components/LandscapeCanvas.jsx'
import ShuffleCanvas from './components/ShuffleCanvas.jsx'
import MainStageCanvas from './components/MainStageCanvas.jsx'
import SpiralCanvas from './components/SpiralCanvas.jsx'
import ScapeCanvas from './components/ScapeCanvas.jsx'
import PhotoBoothCanvas from './components/PhotoBoothCanvas.jsx'
import CubeCanvas from './components/CubeCanvas.jsx'
import LeftPanel from './components/LeftPanel.jsx'
import ShareDock from './components/ShareDock.jsx'
import ExportDock, { FORMATS } from './components/ExportDock.jsx'
import ImageModal from './components/ImageModal.jsx'
import { exportVideo } from './lib/exporter.js'
import { PRESET_IDS, PRESET_DEFAULTS } from './lib/presets.js'
import './styles/layout.css'
import './styles/export.css'

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

// ─── Route flags ──────────────────────────────────────────────────────────────

const _params   = new URLSearchParams(window.location.search)
const SHARE_ID  = _params.get('s')
const VIEW_MODE = _params.has('view') || !!SHARE_ID

// Default images shown when no photos are uploaded
const DEFAULT_IMAGES = ['M', 'Y', 'S', 'C', 'A', 'P', 'E'].map(l => ({ url: `/${l}.jpg`, meta: {} }))

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const photoInputRef      = useRef(null)
  const poolRef            = useRef([])
  const shuffleCanvasRef   = useRef(null)
  const mainStageCanvasRef = useRef(null)
  const spiralCanvasRef    = useRef(null)
  const scapeCanvasRef     = useRef(null)
  const photoBoothCanvasRef = useRef(null)
  const cubeCanvasRef      = useRef(null)
  const canvasAreaRef      = useRef(null)

  // Core state
  const [images, setImages] = useState([])
  const [theme,  setTheme]  = useState('dark')

  // Canvas / preset state
  const [bgColor,        setBgColor]        = useState('#0e0c08')
  const [presetId,       setPresetId]       = useState('landscape')
  const [exportControls, setExportControls] = useState(PRESET_DEFAULTS['landscape'])

  // Export state (non-scape presets)
  const [exportFormat,   setExportFormat]   = useState('square')
  const [fps,            setFps]            = useState(30)
  const [loopS,          setLoopS]          = useState(8.0)
  const [isExporting,    setIsExporting]    = useState(false)
  const [exportPct,      setExportPct]      = useState(0)
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [previewDims,    setPreviewDims]    = useState({ width: 800, height: 800 })

  const isLandscape  = presetId === 'landscape'
  const isCube       = presetId === 'cube'
  const useShareDock = isLandscape || isCube

  // ── Body background ────────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.background = theme === 'dark' ? '#191812' : '#F0EDE4'
  }, [theme])

  // ── Preview canvas dimensions (export presets only) ──────────────────────
  useEffect(() => {
    if (useShareDock) return
    const el = canvasAreaRef.current
    if (!el) return
    function compute() {
      const { width: W, height: H } = el.getBoundingClientRect()
      const PADDING = 32
      const maxW = Math.max(1, W - PADDING * 2)
      const maxH = Math.max(1, H - PADDING * 2)
      const ratio = FORMATS[exportFormat]?.ratio ?? 1
      let pw, ph
      if (maxW / maxH > ratio) { ph = maxH; pw = Math.round(ph * ratio) }
      else                      { pw = maxW; ph = Math.round(pw / ratio) }
      setPreviewDims({ width: pw, height: ph })
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [useShareDock, exportFormat])

  // ── Load shared scape ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!SHARE_ID) return
    fetch(`/api/share?id=${SHARE_ID}`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`API ${r.status}`)))
      .then(({ images: imgs = [], settings = {} }) => {
        if (settings.bgColor) setBgColor(settings.bgColor)
        if (settings.corners != null) setExportControls(prev => ({ ...prev, corners: settings.corners }))
        if (imgs.length > 0) {
          poolRef.current = imgs
          setImages([...imgs])
        }
      })
      .catch(err => console.error('Failed to load shared scape:', err))
  }, [])

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
      if (e.code === 'Space') {
        e.preventDefault()
        if      (presetId === 'spiral')           spiralCanvasRef.current?.togglePause()
        else if (presetId === 'mainStage')        mainStageCanvasRef.current?.togglePause()
        else if (presetId === 'shuffle')          shuffleCanvasRef.current?.togglePause()
        else if (presetId === 'cube')             cubeCanvasRef.current?.togglePause()
        else if (PRESET_IDS.includes(presetId))  scapeCanvasRef.current?.togglePause()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (poolRef.current.length > 0) {
          const last = poolRef.current[poolRef.current.length - 1]
          URL.revokeObjectURL(last.url)
          applyPool(poolRef.current.slice(0, -1))
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presetId])

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

  // ── Share link (Scape) ─────────────────────────────────────────────────────
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
      body: JSON.stringify({
        entries,
        settings: { bgColor, corners: exportControls.corners ?? 0 },
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Upload failed (${res.status})`)
    }
    const { id } = await res.json()
    return `${window.location.origin}/?view&s=${id}`
  }

  // ── Preset switch ──────────────────────────────────────────────────────────
  function handlePresetChange(id) {
    setPresetId(id)
    if (PRESET_DEFAULTS[id]) setExportControls(PRESET_DEFAULTS[id])
  }

  // ── Export video (non-scape) ───────────────────────────────────────────────
  async function handleExport() {
    if (isExporting || images.length === 0) return
    const isShuffle     = presetId === 'shuffle'
    const isMainStage   = presetId === 'mainStage'
    const isSpiral      = presetId === 'spiral'
    const isPhotoBooth  = presetId === 'photoBooth'
    const isCube        = presetId === 'cube'
    const is3DPreset    = PRESET_IDS.includes(presetId)
    const scapeScene         = is3DPreset   ? scapeCanvasRef.current?.getScene()           : null
    const shuffleRenderer    = isShuffle    ? shuffleCanvasRef.current?.getRenderer()      : null
    const mainStageRenderer  = isMainStage  ? mainStageCanvasRef.current?.getRenderer()    : null
    const spiralRenderer     = isSpiral     ? spiralCanvasRef.current?.getRenderer()       : null
    const photoBoothRenderer = isPhotoBooth ? photoBoothCanvasRef.current?.getRenderer()  : null
    const cubeScene          = isCube       ? cubeCanvasRef.current?.getScene()            : null
    if (!scapeScene && !shuffleRenderer && !mainStageRenderer && !spiralRenderer && !photoBoothRenderer && !cubeScene) return
    setIsExporting(true)
    setExportPct(0)
    try {
      await exportVideo({
        scapeScene: scapeScene || cubeScene,
        scene: null,
        shuffleRenderer,
        mainStageRenderer,
        spiralRenderer,
        photoBoothRenderer,
        fps,
        loopS,
        format: FORMATS[exportFormat].export,
        bgColor,
        onProgress: p => setExportPct(p),
      })
    } catch (err) {
      console.error('Export failed:', err)
      alert(err.message || 'Export failed. Try Chrome 94+, Edge 94+, or Firefox 130+.')
    } finally {
      setIsExporting(false)
      setExportPct(0)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const panelBg = theme === 'dark' ? '#191812' : '#F0EDE4'

  // Canvas routing
  const showLandscape  = isLandscape || (VIEW_MODE && !isCube)
  const show3DScape    = !VIEW_MODE && PRESET_IDS.includes(presetId)
  const showShuffle    = !VIEW_MODE && presetId === 'shuffle'
  const showMainStage  = !VIEW_MODE && presetId === 'mainStage'
  const showSpiral     = !VIEW_MODE && presetId === 'spiral'
  const showPhotoBooth = !VIEW_MODE && presetId === 'photoBooth'
  const showCube       = isCube  // visible in both normal and VIEW_MODE

  const displayImages = images.length > 0 ? images : DEFAULT_IMAGES

  return (
    <div
      className={`app-layout${VIEW_MODE ? ' view-mode' : ''}${isExporting ? ' is-exporting' : ''}`}
      data-theme={theme}
      style={{ background: panelBg }}
    >
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

      {!VIEW_MODE && (
        <LeftPanel
          theme={theme}
          images={images}
          onUploadClick={() => photoInputRef.current?.click()}
          presetId={presetId}             onPresetChange={handlePresetChange}
          bgColor={bgColor}               onBgChange={setBgColor}
          exportControls={exportControls} onExportControlsChange={setExportControls}
          exportFormat={exportFormat}     onExportFormatChange={setExportFormat}
          loopS={loopS}                   onLoopChange={setLoopS}
        />
      )}

      <div className="canvas-area" ref={canvasAreaRef}>
        {/* Share presets: full-screen. Export presets: aspect-ratio constrained. */}
        <div
          className={!useShareDock && !VIEW_MODE ? 'export-canvas-wrapper' : undefined}
          style={!useShareDock && !VIEW_MODE
            ? { width: previewDims.width, height: previewDims.height }
            : { position: 'absolute', inset: 0 }
          }
        >
          {showLandscape && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <LandscapeCanvas
                images={images}
                corner={exportControls.corners ?? 0}
                bgColor={bgColor}
              />
            </div>
          )}

          {show3DScape && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <ScapeCanvas
                ref={scapeCanvasRef}
                photos={displayImages}
                bgColor={bgColor}
                presetId={presetId}
                controls={exportControls}
                loopS={loopS}
              />
            </div>
          )}

          {showShuffle && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <ShuffleCanvas
                ref={shuffleCanvasRef}
                images={displayImages}
                cornerFraction={exportControls.corners}
                speed={exportControls.speed}
              />
            </div>
          )}

          {showMainStage && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <MainStageCanvas
                ref={mainStageCanvasRef}
                photos={displayImages}
                bgColor={bgColor}
                speed={exportControls.speed}
              />
            </div>
          )}

          {showSpiral && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <SpiralCanvas
                ref={spiralCanvasRef}
                photos={displayImages}
                bgColor={bgColor}
                speed={exportControls.speed}
              />
            </div>
          )}

          {showPhotoBooth && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <PhotoBoothCanvas
                ref={photoBoothCanvasRef}
                photos={displayImages}
                bgColor={bgColor}
              />
            </div>
          )}

          {showCube && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <CubeCanvas
                ref={cubeCanvasRef}
                photos={displayImages}
                bgColor={bgColor}
                loopS={loopS}
              />
            </div>
          )}
        </div>

        {!VIEW_MODE && images.length === 0 && (
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

      {!VIEW_MODE && useShareDock && (
        <ShareDock onShare={handleCopyLink} />
      )}

      {!VIEW_MODE && !useShareDock && (
        <>
          <div className="kb-overlay" aria-hidden="true">
            <span className="kb-shortcut">
              <kbd>CTRL</kbd><kbd>Z</kbd>
              <span className="kb-label">Undo</span>
            </span>
            <span className="kb-dot" />
            <span className="kb-shortcut">
              <kbd>SPACE</kbd>
              <span className="kb-label">Preview</span>
            </span>
          </div>

          <ExportDock
            images={images}
            format={exportFormat}   onFormatChange={setExportFormat}
            fps={fps}               onFpsChange={setFps}
            isExporting={isExporting}
            exportPct={exportPct}
            onExport={handleExport}
            onImagePreviewOpen={() => setImageModalOpen(true)}
            onUploadClick={() => photoInputRef.current?.click()}
          />

          {imageModalOpen && (
            <ImageModal
              images={images}
              onClose={() => setImageModalOpen(false)}
              onDelete={handleDelete}
              onUploadClick={() => photoInputRef.current?.click()}
            />
          )}
        </>
      )}

    </div>
  )
}
