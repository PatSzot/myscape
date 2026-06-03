import { useEffect, useRef } from 'react'
import { initScene } from '../scene/index.js'

export default function LandscapeCanvas({ images, corner = 0 }) {
  const containerRef = useRef(null)
  const sceneRef     = useRef(null)
  // Track latest values so we can apply them once async init finishes
  const imagesRef    = useRef(images)
  const cornerRef    = useRef(corner)

  useEffect(() => { imagesRef.current = images }, [images])
  useEffect(() => { cornerRef.current = corner }, [corner])

  // ── Mount: init the scatter scene ─────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    const container = containerRef.current

    initScene(container).then(scene => {
      if (!mounted) { scene.cleanup(); return }
      sceneRef.current = scene
      scene.setStyle({ corner: cornerRef.current })
      if (imagesRef.current?.length > 0) scene.updateTextures(imagesRef.current)
    })

    return () => {
      mounted = false
      sceneRef.current?.cleanup()
      sceneRef.current = null
    }
  }, [])

  // ── Images changed ─────────────────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    if (images?.length > 0) scene.updateTextures(images)
    else scene.reloadDefaults()
  }, [images])

  // ── Corner changed ─────────────────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setStyle({ corner })
    if (imagesRef.current?.length > 0) scene.updateTextures(imagesRef.current)
    else scene.reloadDefaults()
  }, [corner])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
