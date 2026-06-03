import 'remixicon/fonts/remixicon.css'

const MONO = '"IBM Plex Mono", monospace'

const ASPECTS = [
  { label: '16:9', value: '16:9', icon: 'ri-crop-line'    },
  { label: '1:1',  value: '1:1',  icon: 'ri-checkbox-blank-line' },
  { label: '9:16', value: '9:16', icon: 'ri-smartphone-line' },
]

const FPS_PILLS = [30, 60]

export default function BottomBar({
  theme,
  images,
  fps, onFpsChange,
  aspectRatio, onAspectChange,
  onUploadClick,
  isExporting, exportProgress,
  onExport,
}) {
  const isDark   = theme === 'dark'
  const text     = isDark ? '#f0ede4' : '#1a1a18'
  const muted    = isDark ? 'rgba(240,237,228,0.42)' : 'rgba(26,26,24,0.38)'
  const border   = isDark ? 'rgba(255,255,255,0.1)'  : 'rgba(0,0,0,0.1)'
  const pillBg   = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const activeBg = text
  const activeCol = isDark ? '#191812' : '#F0EDE4'

  const canExport = images.length > 0 && !isExporting
  const pct       = Math.round((exportProgress ?? 0) * 100)

  return (
    <div className="panel--bottom">

      {/* Thumbnail stack + count + upload */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Up to 3 stacked thumbnails */}
        <div style={{ position: 'relative', width: images.length > 0 ? 28 + Math.min(images.length - 1, 2) * 6 : 24, height: 24, flexShrink: 0 }}>
          {images.slice(0, 3).map((img, i) => (
            <img key={img.url} src={img.url} alt="" style={{
              position: 'absolute',
              left: i * 6,
              width: 24, height: 24,
              objectFit: 'cover',
              borderRadius: 4,
              border: `1px solid ${border}`,
              zIndex: 3 - i,
            }} />
          ))}
          {images.length === 0 && (
            <div style={{
              width: 24, height: 24, borderRadius: 4,
              border: `1px dashed ${border}`,
              background: pillBg,
            }} />
          )}
        </div>
        <span style={{ fontFamily: MONO, fontSize: 9, color: muted, letterSpacing: '0.06em', minWidth: 18 }}>
          {images.length > 0 ? `${images.length}` : '0'}
        </span>
        <button onClick={onUploadClick} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: muted, padding: '2px 4px', lineHeight: 1,
          display: 'flex', alignItems: 'center',
        }}>
          <i className="ri-add-line" style={{ fontSize: 14 }} />
        </button>
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 16, background: border, flexShrink: 0 }} />

      {/* Aspect ratio */}
      <div style={{ display: 'flex', gap: 4 }}>
        {ASPECTS.map(({ label, value, icon }) => {
          const active = aspectRatio === value
          return (
            <button key={value} onClick={() => onAspectChange(value)}
              title={label}
              style={{
                width: 28, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: active ? activeBg : pillBg,
                color: active ? activeCol : muted,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s, color 0.15s',
              }}>
              <i className={icon} style={{ fontSize: 13 }} />
            </button>
          )
        })}
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 16, background: border, flexShrink: 0 }} />

      {/* FPS pills */}
      <div style={{ display: 'flex', gap: 4 }}>
        {FPS_PILLS.map(val => {
          const active = fps === val
          return (
            <button key={val} onClick={() => onFpsChange(val)} style={{
              padding: '4px 8px', border: 'none', borderRadius: 6, cursor: 'pointer',
              background: active ? activeBg : pillBg,
              color: active ? activeCol : muted,
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em',
              transition: 'background 0.15s, color 0.15s',
            }}>
              {val}
            </button>
          )
        })}
      </div>

      {/* Separator */}
      <div style={{ width: 1, height: 16, background: border, flexShrink: 0 }} />

      {/* Export MP4 button with progress fill */}
      <button
        onClick={canExport ? onExport : undefined}
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '7px 16px',
          border: 'none', borderRadius: 8,
          background: isExporting
            ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)')
            : (canExport ? text : pillBg),
          color: isExporting ? text : (canExport ? activeCol : muted),
          fontFamily: MONO, fontSize: 10, letterSpacing: '0.09em', fontWeight: 500,
          cursor: canExport ? 'pointer' : 'default',
          opacity: images.length === 0 ? 0.38 : 1,
          transition: 'background 0.2s, color 0.2s',
          whiteSpace: 'nowrap',
        }}
      >
        {/* Progress fill overlay */}
        {isExporting && (
          <div style={{
            position: 'absolute', inset: 0, left: 0, top: 0,
            width: `${pct}%`, background: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)',
            transition: 'width 0.3s linear',
            borderRadius: 8,
          }} />
        )}
        <span style={{ position: 'relative', zIndex: 1 }}>
          {isExporting ? `EXPORTING ${pct}%` : 'EXPORT MP4'}
        </span>
      </button>

    </div>
  )
}
