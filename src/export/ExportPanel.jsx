import { useState, useRef } from 'react'

const MONO = '"IBM Plex Mono", monospace'

const PRESETS = [
  { key: 'sphere', label: 'SPHERE' },
  { key: 'ring',   label: 'RING'   },
  { key: 'helix',  label: 'HELIX'  },
  { key: 'flow',   label: 'FLOW'   },
]

const BG_SWATCHES = ['#191812', '#000000', '#F0EDE4', '#FFFFFF', '#0a0a1a']

const COMP_SLIDERS = [
  { key: 'count',  label: 'COUNT',   min: 3,   max: 20,  step: 1,     fmt: v => Math.round(v) },
  { key: 'zoom',   label: 'ZOOM',    min: 0.5, max: 3.0, step: 0.05,  fmt: v => v.toFixed(2) },
  { key: 'radius', label: 'RADIUS',  min: 0.5, max: 4.0, step: 0.05,  fmt: v => v.toFixed(2) },
  { key: 'scale',  label: 'SCALE',   min: 0.5, max: 2.0, step: 0.05,  fmt: v => v.toFixed(2) },
]

const FPS_MIN = 24
const FPS_MAX = 60
const FPS_COUNT = FPS_MAX - FPS_MIN + 1

export default function ExportPanel({
  theme,
  fps, onFpsChange,
  corner, onCornerChange,
  duration, onDurationChange,
  onPresetChange,
}) {
  const isDark  = theme === 'dark'
  const text    = isDark ? '#f0ede4' : '#1a1a18'
  const muted   = isDark ? 'rgba(240,237,228,0.42)' : 'rgba(26,26,24,0.38)'
  const divider = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const rowBg   = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const dotLit  = text
  const dotDim  = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'

  const [preset,  setPreset]  = useState('sphere')
  const [bgColor, setBgColor] = useState('#191812')
  const [hexInput, setHex]   = useState('#191812')
  const [comp, setComp]      = useState({ count: 7, zoom: 1.0, radius: 1.0, scale: 1.0 })

  function selectPreset(key) {
    setPreset(key)
    onPresetChange?.(key)
  }

  function selectBg(color) {
    setBgColor(color)
    setHex(color)
  }

  function handleHex(e) {
    const v = e.target.value
    setHex(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) setBgColor(v)
  }

  // FPS dot-grid interaction
  const gridRef = useRef(null)
  const dragging = useRef(false)

  function fpsAt(clientX) {
    const rect = gridRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(FPS_MIN + ratio * (FPS_COUNT - 1))
  }

  return (
    <aside className="panel panel--right panel--export">
      <div className="panel-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 14px' }}>

        <SectionLabel muted={muted}>Export</SectionLabel>

        {/* Presets */}
        <section style={{ marginBottom: 14 }}>
          <RowLabel muted={muted}>Preset</RowLabel>
          <div style={{ display: 'flex', gap: 4 }}>
            {PRESETS.map(p => (
              <button key={p.key} onClick={() => selectPreset(p.key)} style={{
                flex: 1, padding: '5px 0', border: 'none', borderRadius: 5, cursor: 'pointer',
                background: preset === p.key ? text : rowBg,
                color: preset === p.key ? (isDark ? '#191812' : '#F0EDE4') : muted,
                fontFamily: MONO, fontSize: 8, letterSpacing: '0.06em',
                transition: 'background 0.15s, color 0.15s',
              }}>
                {p.label}
              </button>
            ))}
          </div>
        </section>

        <Hr color={divider} />

        {/* Background */}
        <section style={{ margin: '12px 0' }}>
          <RowLabel muted={muted}>Background</RowLabel>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 0 }}>
            {BG_SWATCHES.map(c => (
              <button key={c} onClick={() => selectBg(c)} style={{
                width: 18, height: 18, borderRadius: '50%',
                border: bgColor === c ? `2px solid ${text}` : '1.5px solid rgba(128,128,128,0.25)',
                background: c, cursor: 'pointer', flexShrink: 0,
                transition: 'border-color 0.15s',
              }} />
            ))}
            <input
              value={hexInput} onChange={handleHex} maxLength={7} spellCheck={false}
              style={{
                flex: 1, fontFamily: MONO, fontSize: 9, color: text,
                background: rowBg, border: 'none', borderRadius: 4,
                padding: '3px 6px', outline: 'none', letterSpacing: '0.04em',
              }}
            />
          </div>
        </section>

        <Hr color={divider} />

        {/* Composition */}
        <section style={{ margin: '12px 0' }}>
          <RowLabel muted={muted}>Composition</RowLabel>
          {COMP_SLIDERS.map(({ key, label, min, max, step, fmt }) => (
            <div key={key} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: muted, textTransform: 'uppercase' }}>{label}</span>
                <span style={{ fontFamily: MONO, fontSize: 9, color: muted }}>{fmt(comp[key])}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={comp[key]}
                onChange={e => setComp(c => ({ ...c, [key]: parseFloat(e.target.value) }))}
                style={{ width: '100%', accentColor: text, cursor: 'pointer' }} />
            </div>
          ))}
          {/* Corners */}
          <div style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: muted, textTransform: 'uppercase' }}>CORNERS</span>
              <span style={{ fontFamily: MONO, fontSize: 9, color: muted }}>{Math.round((corner ?? 0) * 1000) / 10}%</span>
            </div>
            <input type="range" min={0} max={0.1} step={0.005} value={corner ?? 0}
              onChange={e => onCornerChange?.(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: text, cursor: 'pointer' }} />
          </div>
        </section>

        <Hr color={divider} />

        {/* Video Length */}
        <section style={{ margin: '12px 0' }}>
          <RowLabel muted={muted}>Video Length</RowLabel>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: muted, textTransform: 'uppercase' }}>LOOP</span>
            <span style={{ fontFamily: MONO, fontSize: 9, color: muted }}>{duration}s</span>
          </div>
          <input type="range" min={5} max={60} step={1} value={duration}
            onChange={e => onDurationChange?.(Number(e.target.value))}
            style={{ width: '100%', accentColor: text, cursor: 'pointer' }} />
        </section>

        <Hr color={divider} />

        {/* FPS Dot-Grid */}
        <section style={{ margin: '12px 0 4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <RowLabel muted={muted} inline>FPS</RowLabel>
            <span style={{ fontFamily: MONO, fontSize: 10, color: text, fontWeight: 500 }}>{fps}</span>
          </div>
          <div
            ref={gridRef}
            onMouseDown={e => { dragging.current = true; onFpsChange(fpsAt(e.clientX)) }}
            onMouseMove={e => { if (dragging.current) onFpsChange(fpsAt(e.clientX)) }}
            onMouseUp={() => { dragging.current = false }}
            onMouseLeave={() => { dragging.current = false }}
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${FPS_COUNT}, 1fr)`,
              gap: '2px',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            {Array.from({ length: FPS_COUNT }, (_, i) => {
              const val = FPS_MIN + i
              return (
                <div key={i} style={{
                  aspectRatio: '1',
                  borderRadius: '50%',
                  background: val <= fps ? dotLit : dotDim,
                  transition: 'background 0.06s',
                }} />
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            <span style={{ fontFamily: MONO, fontSize: 8, color: muted }}>{FPS_MIN}</span>
            <span style={{ fontFamily: MONO, fontSize: 8, color: muted }}>{FPS_MAX}</span>
          </div>
        </section>

      </div>
    </aside>
  )
}

function SectionLabel({ children, muted }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.13em', color: muted, textTransform: 'uppercase', marginBottom: 14 }}>
      {children}
    </div>
  )
}

function RowLabel({ children, muted, inline }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', color: muted, textTransform: 'uppercase', marginBottom: inline ? 0 : 8 }}>
      {children}
    </div>
  )
}

function Hr({ color }) {
  return <div style={{ height: 1, background: color, margin: '2px -14px' }} />
}
