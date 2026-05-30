import { useEffect, useRef, useState } from 'react'
import { initScene } from './scene/index.js'
import UploadPanel from './ui/UploadPanel.jsx'

export default function App() {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)

  useEffect(() => {
    const scene = initScene(containerRef.current)
    sceneRef.current = scene
    return scene.cleanup
  }, [])

  function handleLoad(urls) {
    setLoading(true)
    setCount(urls.length)
    sceneRef.current.updateTextures(urls)
    setLoading(false)
  }

  return (
    <>
      <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }} />
      <UploadPanel onLoad={handleLoad} count={count} loading={loading} />
    </>
  )
}
