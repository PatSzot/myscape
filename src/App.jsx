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

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const containerRef = useRef(null)
  const sceneRef     = useRef(null)
  const poolRef      = useRef([])            // { url, meta }[] — source of truth
  const [images,   setImages]   = useState([])
  const [progress, setProgress] = useState(null)
  const [theme,          setTheme]          = useState('light')
  const [corners,        setCorners]        = useState('rounded')
  const [recording,      setRecording]      = useState(false)
  const [recordProgress, setRecordProgress] = useState(0)
  const [recordedVideo,  setRecordedVideo]  = useState(null) // { blob, ext } when ready to save

  useEffect(() => {
    let mounted = true
    initScene(containerRef.current).then(scene => {
      if (!mounted) { scene.cleanup(); return }
      sceneRef.current = scene
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

  async function handleRecord() {
    if (!sceneRef.current || recording) return
    setRecording(true)
    setRecordProgress(0)
    setRecordedVideo(null)
    try {
      const bgColor = theme === 'dark' ? 0x191812 : 0xF5F3EC
      const result = await sceneRef.current.startRecording(bgColor, p => setRecordProgress(p))
      setRecordedVideo(result)  // hold blob — let user gesture trigger the save
    } catch (err) {
      console.error('Recording failed:', err)
    } finally {
      setRecording(false)
      setRecordProgress(0)
    }
  }

  async function handleSaveVideo() {
    if (!recordedVideo) return
    const { blob, ext } = recordedVideo
    const filename = `myscape-videoloop1.${ext}`
    const file = new File([blob], filename, { type: blob.type })

    // On iOS / Android: Web Share API → user picks "Save Video" / Camera Roll
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Myscape' })
        setRecordedVideo(null)
        return
      } catch (e) {
        if (e.name === 'AbortError') return  // user cancelled — keep blob ready
        // Share failed for another reason — fall through to download
      }
    }

    // Desktop fallback: trigger a file download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    setRecordedVideo(null)
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
      <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
      <UploadPanel
        onLoad={handleLoad}
        onDelete={handleDelete}
        images={images}
        progress={progress}
        theme={theme}
        onThemeChange={handleThemeChange}
        corners={corners}
        onCornersChange={handleCornersChange}
        onRecord={handleRecord}
        isRecording={recording}
        recordProgress={recordProgress}
        recordedVideo={recordedVideo}
        onSaveVideo={handleSaveVideo}
      />
    </>
  )
}
