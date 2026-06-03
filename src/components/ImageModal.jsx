import { createPortal } from 'react-dom'

export default function ImageModal({ images, onClose, onDelete, onUploadClick }) {
  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <div className="im-overlay" onMouseDown={handleOverlayClick}>
      <div className="im-sheet">
        <div className="im-header">
          <span className="im-title">Images · {images.length}</span>
          <button className="im-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="im-grid">
          {images.map(({ url }) => (
            <div key={url} className="im-tile">
              <img src={url} alt="" />
              <button
                className="im-tile-remove"
                onClick={() => onDelete(url)}
                aria-label="Remove image"
              >×</button>
            </div>
          ))}
          <button className="im-tile-add" onClick={() => { onUploadClick(); onClose() }} aria-label="Add images">
            +
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
