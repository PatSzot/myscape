import { useState, useRef } from 'react'
import { startExport } from './exportManager.js'

const MONO     = '"IBM Plex Mono", monospace'
const HEADLINE = '"Zalando Sans SemiExpanded", sans-serif'

const STYLES = [
  { key: 'pile',     label: 'Pile' },
  { key: 'carousel', label: 'Carousel' },
  { key: 'helix',    label: 'Helix' },
]

export default function ExportPanel({ images, theme, corners }) {
  const [style,    setStyle]    = useState('pile')
  const [duration, setDuration] = useState(15)
  const [status,   setStatus]   = useState('idle')   // idle | recording | ready | error
  const [progress, setProgress] = useState(0)
  const [errMsg,   setErrMsg]   = useState('')
  const resultRef  = useRef(null)   // { blob, ext }

  const isDark        = theme === 'dark'
  const textPrimary   = isDark ? '#f0ede4' : '#000'
  const textSecondary = isDark ? '#888'    : '#aaa'
  const textMuted     = isDark ? '#555'    : '#ccc'
  const dividerColor  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const bgColor       = isDark ? '#191812' : '#F5F3EC'
  const pillBg        = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const pillActiveBg  = textPrimary
  const pillActiveCol = isDark ? '#191812' : '#ffffff'

  const isRecording = status === 'recording'
  const isReady     = status === 'ready'
  const hasImages   = images.length > 0

  async function handleExport() {
    if (isRecording || !hasImages) return
    setStatus('recording')
    setProgress(0)
    resultRef.current = null
    setErrMsg('')
    try {
      const result = await startExport({
        images,
        style,
        durationSec: duration,
        bgColor,
        onProgress: p => setProgress(p),
      })
      resultRef.current = result
      setStatus('ready')
    } catch (err) {
      const msg = err.message === 'NO_MEDIARECORDER'
        ? 'Video export requires Chrome, Firefox, or Edge.'
        : (err.message || 'Export failed.')
      setErrMsg(msg)
      setStatus('error')
    }
  }

  async function handleSave() {
    if (!resultRef.current) return
    const { blob, ext } = resultRef.current
    const filename = `myscape-${style}.${ext}`
    const file = new File([blob], filename, { type: blob.type })

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Myscape' })
        setStatus('idle')
        return
      } catch (e) {
        if (e.name === 'AbortError') return
      }
    }

    const url = URL.createObjectURL(blob)
    const a   = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
    setStatus('idle')
  }

  const progressPct = Math.round(progress * 100)
  const elapsedSec  = Math.round(progress * duration)

  return (
    <div style={{ pointerEvents: 'auto' }}>

      {/* Style selector */}
      <div style={{ ...row, padding: '14px 20px' }}>
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', color: textSecondary, minWidth: 88 }}>
          STYLE
        </span>
        <div style={{ display: 'flex', gap: 6, flex: 1 }}>
          {STYLES.map(({ key, label }) => {
            const active = style === key
            return (
              <button key={key}
                onClick={() => { if (!isRecording) setStyle(key) }}
                style={{
                  flex: 1, padding: '6px 0', border: 'none', cursor: isRecording ? 'default' : 'pointer',
                  borderRadius: 8,
                  background: active ? pillActiveBg : pillBg,
                  color:      active ? pillActiveCol : textSecondary,
                  fontFamily: MONO, fontSize: 10, fontWeight: 500,
                  letterSpacing: '0.06em',
                  transition: 'background 0.15s, color 0.15s',
                  opacity: isRecording && !active ? 0.4 : 1,
                }}>
                {label.toUpperCase()}
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
        {/* Status indicator */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.06em', color: statusColor(status, isDark) }}>
            {statusLabel(status, elapsedSec, duration, errMsg)}
          </span>
          {isRecording && (
            <div style={{ height: 3, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 2,
                background: textPrimary,
                width: `${progressPct}%`,
                transition: 'width 0.3s linear',
              }} />
            </div>
          )}
        </div>

        {/* Button */}
        <button
          onClick={isReady ? handleSave : handleExport}
          disabled={isRecording || !hasImages}
          style={{
            marginLeft: 14,
            padding: '8px 16px',
            border: 'none', borderRadius: 10,
            background: isReady ? textPrimary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
            color: isReady ? (isDark ? '#191812' : '#fff') : (hasImages ? textPrimary : textMuted),
            fontFamily: MONO, fontSize: 10, fontWeight: 500,
            letterSpacing: '0.07em',
            cursor: isRecording || !hasImages ? 'default' : 'pointer',
            opacity: isRecording || !hasImages ? 0.5 : 1,
            whiteSpace: 'nowrap',
            transition: 'background 0.2s, color 0.2s',
          }}>
          {isReady ? 'SAVE VIDEO' : isRecording ? 'EXPORTING…' : 'EXPORT'}
        </button>
      </div>

      {!hasImages && (
        <div style={{ padding: '0 20px 14px', fontFamily: MONO, fontSize: 10, color: textMuted, letterSpacing: '0.06em' }}>
          UPLOAD PHOTOS TO ENABLE EXPORT
        </div>
      )}
    </div>
  )
}

function statusLabel(status, elapsed, total, errMsg) {
  if (status === 'idle')      return `LOOP: ${total}s`
  if (status === 'recording') return `RECORDING… ${elapsed}s / ${total}s`
  if (status === 'ready')     return 'READY TO SAVE ✓'
  if (status === 'error')     return errMsg || 'EXPORT FAILED'
  return ''
}

function statusColor(status, isDark) {
  if (status === 'ready') return isDark ? '#a8e6b0' : '#2a7a38'
  if (status === 'error') return '#e05050'
  return isDark ? '#888' : '#aaa'
}

const row = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
}
