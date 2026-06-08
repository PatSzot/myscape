import { useState } from 'react'
import 'remixicon/fonts/remixicon.css'
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
    state === 'copied'  ? 'Link Copied!'   :
    state === 'error'   ? 'Copy link manually:' :
                          'Create a share link'

  return (
    <div className="ep-dock">
      <div className="ep-toolbar" style={{ justifyContent: 'center', gap: 0 }}>
        <button
          className={`ep-cta ep-cta--share${state === 'copied' ? ' ep-cta--success' : ''}`}
          disabled={state === 'sharing'}
          onClick={handleShare}
          style={{ flex: 1 }}
        >
          {state === 'idle' && (
            <i className="ri-global-line" style={{ fontSize: 18, flexShrink: 0 }} />
          )}
          {state === 'sharing' && (
            <i className="ri-loader-4-line" style={{ fontSize: 18, flexShrink: 0, opacity: 0.6 }} />
          )}
          {state === 'copied' && (
            <i className="ri-check-line" style={{ fontSize: 18, flexShrink: 0 }} />
          )}
          {state === 'error' && (
            <i className="ri-global-line" style={{ fontSize: 18, flexShrink: 0 }} />
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
