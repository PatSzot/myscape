import { useRef, useState, useEffect } from 'react'
import 'remixicon/fonts/remixicon.css'

const MAX_PER_PICK = 100

export default function UploadPanel({ onLoad, onDelete, allUrls, progress }) {
  const inputRef = useRef(null)
  const [isEditing, setIsEditing] = useState(false)
  const count = allUrls.length
  const isLoading = progress !== null

  // Close edit panel if all photos are deleted
  useEffect(() => {
    if (count === 0) setIsEditing(false)
  }, [count])

  function openPicker() {
    if (isLoading) return
    inputRef.current?.click()
  }

  function handleChange(e) {
    const files = Array.from(e.target.files ?? [])
      .filter(f => f.type.startsWith('image/'))
      .slice(0, MAX_PER_PICK)
    if (!files.length) return
    onLoad(files.map(f => URL.createObjectURL(f)))
    e.target.value = ''
  }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleChange}
        style={{
          position: 'fixed',
          top: '-200px',
          left: '-200px',
          opacity: 0,
          width: '1px',
          height: '1px',
          pointerEvents: 'none',
        }}
      />

      <div style={s.root}>

        {/* ── Edit panel (above pill) ───────────────────────────────── */}
        {isEditing && !isLoading && count > 0 && (
          <div style={s.editCard}>

            {/* Add more row */}
            <button style={s.addMoreRow} onClick={openPicker}>
              <div style={s.addMoreIcon}>
                <i className="ri-add-line" style={{ fontSize: 17 }} />
              </div>
              <span style={s.addMoreLabel}>Add more photos</span>
              <i className="ri-arrow-right-s-line" style={{ fontSize: 18, color: '#ccc' }} />
            </button>

            <div style={s.listDivider} />

            {/* Scrollable photo list */}
            <div style={s.list}>
              {allUrls.map((url, i) => (
                <div key={url} style={s.listItem}>
                  <img
                    src={url}
                    alt={`Photo ${i + 1}`}
                    style={s.thumb}
                  />
                  <span style={s.itemLabel}>Photo {i + 1}</span>
                  <button
                    style={s.deleteBtn}
                    onClick={() => onDelete(url)}
                    aria-label={`Delete photo ${i + 1}`}
                  >
                    <i className="ri-close-line" style={{ fontSize: 16 }} />
                  </button>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ── Loading progress ──────────────────────────────────────── */}
        {isLoading && (
          <div style={s.card}>
            <div style={s.progressHeader}>
              <i className="ri-image-2-line" style={{ fontSize: 15, color: '#aaa' }} />
              <span style={s.progressLabel}>Loading textures…</span>
              <span style={s.progressCount}>{progress.done} / {progress.total}</span>
            </div>
            <div style={s.progressTrack}>
              <div style={{ ...s.progressFill, width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* ── Loaded pill ───────────────────────────────────────────── */}
        {!isLoading && count > 0 && (
          <div style={s.pill}>
            <i className="ri-image-2-line" style={{ fontSize: 14, color: '#bbb' }} />
            <span style={s.pillCount}>{count}</span>
            <span style={s.pillLabel}>photo{count !== 1 ? 's' : ''}</span>
            <div style={s.pillDivider} />
            <button style={s.editBtn} onClick={() => setIsEditing(v => !v)}>
              {isEditing
                ? <><i className="ri-check-line" style={{ marginRight: 4 }} />Done</>
                : <><i className="ri-edit-line" style={{ marginRight: 4 }} />Edit</>
              }
            </button>
          </div>
        )}

        {/* ── Initial CTA ───────────────────────────────────────────── */}
        {!isLoading && count === 0 && (
          <div style={s.card}>
            <button style={s.mainBtn} onClick={openPicker}>
              <div style={s.iconWrap}>
                <i className="ri-image-2-line" style={{ fontSize: 22 }} />
              </div>
              <div style={s.mainText}>
                <span style={s.mainLabel}>Select from Camera Roll</span>
                <span style={s.mainSub}>Up to {MAX_PER_PICK} photos</span>
              </div>
              <i className="ri-arrow-right-s-line" style={s.chevron} />
            </button>
            <div style={s.dividerH} />
            <button style={s.autoBtn} onClick={openPicker}>
              <i className="ri-flashlight-line" style={{ marginRight: 8, fontSize: 15 }} />
              Auto-fill — select all &amp; we'll use the first {MAX_PER_PICK}
            </button>
          </div>
        )}

      </div>
    </>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const glass = {
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(0,0,0,0.07)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.09)',
}

const s = {
  root: {
    position: 'fixed',
    bottom: 32,
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    width: 'calc(100vw - 40px)',
    maxWidth: 400,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
  },

  // ── Edit panel ──
  editCard: {
    ...glass,
    pointerEvents: 'auto',
    borderRadius: 20,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  addMoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '14px 16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    flexShrink: 0,
  },
  addMoreIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
  },
  addMoreLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: 600,
    color: '#000',
    fontFamily: 'inherit',
    letterSpacing: '-0.01em',
  },
  listDivider: {
    height: 1,
    background: 'rgba(0,0,0,0.06)',
    flexShrink: 0,
  },
  list: {
    overflowY: 'auto',
    maxHeight: '52vh',
    WebkitOverflowScrolling: 'touch',
    overscrollBehavior: 'contain',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '8px 16px',
    borderBottom: '1px solid rgba(0,0,0,0.04)',
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    objectFit: 'cover',
    flexShrink: 0,
    background: '#f0efec',
  },
  itemLabel: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    fontFamily: 'inherit',
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: 'none',
    background: 'rgba(0,0,0,0.05)',
    color: '#888',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  },

  // ── Progress card ──
  card: {
    ...glass,
    pointerEvents: 'auto',
    borderRadius: 20,
    overflow: 'hidden',
  },
  progressHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '16px 20px 10px',
  },
  progressLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: 500,
    color: '#333',
    fontFamily: 'inherit',
  },
  progressCount: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'inherit',
    fontVariantNumeric: 'tabular-nums',
  },
  progressTrack: {
    margin: '0 20px 16px',
    height: 3,
    borderRadius: 2,
    background: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#000',
    borderRadius: 2,
    transition: 'width 0.15s ease-out',
  },

  // ── Initial card ──
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
  mainText: {
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

  // ── Loaded pill ──
  pill: {
    ...glass,
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderRadius: 50,
    padding: '10px 12px 10px 14px',
    alignSelf: 'center',
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
  pillDivider: {
    width: 1,
    height: 14,
    background: 'rgba(0,0,0,0.1)',
    margin: '0 2px',
  },
  editBtn: {
    display: 'flex',
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 13,
    color: '#444',
    padding: '4px 8px',
    borderRadius: 8,
    fontFamily: 'inherit',
    fontWeight: 500,
  },
}
