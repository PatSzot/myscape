import { useState, useRef, useMemo } from 'react'

export default function NumberField({ label, value, min, max, step, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState('')
  const inputRef = useRef(null)
  const rowRef   = useRef(null)

  const decimals = useMemo(() => {
    const log = Math.log10(step)
    return log < 0 ? Math.min(3, Math.ceil(-log)) : 0
  }, [step])

  const displayValue = value.toFixed(decimals)
  const progress     = Math.max(0, Math.min(1, (value - min) / (max - min)))

  function handlePointerDown(e) {
    if (editing || e.button !== 0) return
    e.preventDefault()
    const rect = rowRef.current.getBoundingClientRect()

    function onMove(ev) {
      const t = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width))
      let v = min + t * (max - min)
      v = Math.round(v / step) * step
      v = Math.max(min, Math.min(max, v))
      onChange(v)
    }
    function onUp() {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    onMove(e)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp, { once: true })
  }

  function handleValueClick(e) {
    e.stopPropagation()
    setDraft(displayValue)
    setEditing(true)
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 0)
  }

  function commit() {
    if (!editing) return
    let v = parseFloat(draft)
    if (!isFinite(v)) v = value
    v = Math.max(min, Math.min(max, Math.round(v / step) * step))
    onChange(v)
    setEditing(false)
  }

  return (
    <div
      className="ep-number-field ep-field"
      ref={rowRef}
      onPointerDown={handlePointerDown}
      style={{ cursor: editing ? 'default' : 'ew-resize' }}
    >
      <div className="ep-field-track" style={{ width: `${progress * 100}%` }} />
      <span className="ep-field-label">{label}</span>
      <div className="ep-field-value">
        <span
          className={`ep-pill ${editing ? 'ep-pill--editing' : ''}`}
          onPointerDown={e => e.stopPropagation()}
        >
          {editing ? (
            <input
              ref={inputRef}
              className="ep-pill-input"
              type="text"
              inputMode="decimal"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); commit() }
              }}
              onClick={e => e.stopPropagation()}
              style={{ width: `${Math.max(2, draft.length)}ch` }}
            />
          ) : (
            <span className="ep-pill-text" onClick={handleValueClick}>{displayValue}</span>
          )}
        </span>
      </div>
    </div>
  )
}
