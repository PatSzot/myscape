import { useState, useRef, useEffect } from 'react'
import 'remixicon/fonts/remixicon.css'
import ExportPanelContent from '../export/ExportPanel.jsx'
import '../styles/export.css'

const MONO = '"IBM Plex Mono", monospace'

const PRESETS = [
  { key: 'scape',      label: 'Scape'       },
  { key: 'sphere',     label: 'Sphere'      },
  { key: 'ring',       label: 'Ring'        },
  { key: 'helix',      label: 'Helix'       },
  { key: 'flow',       label: 'Flow'        },
  { key: 'shuffle',    label: 'Shuffle'     },
  { key: 'mainStage',  label: 'Main Stage'  },
  { key: 'spiral',     label: 'Spiral'      },
  { key: 'photoBooth', label: 'Photo Booth' },
  { key: 'cube',       label: 'Cube'        },
]

export default function LeftPanel({
  theme,
  images, onUploadClick,
  presetId, onPresetChange,
  bgColor, onBgChange,
  exportControls, onExportControlsChange,
}) {
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 1024)
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

  const isDark = theme === 'dark'
  const text   = isDark ? '#f0ede4' : '#1a1a18'

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
        {/* Fixed header: Upload button + Preset dropdown */}
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
              fontFamily: MONO, fontSize: 11, letterSpacing: '0.09em',
              fontWeight: 500,
              transition: 'background 0.15s',
            }}
          >
            <i className="ri-upload-2-line" style={{ fontSize: 20, flexShrink: 0 }} />
            {images.length > 0
              ? `${images.length} PHOTO${images.length !== 1 ? 'S' : ''} · ADD MORE`
              : 'UPLOAD PHOTOS'}
          </button>

          {/* Preset dropdown */}
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <select
              value={presetId}
              onChange={e => onPresetChange(e.target.value)}
              style={{
                appearance: 'none',
                background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                border: 'none',
                borderRadius: 10,
                color: text,
                cursor: 'pointer',
                fontFamily: MONO,
                fontSize: 12,
                letterSpacing: '0.07em',
                fontWeight: 500,
                outline: 'none',
                padding: '0 40px 0 16px',
                width: '100%',
                height: 50,
              }}
            >
              {PRESETS.map(p => (
                <option key={p.key} value={p.key} style={{ background: '#1a1812' }}>{p.label}</option>
              ))}
            </select>
            <span style={{
              pointerEvents: 'none', position: 'absolute', right: 14, top: '50%',
              transform: 'translateY(-50%)',
              color: isDark ? 'rgba(240,237,228,0.4)' : 'rgba(26,26,24,0.35)',
              fontSize: 14,
            }}>▾</span>
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
          />
        </div>
      </aside>
    </>
  )
}
