import { useState } from 'react'

const MONO     = '"IBM Plex Mono", monospace'
const HEADLINE = '"Zalando Sans SemiExpanded", sans-serif'

const SIZES = [
  { key: '1:1',   label: '1:1',     width: 1080, height: 1080 },
  { key: '16:9',  label: '16:9',    width: 1920, height: 1080 },
  { key: '9:16',  label: '9:16',    width: 1080, height: 1920 },
]

export default function ExportPanel({ theme, presetId, hasPhotos, onExport }) {
  const [sizeKey,   setSizeKey]  = useState('1:1')
  const [duration,  setDuration] = useState(10)
  const [status,    setStatus]   = useState('idle')   // idle | recording | done | error
  const [progress,  setProgress] = useState(0)
  const [errMsg,    setErrMsg]   = useState('')

  const isDark        = theme === 'dark'
  const textPrimary   = isDark ? '#f0ede4' : '#000'
  const textSecondary = isDark ? '#888'    : '#aaa'
  const textMuted     = isDark ? '#555'    : '#ccc'
  const dividerColor  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const pillBg        = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const pillActiveBg  = textPrimary
  const pillActiveCol = isDark ? '#191812' : '#ffffff'

  const isExplore   = presetId === 'explore'
  const isRecording = status === 'recording'
  const canExport   = hasPhotos && !isExplore && !isRecording

  async function handleExport() {
    if (!canExport) return
    setStatus('recording')
    setProgress(0)
    setErrMsg('')

    const size = SIZES.find(s => s.key === sizeKey) || SIZES[0]

    try {
      await onExport({
        canvasSize:      { width: size.width, height: size.height },
        durationSeconds: duration,
        onProgress:      p => setProgress(p),
      })
      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      const msg = err.message === 'NO_MEDIARECORDER'
        ? 'Video export requires Chrome, Firefox, or Edge.'
        : (err.message || 'Export failed.')
      setErrMsg(msg)
      setStatus('error')
    }
  }

  const progressPct = Math.round(progress * 100)
  const elapsedSec  = Math.round(progress * duration)

  return (
    <div style={{ pointerEvents: 'auto' }}>

      {/* Canvas size selector */}
      <div style={{ ...row, padding: '14px 20px' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', color: textSecondary, minWidth: 88 }}>
          SIZE
        </span>
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {SIZES.map(({ key, label }) => {
            const active = sizeKey === key
            return (
              <button key={key}
                onClick={() => { if (!isRecording) setSizeKey(key) }}
                style={{
                  flex: 1, padding: '6px 0', border: 'none',
                  cursor: isRecording ? 'default' : 'pointer',
                  borderRadius: 8,
                  background: active ? pillActiveBg : pillBg,
                  color:      active ? pillActiveCol : textSecondary,
                  fontFamily: MONO, fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.06em',
                  transition: 'background 0.15s, color 0.15s',
                  opacity: isRecording && !active ? 0.4 : 1,
                }}>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Duration slider */}
      <div style={{ ...row, padding: '10px 20px 14px' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', color: textSecondary, minWidth: 88 }}>
          DURATION
        </span>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            type="range" min={5} max={60} step={1}
            value={duration}
            disabled={isRecording}
            onChange={e => setDuration(Number(e.target.value))}
            style={{ width: '100%', accentColor: textPrimary, cursor: isRecording ? 'default' : 'pointer' }}
          />
          <span style={{ fontFamily: MONO, fontSize: 10, color: textMuted, letterSpacing: '0.06em' }}>
            {duration}s loop
          </span>
        </div>
      </div>

      {/* Status + export button */}
      <div style={{ ...row, padding: '12px 20px 16px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: statusColor(status, isDark) }}>
            {statusLabel(status, elapsedSec, duration, errMsg, isExplore, hasPhotos)}
          </span>
          {isRecording && (
            <div style={{ height: 3, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2, background: textPrimary,
                width: `${progressPct}%`, transition: 'width 0.3s linear',
              }} />
            </div>
          )}
        </div>

        <button
          onClick={handleExport}
          disabled={!canExport}
          style={{
            marginLeft: 14,
            padding: '8px 16px',
            border: 'none', borderRadius: 10,
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            color: canExport ? textPrimary : textMuted,
            fontFamily: MONO, fontSize: 10, fontWeight: 500,
            letterSpacing: '0.07em',
            cursor: canExport ? 'pointer' : 'default',
            opacity: canExport ? 1 : 0.5,
            whiteSpace: 'nowrap',
            transition: 'background 0.2s, color 0.2s',
          }}>
          {isRecording ? 'EXPORTING…' : 'EXPORT'}
        </button>
      </div>

    </div>
  )
}

function statusLabel(status, elapsed, total, errMsg, isExplore, hasPhotos) {
  if (isExplore)        return 'SWITCH PRESET TO EXPORT'
  if (!hasPhotos)       return 'UPLOAD PHOTOS TO EXPORT'
  if (status === 'idle')      return `LOOP: ${total}s`
  if (status === 'recording') return `RECORDING… ${elapsed}s / ${total}s`
  if (status === 'done')      return 'SAVED ✓'
  if (status === 'error')     return errMsg || 'EXPORT FAILED'
  return ''
}

function statusColor(status, isDark) {
  if (status === 'done')  return isDark ? '#a8e6b0' : '#2a7a38'
  if (status === 'error') return '#e05050'
  return isDark ? '#888' : '#aaa'
}

const row = { display: 'flex', alignItems: 'center', gap: 14 }
