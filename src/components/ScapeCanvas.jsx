import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { initScapeScene } from '../lib/scapeScene.js'

const ScapeCanvas = forwardRef(function ScapeCanvas(
  { photos = [], bgColor = '#0d0d0d', presetId = 'sphere', controls = {}, loopS = 8 },
  ref,
) {
  const containerRef   = useRef(null)
  const sceneRef       = useRef(null)
  const photosRef      = useRef(photos)
  const controlsRef    = useRef(controls)
  const prevCountRef   = useRef(controls.count)
  const prevCornersRef = useRef(controls.corners)

  // ── Mount: init the scape scene ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true
    const container = containerRef.current

    initScapeScene(container).then(scene => {
      if (!mounted) { scene.cleanup(); return }
      sceneRef.current = scene
      scene.setBgColor(bgColor)
      scene.setPreset(presetId)
      scene.setControls(controls)
      scene.setLoopDuration(loopS)
      scene.setPhotos(photosRef.current, controls.corners)
    })

    return () => {
      mounted = false
      sceneRef.current?.cleanup()
      sceneRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync bgColor ──────────────────────────────────────────────────────────
  useEffect(() => { sceneRef.current?.setBgColor(bgColor) }, [bgColor])

  // ── Sync presetId ─────────────────────────────────────────────────────────
  useEffect(() => { sceneRef.current?.setPreset(presetId) }, [presetId])

  // ── Sync loopS ────────────────────────────────────────────────────────────
  useEffect(() => { sceneRef.current?.setLoopDuration(loopS) }, [loopS])

  // ── Sync controls ─────────────────────────────────────────────────────────
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    scene.setControls(controls)
    controlsRef.current = controls

    // Rebuild meshes if count or corners changed (affects mesh count or texture rounding)
    const countChanged   = controls.count   !== prevCountRef.current
    const cornersChanged = controls.corners !== prevCornersRef.current
    prevCountRef.current   = controls.count
    prevCornersRef.current = controls.corners

    if (countChanged || cornersChanged) {
      scene.setPhotos(photosRef.current, controls.corners)
    }
  }, [controls])

  // ── Sync photos ───────────────────────────────────────────────────────────
  useEffect(() => {
    photosRef.current = photos
    sceneRef.current?.setPhotos(photos, controlsRef.current?.corners)
  }, [photos])

  useImperativeHandle(ref, () => ({
    togglePause() { sceneRef.current?.togglePause() },
    pause()       { sceneRef.current?.pauseLoop() },
    resume()      { sceneRef.current?.resumeLoop() },
    getScene()    { return sceneRef.current },
  }))

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
})

export default ScapeCanvas
