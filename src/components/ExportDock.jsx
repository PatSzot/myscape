import { useState, useRef, useEffect } from 'react'
import 'remixicon/fonts/remixicon.css'
import '../styles/export.css'

// ─── Format definitions ────────────────────────────────────────────────────────
export const FORMATS = {
  landscape: { name: 'Landscape', label: '16:9', ratio: 16/9, export: { w: 1920, h: 1080 } },
  square:    { name: 'Square',    label: '1:1',  ratio: 1,    export: { w: 1080, h: 1080 } },
  portrait:  { name: 'Portrait',  label: '9:16', ratio: 9/16, export: { w: 1080, h: 1920 } },
}

// ─── Image Preview ─────────────────────────────────────────────────────────────
function ImagePreview({ images, onOpen }) {
  // Pick up to 3 images: first, middle, last
  const stack = (() => {
    if (images.length === 0) return []
    if (images.length === 1) return [images[0]]
    if (images.length === 2) return [images[0], images[1]]
    const mid = Math.floor((images.length - 1) / 2)
    return [images[0], images[mid], images[images.length - 1]]
  })()

  const stackLen = Math.max(1, stack.length)

  return (
    <button
      className="ep-preview"
      onClick={onOpen}
      disabled={images.length === 0}
    >
      <div className="ep-preview-stack">
        {stack.length === 0 ? (
          <div className="ep-preview-card" style={{ '--rot': '0deg', '--tx': '0px', '--ty': '0px', '--z': 1 }}>
            <div style={{ width: '100%', height: '100%', background: '#333' }} />
          </div>
        ) : (
          stack.map((img, i) => {
            const offset = i - (stackLen - 1) / 2
            const rot    = `${offset * 8}deg`
            const tx     = `${offset * 9.6}px`
            const ty     = `${Math.abs(offset) * 3.2}px`
            const z      = stackLen - Math.abs(Math.round(offset))
            return (
              <div
                key={img.url}
                className="ep-preview-card"
                style={{ '--rot': rot, '--tx': tx, '--ty': ty, '--z': z }}
              >
                <img src={img.url} alt="" />
              </div>
            )
          })
        )}
      </div>
      <span className="ep-preview-label">
        {images.length > 0 ? `${images.length} image${images.length !== 1 ? 's' : ''}` : 'No images'}
      </span>
    </button>
  )
}

// ─── Segmented control (shared by FormatToggle and FpsToggle) ─────────────────
function SegmentedControl({ children, label }) {
  return (
    <div className="ep-segmented" role="radiogroup" aria-label={label}>
      {children}
    </div>
  )
}

// ─── Format Toggle ─────────────────────────────────────────────────────────────
function FormatToggle({ format, onChange }) {
  const btnRefs = useRef({})
  const [ind, setInd] = useState({ opacity: 0 })

  function updateInd(key = format) {
    const el = btnRefs.current[key]
    if (el) setInd({ opacity: 1, transform: `translate(${el.offsetLeft}px, ${el.offsetTop}px)`, width: `${el.offsetWidth}px`, height: `${el.offsetHeight}px` })
  }

  useEffect(() => { requestAnimationFrame(() => updateInd()) }, [format])
  useEffect(() => {
    const h = () => updateInd()
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [format])

  return (
    <SegmentedControl label="Format">
      <span className="ep-seg-indicator" style={ind} />
      {Object.entries(FORMATS).map(([key, f]) => {
        const w = f.ratio >= 1 ? 1.2 : 1.2 * f.ratio
        const h = f.ratio >= 1 ? 1.2 / f.ratio : 1.2
        return (
          <button
            key={key}
            ref={el => { btnRefs.current[key] = el }}
            className={`ep-seg ${format === key ? 'ep-seg--active' : ''}`}
            role="radio"
            aria-checked={format === key}
            title={`${f.name} · ${f.label}`}
            onClick={() => onChange(key)}
          >
            <span className="ep-ratio" style={{ '--w': `${w}rem`, '--h': `${h}rem` }} />
          </button>
        )
      })}
    </SegmentedControl>
  )
}

// ─── FPS Toggle ────────────────────────────────────────────────────────────────
function FpsToggle({ fps, onChange }) {
  const options = [30, 60]
  const btnRefs = useRef({})
  const [ind, setInd] = useState({ opacity: 0 })

  function updateInd(key = fps) {
    const el = btnRefs.current[key]
    if (el) setInd({ opacity: 1, transform: `translate(${el.offsetLeft}px, ${el.offsetTop}px)`, width: `${el.offsetWidth}px`, height: `${el.offsetHeight}px` })
  }

  useEffect(() => { requestAnimationFrame(() => updateInd()) }, [fps])
  useEffect(() => {
    const h = () => updateInd()
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [fps])

  return (
    <SegmentedControl label="FPS">
      <span className="ep-seg-indicator" style={ind} />
      {options.map(f => (
        <button
          key={f}
          ref={el => { btnRefs.current[f] = el }}
          className={`ep-seg ep-seg--text ${fps === f ? 'ep-seg--active' : ''}`}
          role="radio"
          aria-checked={fps === f}
          onClick={() => onChange(f)}
        >
          {f}
        </button>
      ))}
    </SegmentedControl>
  )
}

// ─── Export Button ─────────────────────────────────────────────────────────────
function ExportButton({ isExporting, exportPct, onExport }) {
  const pct     = Math.round((exportPct ?? 0) * 100)
  const showPct = isExporting && exportPct > 0

  return (
    <button
      className={`ep-cta ${showPct ? 'ep-cta--progress' : ''}`}
      disabled={isExporting}
      onClick={onExport}
    >
      <svg className="ep-cta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v12"/>
        <path d="M6 11l6 6 6-6"/>
        <path d="M5 20h14"/>
      </svg>
      <span className="ep-cta-label">{isExporting ? 'Encoding' : 'Export MP4'}</span>
      <span className="ep-cta-pct">{pct}%</span>
    </button>
  )
}

// ─── Export Dock ───────────────────────────────────────────────────────────────
export default function ExportDock({
  images,
  format, onFormatChange,
  fps, onFpsChange,
  isExporting, exportPct,
  onExport,
  onImagePreviewOpen,
  onUploadClick,
}) {
  return (
    <div className="ep-dock">
      <div className="ep-toolbar">

        <ImagePreview images={images} onOpen={onImagePreviewOpen} />

        <button className="ep-upload-btn" onClick={onUploadClick} aria-label="Upload images">
          <svg className="ep-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </button>

        <span className="ep-divider" />

        <FormatToggle format={format} onChange={onFormatChange} />

        <span className="ep-divider" />

        <FpsToggle fps={fps} onChange={onFpsChange} />

        <ExportButton isExporting={isExporting} exportPct={exportPct} onExport={onExport} />

      </div>
    </div>
  )
}
