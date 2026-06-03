import { PRESET_IDS, PRESETS } from '../lib/presets.js'

const MONO     = '"IBM Plex Mono", monospace'
const HEADLINE = '"Zalando Sans SemiExpanded", sans-serif'

const SLIDERS = [
  { label: 'SPEED',  key: 'speed',  min: 0.1, max: 3.0, step: 0.05 },
  { label: 'ZOOM',   key: 'zoom',   min: 0.5, max: 3.5, step: 0.05 },
  { label: 'RADIUS', key: 'radius', min: 0.5, max: 4.0, step: 0.05 },
  { label: 'SCALE',  key: 'scale',  min: 0.2, max: 2.0, step: 0.05 },
  { label: 'COUNT',  key: 'count',  min: 5,   max: 50,  step: 1     },
]

export default function AnimationControls({ presetId, controls, onPresetChange, onControlsChange, theme }) {
  const isDark         = theme === 'dark'
  const textPrimary    = isDark ? '#f0ede4' : '#000'
  const textSecondary  = isDark ? '#888'    : '#aaa'
  const textMuted      = isDark ? '#555'    : '#ccc'
  const dividerColor   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const pillBg         = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const pillActiveBg   = textPrimary
  const pillActiveCol  = isDark ? '#191812' : '#ffffff'
  const sliderBg       = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'

  return (
    <div>
      {/* ── Preset selector ─────────────────────────────────────────────── */}
      <div style={{ ...s.row, padding: '12px 20px', gap: 5 }}>
        {PRESET_IDS.map(id => {
          const active = presetId === id
          return (
            <button
              key={id}
              onClick={() => onPresetChange(id)}
              style={{
                flex: 1,
                padding: '7px 0',
                border: 'none',
                cursor: 'pointer',
                borderRadius: 8,
                background: active ? pillActiveBg : pillBg,
                color: active ? pillActiveCol : textSecondary,
                fontFamily: MONO,
                fontSize: 9,
                fontWeight: 500,
                letterSpacing: '0.06em',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {PRESETS[id].label}
            </button>
          )
        })}
      </div>

      <div style={{ ...s.dividerH, background: dividerColor }} />

      {/* ── Sliders (non-explore) ────────────────────────────────────────── */}
      {presetId !== 'explore' ? (
        <div style={{ padding: '8px 20px 14px' }}>
          {SLIDERS.map(({ label, key, min, max, step }) => (
            <div key={key} style={s.sliderRow}>
              <div style={s.sliderTop}>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', color: textSecondary }}>
                  {label}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.04em', color: textMuted, fontVariantNumeric: 'tabular-nums' }}>
                  {key === 'count' ? Math.round(controls[key]) : controls[key].toFixed(2)}
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={controls[key]}
                onChange={e => onControlsChange({ ...controls, [key]: parseFloat(e.target.value) })}
                style={{ width: '100%', accentColor: textPrimary, cursor: 'pointer' }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: '14px 20px', textAlign: 'center' }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: textMuted }}>
            Drag to explore · Scroll to zoom · Two-finger to pan
          </span>
        </div>
      )}
    </div>
  )
}

const s = {
  row: {
    display: 'flex',
    alignItems: 'center',
  },
  dividerH: {
    height: 1,
    margin: '0 20px',
  },
  sliderRow: {
    marginBottom: 10,
  },
  sliderTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
}
