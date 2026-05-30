import { useRef, useState, useEffect } from 'react'
import 'remixicon/fonts/remixicon.css'

const MAX_PER_PICK = 100
const MONO     = '"IBM Plex Mono", monospace'
const HEADLINE = '"IBM Plex Sans", sans-serif'

export default function UploadPanel({
  onLoad, onDelete, images, progress,
  theme, onThemeChange,
  corners, onCornersChange,
}) {
  const photoInputRef = useRef(null)
  const [isEditing,  setIsEditing]  = useState(false)
  const [showTheme,  setShowTheme]  = useState(false)
  const count     = images.length
  const isLoading = progress !== null
  const isDark    = theme === 'dark'

  useEffect(() => { if (count === 0) setIsEditing(false) }, [count])

  function openPhotoPicker() { if (!isLoading) photoInputRef.current?.click() }

  function handlePhotoChange(e) {
    const files = Array.from(e.target.files ?? [])
      .filter(f => f.type.startsWith('image/'))
      .slice(0, MAX_PER_PICK)
    if (!files.length) return
    onLoad(files)
    e.target.value = ''
  }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0

  // ── Theme-aware style helpers ──────────────────────────────────────────────
  const glass = {
    background:          isDark ? 'rgba(30,28,20,0.92)' : 'rgba(255,255,255,0.92)',
    backdropFilter:      'blur(20px)',
    WebkitBackdropFilter:'blur(20px)',
    border:              isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.07)',
    boxShadow:           isDark ? '0 8px 40px rgba(0,0,0,0.4)' : '0 8px 40px rgba(0,0,0,0.09)',
  }
  const textPrimary   = isDark ? '#f0ede4' : '#000'
  const textSecondary = isDark ? '#888'    : '#aaa'
  const textMuted     = isDark ? '#555'    : '#ccc'
  const dividerColor  = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const btnBg         = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'
  const iconBg        = isDark ? '#f0ede4' : '#000'
  const iconColor     = isDark ? '#191812' : '#fff'

  // ── Theme section (shared between empty and loaded states) ───────────────
  const themeSection = (
    <>
      <button style={s.mainBtn} onClick={() => setShowTheme(v => !v)}>
        <div style={{ ...s.iconWrap, background: iconBg, color: iconColor }}>
          <i className={isDark ? 'ri-moon-line' : 'ri-sun-line'} style={{ fontSize: 22 }} />
        </div>
        <div style={s.mainText}>
          <span style={{ ...s.mainLabel, fontFamily: HEADLINE, color: textPrimary }}>Theme</span>
          <span style={{ ...s.mainSub, fontFamily: MONO, color: textSecondary }}>{isDark ? 'DARK MODE' : 'LIGHT MODE'}</span>
        </div>
        <i className={showTheme ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} style={{ ...s.chevron, color: textMuted }} />
      </button>

      {showTheme && (<>
        <div style={{ padding: '0 16px 14px', display: 'flex', gap: 8 }}>
          <button onClick={() => onThemeChange('light')} style={{ ...s.themeOption, fontFamily: MONO,
            background: !isDark ? textPrimary : btnBg,
            color: !isDark ? '#fff' : textSecondary,
            border: `1px solid ${!isDark ? textPrimary : dividerColor}`,
          }}>
            <i className="ri-sun-line" style={{ marginRight: 6 }} />LIGHT
          </button>
          <button onClick={() => onThemeChange('dark')} style={{ ...s.themeOption, fontFamily: MONO,
            background: isDark ? textPrimary : btnBg,
            color: isDark ? '#191812' : textSecondary,
            border: `1px solid ${isDark ? textPrimary : dividerColor}`,
          }}>
            <i className="ri-moon-line" style={{ marginRight: 6 }} />DARK
          </button>
        </div>

        <div style={{ ...s.dividerH, background: dividerColor }} />

        <button style={s.mainBtn} onClick={() => onCornersChange(corners === 'rounded' ? 'sharp' : 'rounded')}>
          <div style={{ ...s.iconWrap, background: iconBg, color: iconColor }}>
            <i className="ri-checkbox-blank-line" style={{ fontSize: 22 }} />
          </div>
          <div style={s.mainText}>
            <span style={{ ...s.mainLabel, fontFamily: HEADLINE, color: textPrimary }}>Corners</span>
            <span style={{ ...s.mainSub, fontFamily: MONO, color: textSecondary }}>{corners === 'rounded' ? 'SLIGHTLY ROUNDED' : 'FULLY SQUARE'}</span>
          </div>
          <div style={{ ...s.valuePill, fontFamily: MONO, background: btnBg, color: textSecondary }}>
            {corners === 'rounded' ? 'ROUND' : 'SQUARE'}
          </div>
        </button>
      </>)}
    </>
  )

  return (
    <>
      <input ref={photoInputRef} type="file" accept="image/*" multiple onChange={handlePhotoChange}
        style={HIDDEN} />

      <div style={s.root}>

        {/* ── Edit panel ──────────────────────────────────────────────────── */}
        {isEditing && !isLoading && count > 0 && (
          <div style={{ ...s.editCard, ...glass }}>
            <button style={s.addMoreRow} onClick={openPhotoPicker}>
              <div style={{ ...s.addMoreIcon, background: iconBg, color: iconColor }}>
                <i className="ri-add-line" style={{ fontSize: 17 }} />
              </div>
              <span style={{ ...s.addMoreLabel, color: textPrimary, fontFamily: HEADLINE }}>Add more photos</span>
              <i className="ri-arrow-right-s-line" style={{ fontSize: 18, color: textMuted }} />
            </button>
            <div style={{ ...s.listDivider, background: dividerColor }} />
            <div style={s.list}>
              {images.map(({ url, meta }, i) => (
                <div key={url} style={{ ...s.listItem, borderBottomColor: dividerColor }}>
                  <img src={url} alt="" style={s.thumb} />
                  <div style={s.itemMeta}>
                    <span style={{ ...s.itemDate, fontFamily: MONO, color: textPrimary }}>
                      {meta?.date ? meta.date.toUpperCase() : `PHOTO ${i + 1}`}
                    </span>
                    {meta?.location && (
                      <span style={{ ...s.itemLocation, fontFamily: MONO, color: textSecondary }}>
                        {meta.location.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button style={{ ...s.deleteBtn, background: btnBg, color: textSecondary }} onClick={() => onDelete(url)}>
                    <i className="ri-close-line" style={{ fontSize: 15 }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Loading progress ─────────────────────────────────────────────── */}
        {isLoading && (
          <div style={{ ...s.card, ...glass }}>
            <div style={s.progressHeader}>
              <i className="ri-image-2-line" style={{ fontSize: 15, color: textSecondary }} />
              <span style={{ ...s.progressLabel, fontFamily: MONO, color: textPrimary }}>LOADING TEXTURES</span>
              <span style={{ ...s.progressCount, fontFamily: MONO, color: textSecondary }}>{progress.done} / {progress.total}</span>
            </div>
            <div style={{ ...s.progressTrack, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
              <div style={{ ...s.progressFill, width: `${pct}%`, background: textPrimary }} />
            </div>
          </div>
        )}

        {/* ── Loaded pill ──────────────────────────────────────────────────── */}
        {!isLoading && count > 0 && (
          <div style={{ ...s.pill, ...glass }}>
            <i className="ri-image-2-line" style={{ fontSize: 14, color: textSecondary }} />
            <span style={{ ...s.pillCount, fontFamily: HEADLINE, color: textPrimary }}>{count}</span>
            <span style={{ ...s.pillLabel, fontFamily: MONO, color: textSecondary }}>{count === 1 ? 'PHOTO' : 'PHOTOS'}</span>
            <div style={{ ...s.pillDivider, background: dividerColor }} />
            <button style={{ ...s.editBtn, fontFamily: MONO, color: isDark ? '#bbb' : '#444' }} onClick={() => setIsEditing(v => !v)}>
              {isEditing
                ? <><i className="ri-check-line" style={{ marginRight: 4 }} />DONE</>
                : <><i className="ri-edit-line"  style={{ marginRight: 4 }} />EDIT</>
              }
            </button>
          </div>
        )}

        {/* ── Bottom card — Camera Roll + Auto-fill (empty only) + Theme (always) ── */}
        {!isLoading && (
          <div style={{ ...s.card, ...glass }}>
            {count === 0 && (
              <>
                <button style={s.mainBtn} onClick={openPhotoPicker}>
                  <div style={{ ...s.iconWrap, background: iconBg, color: iconColor }}>
                    <i className="ri-image-2-line" style={{ fontSize: 22 }} />
                  </div>
                  <div style={s.mainText}>
                    <span style={{ ...s.mainLabel, fontFamily: HEADLINE, color: textPrimary }}>Select from Camera Roll</span>
                    <span style={{ ...s.mainSub, fontFamily: MONO, color: textSecondary }}>UP TO {MAX_PER_PICK} PHOTOS</span>
                  </div>
                  <i className="ri-arrow-right-s-line" style={{ ...s.chevron, color: textMuted }} />
                </button>

                <div style={{ ...s.dividerH, background: dividerColor }} />

                <button style={{ ...s.secondaryRow, fontFamily: MONO, color: textSecondary }} onClick={openPhotoPicker}>
                  <i className="ri-flashlight-line" style={{ marginRight: 8, fontSize: 14 }} />
                  AUTO-FILL — SELECT ALL &amp; WE'LL USE THE FIRST {MAX_PER_PICK}
                </button>

                <div style={{ ...s.dividerH, background: dividerColor }} />
              </>
            )}

            {themeSection}
          </div>
        )}

      </div>
    </>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const HIDDEN = {
  position: 'fixed', top: '-200px', left: '-200px',
  opacity: 0, width: '1px', height: '1px', pointerEvents: 'none',
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
  editCard:    { pointerEvents: 'auto', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  addMoreRow:  { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', flexShrink: 0 },
  addMoreIcon: { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  addMoreLabel:{ flex: 1, fontSize: 15, fontWeight: 500, letterSpacing: '-0.01em' },
  listDivider: { height: 1, flexShrink: 0 },
  list:        { overflowY: 'auto', maxHeight: '52vh', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' },
  listItem:    { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderBottom: '1px solid' },
  thumb:       { width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0, background: '#f0efec' },
  itemMeta:    { flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  itemDate:    { fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemLocation:{ fontSize: 10, letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  deleteBtn:   { width: 28, height: 28, borderRadius: 7, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 },
  card:        { pointerEvents: 'auto', borderRadius: 20, overflow: 'hidden' },
  progressHeader: { display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px 10px' },
  progressLabel:  { flex: 1, fontSize: 11, fontWeight: 500, letterSpacing: '0.08em' },
  progressCount:  { fontSize: 11, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' },
  progressTrack:  { margin: '0 20px 16px', height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill:   { height: '100%', borderRadius: 2, transition: 'width 0.15s ease-out' },
  mainBtn:     { display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '18px 20px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' },
  iconWrap:    { width: 42, height: 42, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  mainText:    { flex: 1, display: 'flex', flexDirection: 'column', gap: 3 },
  mainLabel:   { fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em' },
  mainSub:     { fontSize: 10, letterSpacing: '0.08em' },
  chevron:     { fontSize: 20, flexShrink: 0 },
  dividerH:    { height: 1, margin: '0 20px' },
  secondaryRow:{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 10, letterSpacing: '0.07em' },
  pill:        { pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 50, padding: '10px 12px 10px 14px', alignSelf: 'center' },
  pillCount:   { fontSize: 16, fontWeight: 500, letterSpacing: '-0.01em' },
  pillLabel:   { fontSize: 10, letterSpacing: '0.08em' },
  pillDivider: { width: 1, height: 14, margin: '0 2px' },
  pillIconBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 6px', borderRadius: 8 },
  editBtn:     { display: 'flex', alignItems: 'center', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 10, padding: '4px 8px', borderRadius: 8, letterSpacing: '0.08em', fontWeight: 500 },
  themeOption: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', borderRadius: 10, cursor: 'pointer', fontSize: 10, letterSpacing: '0.08em', fontWeight: 500 },
  valuePill:   { fontSize: 9, letterSpacing: '0.08em', fontWeight: 500, padding: '4px 8px', borderRadius: 6, flexShrink: 0 },
}
