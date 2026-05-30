import { useRef } from 'react'
import 'remixicon/fonts/remixicon.css'

const MAX = 100

export default function UploadPanel({ onLoad, count, loading }) {
  const inputRef = useRef(null)

  function openPicker() {
    inputRef.current?.click()
  }

  function handleChange(e) {
    const files = Array.from(e.target.files ?? [])
      .filter(f => f.type.startsWith('image/'))
      .slice(0, MAX)
    if (!files.length) return
    const urls = files.map(f => URL.createObjectURL(f))
    onLoad(urls)
    e.target.value = ''
  }

  const hasPhotos = count > 0

  return (
    <>
      {/* Hidden file input — no capture attr so gallery opens, not camera */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        style={{ display: 'none' }}
      />

      <div style={s.root}>
        {hasPhotos ? (
          /* ── After load: compact pill ── */
          <div style={s.pill}>
            <span style={s.pillCount}>{count}</span>
            <span style={s.pillLabel}>photo{count !== 1 ? 's' : ''}</span>
            <div style={s.divider} />
            <button style={s.pillBtn} onClick={openPicker} disabled={loading}>
              {loading
                ? <i className="ri-loader-4-line" style={s.spin} />
                : <><i className="ri-refresh-line" style={{ marginRight: 5 }} />Change</>
              }
            </button>
          </div>
        ) : (
          /* ── Initial state: main CTA ── */
          <div style={s.card}>
            <button style={s.mainBtn} onClick={openPicker} disabled={loading}>
              <div style={s.iconWrap}>
                {loading
                  ? <i className="ri-loader-4-line" style={{ ...s.spin, fontSize: 22 }} />
                  : <i className="ri-image-2-line" style={{ fontSize: 22 }} />
                }
              </div>
              <div style={s.mainBtnText}>
                <span style={s.mainLabel}>Select from Camera Roll</span>
                <span style={s.mainSub}>Up to {MAX} photos</span>
              </div>
              <i className="ri-arrow-right-s-line" style={s.chevron} />
            </button>

            <div style={s.dividerH} />

            <button style={s.autoBtn} onClick={openPicker} disabled={loading}>
              <i className="ri-flashlight-line" style={{ marginRight: 8, fontSize: 15 }} />
              Auto-fill — select all &amp; we'll pick the first {MAX}
            </button>
          </div>
        )}
      </div>
    </>
  )
}

const s = {
  root: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 'calc(100vw - 40px)',
    maxWidth: 400,
    pointerEvents: 'none',
  },

  // ── Card (initial) ──
  card: {
    pointerEvents: 'auto',
    width: '100%',
    background: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0,0,0,0.07)',
    borderRadius: 20,
    boxShadow: '0 8px 40px rgba(0,0,0,0.09)',
    overflow: 'hidden',
  },
  mainBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    width: '100%',
    padding: '18px 20px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
  },
  mainBtnText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  mainLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: '#000',
    letterSpacing: '-0.01em',
    fontFamily: 'inherit',
  },
  mainSub: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'inherit',
  },
  chevron: {
    fontSize: 20,
    color: '#ccc',
    flexShrink: 0,
  },
  dividerH: {
    height: 1,
    background: 'rgba(0,0,0,0.06)',
    margin: '0 20px',
  },
  autoBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '15px 20px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: '#888',
    fontFamily: 'inherit',
    letterSpacing: '0.01em',
  },

  // ── Pill (after load) ──
  pill: {
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: 'rgba(255,255,255,0.9)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0,0,0,0.07)',
    borderRadius: 50,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: '10px 14px 10px 16px',
  },
  pillCount: {
    fontSize: 15,
    fontWeight: 700,
    color: '#000',
    fontFamily: 'inherit',
  },
  pillLabel: {
    fontSize: 13,
    color: '#aaa',
    fontFamily: 'inherit',
  },
  divider: {
    width: 1,
    height: 16,
    background: 'rgba(0,0,0,0.1)',
  },
  pillBtn: {
    display: 'flex',
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: '#555',
    padding: '4px 6px',
    borderRadius: 8,
    fontFamily: 'inherit',
  },

  // ── Shared ──
  spin: {
    animation: 'spin 0.75s linear infinite',
    display: 'block',
  },
}
