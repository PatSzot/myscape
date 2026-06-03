import { useState, useRef, useEffect } from 'react'
import 'remixicon/fonts/remixicon.css'

const MONO = '"IBM Plex Mono", monospace'

export default function LeftPanel({
  theme, onThemeChange,
  corner, onCornerChange,
  images, onUploadClick, onDelete, onRotate,
  onShare,
  mode, onModeChange,
}) {
  const [isOpen,   setIsOpen]   = useState(() => window.innerWidth >= 1024)
  const [copied,   setCopied]   = useState(false)
  const [copying,  setCopying]  = useState(false)
  const [shareUrl, setShareUrl] = useState(null)
  const panelRef  = useRef(null)
  const toggleRef = useRef(null)

  // Auto-open on desktop resize
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) setIsOpen(true)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close on outside click (mobile/tablet only)
  useEffect(() => {
    function handleClick(e) {
      if (window.innerWidth >= 1024) return
      if (!isOpen) return
      if (panelRef.current?.contains(e.target)) return
      if (toggleRef.current?.contains(e.target)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [isOpen])

  const isExport  = mode === 'export'
  const isDark    = theme === 'dark'
  const text      = isDark ? '#f0ede4' : '#1a1a18'
  const muted     = isDark ? 'rgba(240,237,228,0.42)' : 'rgba(26,26,24,0.38)'
  const divider   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const bg        = isDark ? '#191812' : '#F0EDE4'
  const rowBg     = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const toggleOff = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'
  const canShare  = images.length > 0 && !copying && !isExport

  async function handleShare() {
    if (!canShare) return
    setCopying(true)
    setShareUrl(null)
    try {
      const url = await onShare()
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
      } catch {
        setShareUrl(url)
      }
    } catch (err) {
      console.error('Share failed:', err)
      alert('Failed to generate share link. Please try again.')
    } finally {
      setCopying(false)
    }
  }

  function Label({ children }) {
    return (
      <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.13em', color: muted, textTransform: 'uppercase', marginBottom: 10 }}>
        {children}
      </div>
    )
  }

  function Divider() {
    return <div style={{ height: 1, background: divider, margin: '4px -16px' }} />
  }

  return (
    <>
    <button
      ref={toggleRef}
      className={`panel-toggle-btn${isOpen ? ' panel-toggle-btn--open' : ''}`}
      onClick={() => setIsOpen(o => !o)}
      aria-label={isOpen ? 'Close panel' : 'Open panel'}
    >
      <i className={`toggle-icon ri-${isOpen ? 'close' : 'menu'}-line`} />
      <span className="toggle-label">Create</span>
    </button>

    <aside ref={panelRef} className={`panel panel--left ${isOpen ? 'panel--visible' : 'panel--hidden'}`}>

      <div className="panel-scroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 16px' }}>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
          {['explore', 'export'].map(m => (
            <button key={m} onClick={() => onModeChange(m)} style={{
              flex: 1, padding: '6px 0', border: 'none', borderRadius: 5, cursor: 'pointer',
              background: mode === m ? text : rowBg,
              color: mode === m ? (isDark ? '#191812' : '#F0EDE4') : muted,
              fontFamily: MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
              transition: 'background 0.15s, color 0.15s',
            }}>
              {m}
            </button>
          ))}
        </div>

        {/* Photos */}
        <section style={{ marginBottom: 18 }}>
          <Label>Photos</Label>
          <button onClick={onUploadClick} style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '7px 10px', borderRadius: 5, border: 'none', cursor: 'pointer',
            background: rowBg, color: muted,
            fontFamily: MONO, fontSize: 10, letterSpacing: '0.07em',
          }}>
            <i className="ri-upload-2-line" style={{ fontSize: 13, color: text }} />
            {images.length > 0
              ? `${images.length} PHOTO${images.length !== 1 ? 'S' : ''} — ADD MORE`
              : 'UPLOAD PHOTOS'}
          </button>

          {images.length > 0 && (
            <div style={{ marginTop: 8, maxHeight: 148, overflowY: 'auto' }}>
              {images.map(({ url, meta }, i) => (
                <div key={url} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '4px 2px', borderBottom: `1px solid ${divider}`,
                }}>
                  <img src={url} alt="" style={{ width: 28, height: 28, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontFamily: MONO, fontSize: 9, color: muted, letterSpacing: '0.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {meta?.date ? meta.date.toUpperCase() : `PHOTO ${i + 1}`}
                  </span>
                  <button onClick={() => onRotate(url)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px 3px', lineHeight: 1 }}>
                    <i className="ri-arrow-right-circle-line" style={{ fontSize: 11 }} />
                  </button>
                  <button onClick={() => onDelete(url)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, padding: '2px 3px', lineHeight: 1 }}>
                    <i className="ri-close-line" style={{ fontSize: 11 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {!isExport && (
          <>
            <Divider />

            {/* Style */}
            <section style={{ margin: '16px 0' }}>
              <Label>Style</Label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, cursor: 'pointer' }}
                onClick={() => onCornerChange(corner > 0 ? 0 : 0.04)}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: muted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Rounded Corners</span>
                <Toggle on={corner > 0} text={text} bg={bg} off={toggleOff} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => onThemeChange(isDark ? 'light' : 'dark')}>
                <span style={{ fontFamily: MONO, fontSize: 9, color: muted, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Dark Mode</span>
                <Toggle on={isDark} text={text} bg={bg} off={toggleOff} />
              </div>
            </section>
          </>
        )}

      </div>

      {/* Share CTA — pinned to bottom, explore mode only */}
      {!isExport && <div style={{ flexShrink: 0, padding: '12px 16px 16px' }}>

        {shareUrl && (
          <input readOnly value={shareUrl}
            onFocus={e => e.target.select()}
            onClick={e => { e.target.select(); navigator.clipboard?.writeText(shareUrl).catch(() => {}) }}
            style={{
              display: 'block', width: '100%', boxSizing: 'border-box', marginBottom: 8,
              fontFamily: MONO, fontSize: 10, color: text,
              background: rowBg, border: 'none', borderRadius: 5,
              padding: '7px 10px', outline: 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          />
        )}

        <button onClick={handleShare} disabled={!canShare} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', padding: '13px 0', borderRadius: 8, border: 'none',
          background: copied
            ? (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)')
            : text,
          color: copied ? text : (isDark ? '#191812' : '#F0EDE4'),
          fontFamily: MONO, fontSize: 11, letterSpacing: '0.09em', fontWeight: 500,
          cursor: canShare ? 'pointer' : 'default',
          opacity: !images.length ? 0.35 : 1,
          transition: 'all 0.2s',
        }}>
          <i className={`ri-${copied ? 'check' : copying ? 'loader-4' : 'link'}-line`} style={{ fontSize: 14 }} />
          {copying ? 'UPLOADING…' : copied ? 'LINK COPIED' : 'SHARE'}
        </button>

      </div>}

    </aside>
    </>
  )
}

function Toggle({ on, text, bg, off }) {
  return (
    <div style={{
      width: 32, height: 18, borderRadius: 9, flexShrink: 0, position: 'relative',
      background: on ? text : off, transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 2, width: 14, height: 14, borderRadius: '50%',
        background: on ? bg : 'rgba(255,255,255,0.5)',
        transform: on ? 'translateX(16px)' : 'translateX(2px)',
        transition: 'transform 0.2s',
      }} />
    </div>
  )
}
