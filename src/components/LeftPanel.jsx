import { useState, useRef, useEffect } from 'react'
import 'remixicon/fonts/remixicon.css'
import ExportPanelContent from '../export/ExportPanel.jsx'
import '../styles/export.css'

const MONO = '"IBM Plex Mono", monospace'

const PRESETS = [
  { key: 'landscape',  label: 'Landscape',   share: true  },
  { key: 'sphere',     label: 'Sphere',       share: false },
  { key: 'ring',       label: 'Ring',         share: false },
  { key: 'helix',      label: 'Helix',        share: false },
  { key: 'flow',       label: 'Flow',         share: false },
  { key: 'shuffle',    label: 'Shuffle',      share: false },
  { key: 'mainStage',  label: 'Main Stage',   share: false },
  { key: 'spiral',     label: 'Spiral',       share: false },
  { key: 'photoBooth', label: 'Photo Booth',  share: false },
  { key: 'cube',       label: 'Cube',         share: true  },
]

export default function LeftPanel({
  theme,
  images, onUploadClick,
  presetId, onPresetChange,
  bgColor, onBgChange,
  exportControls, onExportControlsChange,
  exportFormat, onExportFormatChange,
  loopS, onLoopChange,
}) {
  const [isOpen,      setIsOpen]      = useState(() => window.innerWidth >= 1024)
  const [presetOpen,  setPresetOpen]  = useState(false)
  const panelRef  = useRef(null)
  const toggleRef = useRef(null)

  // Auto-open on desktop resize
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

  const isDark       = theme === 'dark'
  const text         = isDark ? '#f0ede4' : '#1a1a18'
  const mutedText    = isDark ? 'rgba(240,237,228,0.5)' : 'rgba(26,26,24,0.45)'
  const rowBg        = isDark ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.045)'
  const rowActiveBg  = isDark ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.09)'
  const dividerColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'

  const currentLabel = PRESETS.find(p => p.key === presetId)?.label ?? presetId

  function selectPreset(key) {
    onPresetChange(key)
    setPresetOpen(false)
  }

  return (
    <>
      <button
        ref={toggleRef}
        className={`panel-toggle-btn${isOpen ? ' panel-toggle-btn--open' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen ? 'Close panel' : 'Open panel'}
      >
        <i className={`toggle-icon ri-${isOpen ? 'close' : 'menu'}-line`} />
        <span className="toggle-label">Create</span>
      </button>

      <aside
        ref={panelRef}
        className={`panel panel--left ${isOpen ? 'panel--visible' : 'panel--hidden'} panel--wide`}
      >
        {/* Fixed header */}
        <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>

          {/* Upload Photos */}
          <button
            onClick={onUploadClick}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, width: '100%', height: 50, marginBottom: 10,
              borderRadius: 10, border: 'none', cursor: 'pointer',
              background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              color: text,
              fontFamily: MONO, fontSize: 11, letterSpacing: '0.09em', fontWeight: 500,
              transition: 'background 0.15s',
            }}
          >
            <i className="ri-upload-2-line" style={{ fontSize: 20, flexShrink: 0 }} />
            {images.length > 0
              ? `${images.length} PHOTO${images.length !== 1 ? 'S' : ''} · ADD MORE`
              : 'UPLOAD PHOTOS'}
          </button>

          {/* Custom preset selector */}
          <div style={{ marginBottom: 10 }}>

            {/* Trigger */}
            <button
              onClick={() => setPresetOpen(o => !o)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', height: 50, padding: '0 14px 0 16px',
                border: 'none', cursor: 'pointer',
                background: rowBg,
                borderRadius: presetOpen ? '10px 10px 0 0' : 10,
                color: text,
                fontFamily: MONO, fontSize: 12, letterSpacing: '0.07em', fontWeight: 500,
                transition: 'background 0.15s, border-radius 0.15s',
              }}
            >
              <span>{currentLabel}</span>
              <i
                className="ri-arrow-down-s-line"
                style={{
                  fontSize: 20, color: mutedText, flexShrink: 0,
                  transition: 'transform 0.2s',
                  transform: presetOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {/* Expandable list */}
            {presetOpen && (
              <div style={{
                background: rowBg,
                borderRadius: '0 0 10px 10px',
                overflow: 'hidden',
              }}>
                {PRESETS.map((p, i) => {
                  const isActive = p.key === presetId
                  return (
                    <button
                      key={p.key}
                      onClick={() => selectPreset(p.key)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', height: 42, padding: '0 14px 0 16px',
                        border: 'none', cursor: 'pointer',
                        borderTop: `1px solid ${dividerColor}`,
                        background: isActive ? rowActiveBg : 'transparent',
                        color: isActive ? text : mutedText,
                        fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em',
                        fontWeight: isActive ? 500 : 400,
                        transition: 'background 0.1s',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <i
                          className={p.share ? 'ri-global-line' : 'ri-video-line'}
                          style={{ fontSize: 14, flexShrink: 0, opacity: isActive ? 0.8 : 0.45 }}
                        />
                        {p.label}
                      </span>
                      {isActive && (
                        <i className="ri-check-line" style={{ fontSize: 14, flexShrink: 0 }} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

          </div>
        </div>

        {/* Scrollable panel body */}
        <div className="panel-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          <ExportPanelContent
            presetId={presetId}
            bgColor={bgColor}
            onBgChange={onBgChange}
            controls={exportControls}
            onControlsChange={onExportControlsChange}
            photoCount={images.length}
            exportFormat={exportFormat}
            loopS={loopS}
            onLoopChange={onLoopChange}
          />
        </div>
      </aside>
    </>
  )
}
