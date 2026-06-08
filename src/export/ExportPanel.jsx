import NumberField from '../components/NumberField.jsx'
import BgToggle from '../components/BgToggle.jsx'
import '../styles/export.css'

function PhotoCount({ count }) {
  const text = count === 0
    ? 'No photos · drop images to begin'
    : `${count} photo${count !== 1 ? 's' : ''} loaded`
  return <p className="ep-photo-count">{text}</p>
}

export default function ExportPanel({
  presetId,
  bgColor, onBgChange,
  controls, onControlsChange,
  photoCount = 0,
}) {
  function setCtrl(key, val) {
    onControlsChange({ ...controls, [key]: val })
  }

  const isScape      = presetId === 'scape'
  const isShuffle    = presetId === 'shuffle'
  const isMainStage  = presetId === 'mainStage'
  const isSpiral     = presetId === 'spiral'
  const isPhotoBooth = presetId === 'photoBooth'
  const isCube       = presetId === 'cube'
  const is2D         = isShuffle || isMainStage || isSpiral || isPhotoBooth

  const showComposition = !isPhotoBooth && !isCube

  return (
    <div>
      {/* Photo count */}
      <PhotoCount count={photoCount} />

      {/* Background */}
      <div style={{ marginBottom: 4 }}>
        <BgToggle bgColor={bgColor} onBgChange={onBgChange} />
      </div>

      {/* Composition */}
      {showComposition && (
        <>
          <h3 className="ep-section">Composition</h3>
          <div className="ep-panel">
            {!is2D && !isScape && (
              <NumberField label="Count"  value={controls.count}  min={1}   max={100} step={1}    onChange={v => setCtrl('count', v)} />
            )}
            {!is2D && !isScape && (
              <NumberField label="Zoom"   value={controls.zoom}   min={0.4} max={3}   step={0.05} onChange={v => setCtrl('zoom', v)} />
            )}
            {!is2D && !isScape && presetId !== 'flow' && (
              <NumberField label="Radius" value={controls.radius} min={0.3} max={3}   step={0.05} onChange={v => setCtrl('radius', v)} />
            )}
            {!is2D && !isScape && (
              <NumberField label="Scale"  value={controls.scale}  min={0.2} max={2}   step={0.05} onChange={v => setCtrl('scale', v)} />
            )}
            {!isMainStage && !isSpiral && (
              <NumberField label="Corners" value={controls.corners ?? 0} min={0} max={0.5} step={0.01} onChange={v => setCtrl('corners', v)} />
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
    </div>
  )
}
