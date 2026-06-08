import NumberField from '../components/NumberField.jsx'
import BgToggle from '../components/BgToggle.jsx'
import LoopTimeline from '../components/LoopTimeline.jsx'
import '../styles/export.css'

const PRESETS = [
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

function PhotoCount({ count }) {
  const text = count === 0
    ? 'No photos · drop images to begin'
    : `${count} photo${count !== 1 ? 's' : ''} loaded`
  return <p className="ep-photo-count">{text}</p>
}

function CornersToggle({ on, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, cursor: 'pointer', padding: '0 2px' }}
    >
      <span className="ep-field-label">Rounded Corners</span>
      <div style={{
        width: 32, height: 18, borderRadius: 9, flexShrink: 0, position: 'relative',
        background: on ? 'rgba(240,237,228,0.9)' : 'rgba(255,255,255,0.14)',
        transition: 'background 0.2s',
      }}>
        <div style={{
          position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%',
          background: on ? '#191812' : 'rgba(255,255,255,0.5)',
          transform: on ? 'translateX(16px)' : 'translateX(2px)',
          transition: 'transform 0.2s',
        }} />
      </div>
    </div>
  )
}

export default function ExportPanel({
  presetId, onPresetChange,
  bgColor, onBgChange,
  controls, onControlsChange,
  loopS, onLoopChange,
  photoCount = 0,
  exportFormat,
  corner = 0, onCornerChange,
}) {
  function setCtrl(key, val) {
    onControlsChange({ ...controls, [key]: val })
  }

  const isShuffle    = presetId === 'shuffle'
  const isMainStage  = presetId === 'mainStage'
  const isSpiral     = presetId === 'spiral'
  const isPhotoBooth = presetId === 'photoBooth'
  const isCube       = presetId === 'cube'
  const is2D         = isShuffle || isMainStage || isSpiral || isPhotoBooth

  function toggleCorners() {
    const newOn = corner <= 0
    onCornerChange?.(newOn ? 0.04 : 0)
    setCtrl('corners', newOn ? 0.08 : 0)
  }

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
                <option key={p.key} value={p.key} style={{ background: '#1a1812' }}>{p.label}</option>
              ))}
            </select>
            <span style={{
              pointerEvents: 'none', position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(240,237,228,0.4)', fontSize: 10,
            }}>▾</span>
          </div>
        </div>
      </div>

      {/* Format hints */}
      {isMainStage && exportFormat !== 'portrait' && (
        <p className="ep-photo-count" style={{ color: 'rgba(240,180,80,0.7)' }}>
          Best with Portrait (9:16) format
        </p>
      )}
      {isSpiral && exportFormat !== 'square' && (
        <p className="ep-photo-count" style={{ color: 'rgba(240,180,80,0.7)' }}>
          Spiral is designed for 1:1 square format
        </p>
      )}
      {isPhotoBooth && exportFormat === 'landscape' && (
        <p className="ep-photo-count" style={{ color: 'rgba(240,180,80,0.7)' }}>
          Best with Square or Portrait format
        </p>
      )}

      {/* Photo count */}
      <PhotoCount count={photoCount} />

      {/* Background */}
      <div style={{ marginBottom: 4 }}>
        <BgToggle bgColor={bgColor} onBgChange={onBgChange} />
      </div>

      {/* Rounded Corners — above Composition */}
      <CornersToggle on={corner > 0} onClick={toggleCorners} />

      {/* Composition — hidden for Photo Booth and Cube */}
      {!isPhotoBooth && !isCube && (
        <>
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
            {!isMainStage && !isSpiral && (
              <NumberField label="Corners" value={controls.corners} min={0} max={0.5} step={0.01} onChange={v => setCtrl('corners', v)} />
            )}
            <NumberField
              label="Speed"
              value={controls.speed}
              min={0.1}
              max={3.0}
              step={0.05}
              onChange={v => setCtrl('speed', v)}
            />
          </div>
        </>
      )}

      {/* Video Length */}
      <h3 className="ep-section">Video Length</h3>
      <div className="ep-panel">
        <NumberField label="Loop" value={loopS} min={1} max={24} step={0.1} onChange={onLoopChange} unit=" s" />
        <LoopTimeline loopS={loopS} />
      </div>
    </div>
  )
}
