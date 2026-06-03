import NumberField from '../components/NumberField.jsx'
import BgToggle from '../components/BgToggle.jsx'
import LoopTimeline from '../components/LoopTimeline.jsx'
import '../styles/export.css'

const PRESETS = [
  { key: 'sphere', label: 'Sphere' },
  { key: 'ring',   label: 'Ring'   },
  { key: 'helix',  label: 'Helix'  },
  { key: 'flow',   label: 'Flow'   },
]

export default function ExportPanel({
  presetId, onPresetChange,
  bgColor, onBgChange,
  controls, onControlsChange,
  loopS, onLoopChange,
}) {
  function setCtrl(key, val) {
    onControlsChange({ ...controls, [key]: val })
  }

  return (
    <div>
      {/* Preset */}
      <div className="ep-field ep-field--inline" style={{ marginBottom: 6 }}>
        <span className="ep-field-label">Preset</span>
        <div className="ep-field-value">
          <div style={{ position: 'relative' }}>
            <select
              value={presetId}
              onChange={e => onPresetChange(e.target.value)}
              style={{
                appearance: 'none',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: 6,
                color: '#fff',
                cursor: 'pointer',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 12,
                outline: 'none',
                padding: '4px 24px 4px 8px',
              }}
            >
              {PRESETS.map(p => (
                <option key={p.key} value={p.key} style={{ background: '#202020' }}>{p.label}</option>
              ))}
            </select>
            <span style={{
              pointerEvents: 'none', position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.5)', fontSize: 10,
            }}>▾</span>
          </div>
        </div>
      </div>

      {/* Background */}
      <div style={{ marginBottom: 6 }}>
        <BgToggle bgColor={bgColor} onBgChange={onBgChange} />
      </div>

      {/* Composition */}
      <h3 className="ep-section">Composition</h3>
      <div className="ep-panel">
        <NumberField label="Count"   value={controls.count}   min={1}   max={100} step={1}    onChange={v => setCtrl('count', v)} />
        <NumberField label="Zoom"    value={controls.zoom}    min={0.4} max={3}   step={0.05} onChange={v => setCtrl('zoom', v)} />
        {presetId !== 'flow' && (
          <NumberField label="Radius" value={controls.radius} min={0.3} max={3}   step={0.05} onChange={v => setCtrl('radius', v)} />
        )}
        <NumberField label="Scale"   value={controls.scale}   min={0.2} max={2}   step={0.05} onChange={v => setCtrl('scale', v)} />
        <NumberField label="Corners" value={controls.corners} min={0}   max={0.5} step={0.01} onChange={v => setCtrl('corners', v)} />
      </div>

      {/* Video Length */}
      <h3 className="ep-section">Video Length</h3>
      <div className="ep-panel">
        <NumberField label="Loop" value={loopS} min={1} max={24} step={0.1} onChange={onLoopChange} />
        <LoopTimeline loopS={loopS} />
      </div>
    </div>
  )
}
