import NumberField from '../components/NumberField.jsx'
import BgToggle from '../components/BgToggle.jsx'
import LoopTimeline from '../components/LoopTimeline.jsx'
import '../styles/export.css'

const PRESETS = [
  { key: 'sphere',    label: 'Sphere'     },
  { key: 'ring',      label: 'Ring'       },
  { key: 'helix',     label: 'Helix'      },
  { key: 'flow',      label: 'Flow'       },
  { key: 'shuffle',   label: 'Shuffle'    },
  { key: 'mainStage', label: 'Main Stage' },
]

function PhotoCount({ count, isShuffle }) {
  let text
  if (count === 0) {
    text = 'No photos · drop images to begin'
  } else if (isShuffle) {
    text = `${count} photo${count !== 1 ? 's' : ''} loaded`
  } else {
    text = `${count} photo${count !== 1 ? 's' : ''} loaded`
  }
  return <p className="ep-photo-count">{text}</p>
}

export default function ExportPanel({
  presetId, onPresetChange,
  bgColor, onBgChange,
  controls, onControlsChange,
  loopS, onLoopChange,
  photoCount = 0,
  exportFormat,
}) {
  function setCtrl(key, val) {
    onControlsChange({ ...controls, [key]: val })
  }

  const isShuffle   = presetId === 'shuffle'
  const isMainStage = presetId === 'mainStage'
  const is2D        = isShuffle || isMainStage

  return (
    <div>
      {/* Preset */}
      <div className="ep-field ep-field--inline" style={{ marginBottom: 4 }}>
        <span className="ep-field-label">Preset</span>
        <div className="ep-field-value">
          <div style={{ position: 'relative' }}>
            <select
              value={presetId}
              onChange={e => onPresetChange(e.target.value)}
              style={{
                appearance: 'none',
                background: 'rgba(255,255,255,0.08)',
                border: 'none',
                borderRadius: 6,
                color: 'rgba(240,237,228,0.9)',
                cursor: 'pointer',
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 11,
                outline: 'none',
                padding: '4px 22px 4px 8px',
              }}
            >
              {PRESETS.map(p => (
                <option key={p.key} value={p.key} style={{ background: '#1a1a16' }}>{p.label}</option>
              ))}
            </select>
            <span style={{
              pointerEvents: 'none', position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(240,237,228,0.4)', fontSize: 10,
            }}>▾</span>
          </div>
        </div>
      </div>

      {/* Portrait hint for Main Stage */}
      {isMainStage && exportFormat !== 'portrait' && (
        <p className="ep-photo-count" style={{ color: 'rgba(240,180,80,0.7)' }}>
          Best with Portrait (9:16) format
        </p>
      )}

      {/* Photo count */}
      <PhotoCount count={photoCount} isShuffle={isShuffle} />

      {/* Background */}
      <div style={{ marginBottom: 4 }}>
        <BgToggle bgColor={bgColor} onBgChange={onBgChange} />
      </div>

      {/* Composition */}
      <h3 className="ep-section">Composition</h3>
      <div className="ep-panel">
        {!is2D && (
          <NumberField label="Count"  value={controls.count}  min={1}   max={100} step={1}    onChange={v => setCtrl('count', v)} />
        )}
        {!is2D && (
          <NumberField label="Zoom"   value={controls.zoom}   min={0.4} max={3}   step={0.05} onChange={v => setCtrl('zoom', v)} />
        )}
        {!is2D && presetId !== 'flow' && (
          <NumberField label="Radius" value={controls.radius} min={0.3} max={3}   step={0.05} onChange={v => setCtrl('radius', v)} />
        )}
        {!is2D && (
          <NumberField label="Scale"  value={controls.scale}  min={0.2} max={2}   step={0.05} onChange={v => setCtrl('scale', v)} />
        )}
        {!isMainStage && (
          <NumberField label="Corners" value={controls.corners} min={0} max={0.5} step={0.01} onChange={v => setCtrl('corners', v)} />
        )}
        {is2D && (
          <NumberField
            label="Speed"
            value={controls.speed}
            min={isMainStage ? 0.2 : 0.2}
            max={isMainStage ? 3.0 : 4.0}
            step={isMainStage ? 0.05 : 0.1}
            onChange={v => setCtrl('speed', v)}
          />
        )}
      </div>

      {/* Video Length */}
      <h3 className="ep-section">Video Length</h3>
      <div className="ep-panel">
        <NumberField label="Loop" value={loopS} min={1} max={24} step={0.1} onChange={onLoopChange} unit=" s" />
        <LoopTimeline loopS={loopS} />
      </div>
    </div>
  )
}
