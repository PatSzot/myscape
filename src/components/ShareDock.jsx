import { useState } from 'react'
import '../styles/export.css'

export default function ShareDock({ onShare }) {
  const [state,    setState]    = useState('idle') // idle | sharing | copied | error
  const [shareUrl, setShareUrl] = useState('')

  async function handleShare() {
    setState('sharing')
    setShareUrl('')
    try {
      const url = await onShare()
      try {
        await navigator.clipboard.writeText(url)
        setState('copied')
      } catch {
        setShareUrl(url)
        setState('error')
      }
      setTimeout(() => setState('idle'), 3500)
    } catch (err) {
      console.error('Share failed:', err)
      setState('idle')
    }
  }

  const label =
    state === 'sharing' ? 'Creating link…' :
    state === 'copied'  ? 'Link Copied!' :
    state === 'error'   ? 'Copy link manually:' :
                          'Share Scape'

  return (
    <div className="ep-dock">
      <div className="ep-toolbar" style={{ justifyContent: 'center', gap: 0 }}>
        <button
          className={`ep-cta ep-cta--share${state === 'copied' ? ' ep-cta--success' : ''}`}
          disabled={state === 'sharing'}
          onClick={handleShare}
          style={{ flex: 1 }}
        >
          {state !== 'sharing' && state !== 'copied' && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ width: 16, height: 16, flexShrink: 0 }}>
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/>
              <circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
          )}
          {state === 'copied' && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ width: 16, height: 16, flexShrink: 0 }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
          {state === 'sharing' && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ width: 16, height: 16, flexShrink: 0, opacity: 0.6 }}>
              <line x1="12" y1="2" x2="12" y2="6"/>
              <line x1="12" y1="18" x2="12" y2="22"/>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/>
              <line x1="2" y1="12" x2="6" y2="12"/>
              <line x1="18" y1="12" x2="22" y2="12"/>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/>
            </svg>
          )}
          <span className="ep-cta-label">{label}</span>
        </button>
      </div>
      {state === 'error' && shareUrl && (
        <div style={{
          padding: '6px 12px 10px',
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10,
          color: 'rgba(240,237,228,0.55)',
          wordBreak: 'break-all',
          textAlign: 'center',
        }}>
          {shareUrl}
        </div>
      )}
    </div>
  )
}
