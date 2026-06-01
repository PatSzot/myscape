import { useEffect, useRef, useState } from 'react'
import exifr from 'exifr'
import { initScene } from './scene/index.js'
import UploadPanel from './ui/UploadPanel.jsx'

// ─── EXIF helpers ─────────────────────────────────────────────────────────────

async function readMeta(file) {
  try {
    const data = await exifr.parse(file, {
      pick: ['DateTimeOriginal', 'CreateDate', 'GPSLatitude', 'GPSLongitude'],
    })
    if (!data) return {}

    const dt   = data.DateTimeOriginal || data.CreateDate
    const date = dt instanceof Date
      ? dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
      : null

    let location = null
    if (data.GPSLatitude != null && data.GPSLongitude != null) {
      const lat    = data.GPSLatitude
      const lon    = data.GPSLongitude
      const latDir = lat >= 0 ? 'N' : 'S'
      const lonDir = lon >= 0 ? 'E' : 'W'
      location = `${Math.abs(lat).toFixed(4)}° ${latDir}  ${Math.abs(lon).toFixed(4)}° ${lonDir}`
    }

    return { date, location }
  } catch {
    return {}
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Compress a blob/object URL to a JPEG data URL at max 1024px (keeps uploads small)
function compressImageToDataUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Do NOT set crossOrigin for blob URLs — they are same-origin and don't support
    // CORS mode; setting it causes silent load failures on iOS Safari.
    img.onload = () => {
      const MAX = 1024
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight, 1))
      const w = Math.max(1, Math.round(img.naturalWidth  * scale))
      const h = Math.max(1, Math.round(img.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}

// ─── App ──────────────────────────────────────────────────────────────────────

const _params   = new URLSearchParams(window.location.search)
const SHARE_ID  = _params.get('s')
const VIEW_MODE = _params.has('view') || !!SHARE_ID

export default function App() {
  const containerRef = useRef(null)
  const sceneRef     = useRef(null)
  const poolRef      = useRef([])            // { url, meta }[] — source of truth
  const [images,   setImages]   = useState([])
  const [progress, setProgress] = useState(null)
  const [theme,          setTheme]          = useState('light')
  const [corners,        setCorners]        = useState('sharp')
  const [scapeName,      setScapeName]      = useState('')

  useEffect(() => {
    document.body.style.background = theme === 'dark' ? '#191812' : '#F5F3EC'
  }, [theme])

  useEffect(() => {
    let mounted = true
    initScene(containerRef.current).then(async scene => {
      if (!mounted) { scene.cleanup(); return }
      sceneRef.current = scene

      if (SHARE_ID) {
        try {
          const res = await fetch(`/api/share?id=${SHARE_ID}`)
          if (!res.ok) throw new Error(`API ${res.status}`)
          const { images = [], settings = {} } = await res.json()

          if (!mounted) return

          // Restore settings
          if (settings.theme && settings.theme !== 'light') {
            setTheme(settings.theme)
          }
          if (settings.corners === 'rounded') {
            setCorners('rounded')
            scene.setStyle({ corner: 0.12 })
          }
          if (settings.name) setScapeName(settings.name)

          // Load images
          if (images.length > 0) {
            poolRef.current = images
            setImages([...images])
            setProgress({ done: 0, total: images.length })
            scene.updateTextures(images, (done, total) => {
              setProgress({ done, total })
              if (done === total) setTimeout(() => setProgress(null), 800)
            })
          }
        } catch (err) {
          console.error('Failed to load shared scape:', err)
        }
      }
    })
    return () => {
      mounted = false
      sceneRef.current?.cleanup()
    }
  }, [])

  function applyPool(next, showProgress = true) {
    poolRef.current = next
    setImages([...next])

    if (showProgress) {
      setProgress({ done: 0, total: next.length })
      sceneRef.current.updateTextures(next, (done, total) => {
        setProgress({ done, total })
        if (done === total) setTimeout(() => setProgress(null), 800)
      })
    } else {
      sceneRef.current.updateTextures(next)
    }
  }

  async function handleLoad(files) {
    // Read EXIF in parallel, then create blob URLs
    const metas = await Promise.all(files.map(readMeta))
    const newImages = files.map((f, i) => ({
      url:  URL.createObjectURL(f),
      meta: metas[i],
    }))
    applyPool([...poolRef.current, ...newImages], true)
  }

  function handleThemeChange(t) {
    setTheme(t)
    document.body.style.background = t === 'dark' ? '#191812' : '#F5F3EC'
    sceneRef.current?.setBackground(t === 'dark' ? 0x191812 : 0xF5F3EC)
  }


  async function handleCopyLink() {
    // Compress images to JPEG at max 1024px before upload
    const entries = await Promise.all(
      poolRef.current.map(async ({ url, meta }) => ({
        dataUrl: await compressImageToDataUrl(url),
        meta,
      }))
    )

    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entries,
        settings: { theme, corners, name: scapeName },
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Upload failed (${res.status})`)
    }

    const { id } = await res.json()
    return `${window.location.origin}/?view&s=${id}`
  }

  function handleCornersChange(v) {
    setCorners(v)
    sceneRef.current?.setStyle({ corner: v === 'rounded' ? 0.12 : 0.0 })
    if (poolRef.current.length > 0) {
      applyPool(poolRef.current, false)
    } else {
      sceneRef.current?.reloadDefaults()
    }
  }

  function handleDelete(url) {
    URL.revokeObjectURL(url)
    const next = poolRef.current.filter(img => img.url !== url)
    applyPool(next, false)
  }

  return (
    <>
      {/* Name sits behind the canvas */}
      {scapeName && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '40pt',
          fontFamily: "'Zalando Sans SemiExpanded', sans-serif",
          fontWeight: 900,
          color: theme === 'dark' ? '#f0ede4' : '#000000',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 0,
          whiteSpace: 'nowrap',
          textTransform: 'uppercase',
        }}>
          {scapeName}
        </div>
      )}

      {/* Canvas sits above — transparent background lets name show through */}
      <div ref={containerRef} style={{ position: 'relative', zIndex: 1, width: '100vw', height: '100vh', overflow: 'hidden' }} />

      {!VIEW_MODE && <UploadPanel
        onLoad={handleLoad}
        onDelete={handleDelete}
        images={images}
        progress={progress}
        theme={theme}
        onThemeChange={handleThemeChange}
        corners={corners}
        onCornersChange={handleCornersChange}
        onCopyLink={handleCopyLink}
        scapeName={scapeName}
        onScapeNameChange={setScapeName}
      />}
    </>
  )
}
