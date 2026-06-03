import { useState, useRef } from 'react'

const SWATCHES = ['#000000', '#ffffff']

export default function BgToggle({ bgColor, onBgChange }) {
  const [editingHex, setEditingHex] = useState(false)
  const [hexDraft,   setHexDraft]   = useState('')
  const inputRef = useRef(null)

  const activeIndex = SWATCHES.indexOf(bgColor)

  function commitHex() {
    let v = hexDraft.trim()
    if (!v) { setEditingHex(false); return }
    if (!v.startsWith('#')) v = '#' + v
    if (!/^#[0-9a-fA-F]{6}$/.test(v)) { setHexDraft(''); setEditingHex(false); return }
    onBgChange(v.toLowerCase())
    setEditingHex(false)
  }

  function openHex() {
    setHexDraft(bgColor.replace('#', ''))
    setEditingHex(true)
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
  }

  return (
    <div className="ep-field ep-field--inline">
      <span className="ep-field-label">Background</span>
      <div
        className={`ep-swatches ${editingHex ? 'ep-swatches--editing' : ''}`}
        style={{ '--active': activeIndex >= 0 ? activeIndex : -1 }}
        onPointerDown={e => e.stopPropagation()}
      >
        {activeIndex >= 0 && !editingHex && (
          <span className="ep-swatch-indicator" />
        )}
        {SWATCHES.map(sw => (
          <button
            key={sw}
            className={`ep-swatch ${bgColor === sw ? 'ep-swatch--active' : ''}`}
            style={{ background: sw }}
            aria-label={sw}
            onClick={() => { onBgChange(sw); setEditingHex(false) }}
          />
        ))}
        <span className={`ep-hex-pill ${editingHex ? 'ep-hex-pill--editing' : ''}`}>
          {editingHex ? (
            <input
              ref={inputRef}
              className="ep-hex-input"
              value={hexDraft}
              onChange={e => setHexDraft(e.target.value.replace(/[^0-9a-fA-F]/g, ''))}
              onBlur={commitHex}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); commitHex() }
              }}
              maxLength={6}
              spellCheck={false}
              aria-label="Custom hex color"
            />
          ) : (
            <button className="ep-hex-dot" aria-label="Custom hex" onClick={openHex}>#</button>
          )}
        </span>
      </div>
    </div>
  )
}
