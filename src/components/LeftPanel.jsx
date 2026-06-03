import { useState, useRef, useEffect } from 'react'
import 'remixicon/fonts/remixicon.css'
import { PRESET_IDS, PRESETS } from '../lib/presets.js'

const MONO     = '"IBM Plex Mono", monospace'
const HEADLINE = '"Zalando Sans SemiExpanded", sans-serif'

const SLIDERS = [
  { label: 'SPEED',  key: 'speed',  min: 0.1, max: 3.0, step: 0.05 },
  { label: 'RADIUS', key: 'radius', min: 0.5, max: 4.0, step: 0.05 },
  { label: 'SCALE',  key: 'scale',  min: 0.2, max: 2.0, step: 0.05 },
  { label: 'COUNT',  key: 'count',  min: 5,   max: 50,  step: 1     },
]

const ASPECTS = [
  { label: '1:1',  value: '1:1',  size: { width: 1080, height: 1080 } },
  { label: '9:16', value: '9:16', size: { width: 1080, height: 1920 } },
  { label: '16:9', value: '16:9', size: { width: 1920, height: 1080 } },
]

export default function LeftPanel({
  theme, onThemeChange,
  corners, onCornersChange,
  scapeName, onScapeNameChange,
  presetId, controls, onPresetChange, onControlsChange,
  aspectRatio, onAspectChange,
  images, onUploadClick, onDelete, onRotate,
  onShare,
}) {
  const [isOpen,   setIsOpen]   = useState(() => window.innerWidth >= 1024)
  const [copied,   setCopied]   = useState(false)
  const [copying,  setCopying]  = useState(false)
  const [shareUrl, setShareUrl] = useState(null)
  const panelRef  = useRef(null)
  const toggleRef = useRef(null)

  // Auto-open on desktop resize, close on mobile resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) setIsOpen(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close on outside click (mobile/tablet only)
  useEffect(() => {
    function handleClick(e) {
      if (window.innerWidth >= 1024) return
      if (!isOpen) return
      if (panelRef.current?.contains(e.target)) return
      if (toggleRef.current?.contains(e.target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [isOpen])

  const isDark    = theme === 'dark'
  const text      = isDark ? '#f0ede4' : '#1a1a18'
  const muted     = isDark ? 'rgba(240,237,228,0.42)' : 'rgba(26,26,24,0.38)'
  const divider   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const bg        = isDark ? '#191812' : '#F0EDE4'
  const rowBg     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const accent    = text
  const toggleOff = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'

  const isLandscape      = presetId === 'landscape'
  const isRotatingImages = presetId === 'rotatingImages'

  const activeSliders = isRotatingImages
    ? [
        { label: 'MIN SPREAD', key: 'radius', min: 0.5, max: 5.0, step: 0.05 },
        { label: 'CARD SIZE',  key: 'scale',  min: 0.3, max: 2.0, step: 0.05 },
        { label: 'SPEED',      key: 'speed',  min: 0.1, max: 3.0, step: 0.05 },
      ]
    : SLIDERS
  const canShare    = images.length > 0 && !copying

  async function handleShare() {
    if (!canShare) return
    setCopying(true)
    setShareUrl(null)
    try {
      const url = await onShare()
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      } catch {
        setShareUrl(url)
      }
    } catch (err) {
      console.error('Share failed:', err)
      alert('Failed to generate share link. Please try again.')
    } finally {
      setCopying(false)
    }
  }

  function Label({ children }) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.13em', color: muted, textTransform: 'uppercase', marginBottom: 10 }}>
        {children}
      </div>
    )
  }

  function Divider() {
    return <div style={{ height: 1, background: divider, margin: '4px -16px' }} />
  }

  function sliderVal(key) {
    return key === 'count' ? Math.round(controls[key]) : controls[key].toFixed(2)
  }

  return (
    <>
    {/* Toggle button */}
    <button
      ref={toggleRef}
      className={`panel-toggle-btn${isOpen ? ' panel-toggle-btn--open' : ''}`}
      onClick={() => setIsOpen(o => !o)}
      aria-label={isOpen ? 'Close panel' : 'Open panel'}
    >
      <i className={`toggle-icon ri-${isOpen ? 'close' : 'menu'}-line`} />
      <span className="toggle-label">Create</span>
    </button>

    <aside ref={panelRef} className={`panel panel--left ${isOpen ? 'panel--visible' : 'panel--hidden'}`}>

      {/* ── Scrollable content ─────────────────────────────────────────── */}
      <div className="panel-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 16px' }}>

        {/* Photos */}
        <section style={{ marginBottom: 18 }}>
          <Label>Photos</Label>
          <button onClick={onUploadClick} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '7px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
            background: rowBg, color: muted,
            fontFamily: MONO, fontSize: 10, letterSpacing: '0.07em',
          }}>
            <i className="ri-upload-2-line" style={{ fontSize: 13, color: text }} />
            {images.length > 0
              ? `${images.length} PHOTO${images.length !== 1 ? 'S' : ''} — ADD MORE`
              : 'UPLOAD PHOTOS'}
          </button>

          {images.length > 0 && (
            <div style={{ marginTop: 8, maxHeight: 148, overflowY: 'auto' }}>
              {images.map(({ url, meta }, i) => (
                <div key={url} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 2px', borderBottom: `1px solid ${divider}`,
                }}>
                  <img src={url} alt="" style={{ width: 28, height: 28, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: MONO, fontSize: 9, color: muted, letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meta?.date ? meta.date.toUpperCase() : `PHOTO ${i + 1}`}
                  </span>
                  <button onClick={() => onRotate(url)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px 3px', lineHeight: 1 }}>
                    <i className="ri-arrow-right-circle-line" style={{ fontSize: 11 }} />
                  </button>
                  <button onClick={() => onDelete(url)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px 3px', lineHeight: 1 }}>
                    <i className="ri-close-line" style={{ fontSize: 11 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <Divider />

        {/* Style */}
        <section style={{ margin: '16px 0' }}>
          <Label>Style</Label>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.09em', color: muted, textTransform: 'uppercase', marginBottom: 6 }}>Name</div>
            <input
              type="text" placeholder="Untitled Scape" value={scapeName}
              onChange={e => onScapeNameChange(e.target.value)}
              style={{
                display: 'block', width: '100%', boxSizing: 'border-box',
                background: 'transparent', border: 'none',
                borderBottom: `1px solid ${divider}`,
                color: text, fontFamily: HEADLINE, fontSize: 15, fontWeight: 500,
                padding: '2px 0 6px', outline: 'none', caretColor: text,
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, cursor: 'pointer' }}
            onClick={() => onCornersChange(corners === 'rounded' ? 'sharp' : 'rounded')}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: muted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Rounded Corners</span>
            <Toggle on={corners === 'rounded'} text={text} bg={bg} off={toggleOff} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => onThemeChange(isDark ? 'light' : 'dark')}>
            <span style={{ fontFamily: MONO, fontSize: 9, color: muted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Dark Mode</span>
            <Toggle on={isDark} text={text} bg={bg} off={toggleOff} />
          </div>
        </section>

        <Divider />

        {/* Organize */}
        <section style={{ margin: '16px 0' }}>
          <Label>Organize</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {['landscape', 'sphere', 'ring', 'helix', 'rotatingImages'].map(id => (
            <PresetBtn
              key={id}
              id={id}
              label={id === 'landscape' ? 'LANDSCAPE' : PRESETS[id].label}
              active={presetId === id}
              rowBg={rowBg} text={text} muted={muted}
              onSelect={onPresetChange}
            />
          ))}
          </div>
        </section>

        <Divider />

        {/* Composition */}
        {!isLandscape && (
          <section style={{ margin: '16px 0' }}>
            <Label>Composition</Label>
            {activeSliders.map(({ label, key, min, max, step }) => (
              <div key={key} style={{ marginBottom: 11 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: muted, textTransform: 'uppercase' }}>{label}</span>
                  <span style={{ fontFamily: MONO, fontSize: 9, color: text, fontVariantNumeric: 'tabular-nums' }}>{sliderVal(key)}</span>
                </div>
                <input type="range" min={min} max={max} step={step} value={controls[key]}
                  onChange={e => onControlsChange({ ...controls, [key]: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: accent, cursor: 'pointer', display: 'block' }}
                />
              </div>
            ))}
            {isRotatingImages && (
              <div style={{ fontFamily: MONO, fontSize: 9, color: muted, letterSpacing: '0.06em', marginTop: 6 }}>
                {images.length} PHOTO{images.length !== 1 ? 'S' : ''} LOADED
              </div>
            )}
            <div style={{ fontFamily: MONO, fontSize: 9, color: muted, letterSpacing: '0.06em', marginTop: 10, opacity: 0.7 }}>
              Scroll to zoom · Drag to orbit
            </div>
          </section>
        )}

        <Divider />

        {/* Format */}
        <section style={{ margin: '16px 0' }}>
          <Label>Format</Label>
          <div style={{ display: 'flex', gap: 4 }}>
            {ASPECTS.map(({ label, value, size }) => {
              const active = aspectRatio === value
              return (
                <button key={value} onClick={() => onAspectChange(value, size)} style={{
                  flex: 1, padding: '5px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: active ? (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)') : rowBg,
                  fontFamily: MONO, fontSize: 10, letterSpacing: '0.05em',
                  color: active ? text : muted,
                  transition: 'all 0.14s',
                }}>
                  {label}
                </button>
              )
            })}
          </div>
        </section>

      </div>

      {/* ── Share CTA — pinned to bottom ───────────────────────────────── */}
      <div style={{ flexShrink: 0, padding: '12px 16px 16px' }}>

        {/* Fallback URL (iOS clipboard workaround) */}
        {shareUrl && (
          <input readOnly value={shareUrl}
            onFocus={e => e.target.select()}
            onClick={e => { e.target.select(); navigator.clipboard?.writeText(shareUrl).catch(() => {}) }}
            style={{
              display: 'block', width: '100%', boxSizing: 'border-box', marginBottom: 8,
              fontFamily: MONO, fontSize: 10, color: text,
              background: rowBg, border: 'none', borderRadius: 5,
              padding: '7px 10px', outline: 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          />
        )}

        <button onClick={handleShare} disabled={!canShare} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '13px 0', borderRadius: 8, border: 'none',
          background: copied
            ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)')
            : text,
          color: copied ? text : (isDark ? '#191812' : '#F0EDE4'),
          fontFamily: MONO, fontSize: 11, letterSpacing: '0.09em', fontWeight: 500,
          cursor: canShare ? 'pointer' : 'default',
          opacity: !images.length ? 0.35 : 1,
          transition: 'all 0.2s',
        }}>
          <i className={`ri-${copied ? 'check' : copying ? 'loader-4' : 'link'}-line`} style={{ fontSize: 14 }} />
          {copying ? 'UPLOADING…' : copied ? 'LINK COPIED' : 'SHARE'}
        </button>

      </div>

    </aside>
    </>
  )
}

function PresetBtn({ id, label, active, rowBg, text, muted, onSelect }) {
  return (
    <button onClick={() => onSelect(id)} style={{
      background: active ? rowBg : 'none',
      border: 'none', cursor: 'pointer', textAlign: 'left',
      fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, letterSpacing: '0.06em',
      color: active ? text : muted,
      padding: '6px 8px', borderRadius: 4,
      transition: 'color 0.12s, background 0.12s',
    }}>
      {label}
    </button>
  )
}

function Toggle({ on, text, bg, off }) {
  return (
    <div style={{
      width: 32, height: 18, borderRadius: 9, flexShrink: 0, position: 'relative',
      background: on ? text : off, transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%',
        background: on ? bg : 'rgba(255,255,255,0.5)',
        transform: on ? 'translateX(16px)' : 'translateX(2px)',
        transition: 'transform 0.2s',
      }} />
    </div>
  )
}
