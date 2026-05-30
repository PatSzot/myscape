import { useEffect, useRef, useState } from 'react'
import { initScene } from './scene/index.js'
import UploadPanel from './ui/UploadPanel.jsx'

export default function App() {
  const containerRef = useRef(null)
  const sceneRef     = useRef(null)
  const urlPoolRef   = useRef([])          // source of truth for scene calls
  const [allUrls, setAllUrls]   = useState([])
  const [progress, setProgress] = useState(null)

  useEffect(() => {
    const scene = initScene(containerRef.current)
    sceneRef.current = scene
    return scene.cleanup
  }, [])

  function applyUrls(next, showProgress = true) {
    urlPoolRef.current = next
    setAllUrls([...next])

    if (showProgress) {
      setProgress({ done: 0, total: 100 })
      sceneRef.current.updateTextures(next, (done, total) => {
        setProgress({ done, total })
        if (done === total) setTimeout(() => setProgress(null), 800)
      })
    } else {
      // Silent update (deletions) — no progress bar
      sceneRef.current.updateTextures(next)
    }
  }

  function handleLoad(newUrls) {
    applyUrls([...urlPoolRef.current, ...newUrls], true)
  }

  function handleDelete(url) {
    const next = urlPoolRef.current.filter(u => u !== url)
    URL.revokeObjectURL(url)
    applyUrls(next, false)
  }

  return (
    <>
      <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
      <UploadPanel
        onLoad={handleLoad}
        onDelete={handleDelete}
        allUrls={allUrls}
        progress={progress}
      />
    </>
  )
}
