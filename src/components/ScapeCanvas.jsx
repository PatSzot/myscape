import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { createScapeScene } from '../lib/scapeScene.js'

const ScapeCanvas = forwardRef(function ScapeCanvas({ photos, presetId, controls, scapeName }, ref) {
  const canvasRef     = useRef(null)
  const sceneRef      = useRef(null)
  const prevPresetRef = useRef(null)

  // Expose scene controller to parent via ref
  useImperativeHandle(ref, () => ({
    getScene: () => sceneRef.current,
  }), [])

  // ── Mount: create scene + start RAF loop ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    const scene  = createScapeScene(canvas)
    sceneRef.current = scene

    const container = canvas.parentElement
    if (container) {
      scene.resize(container.offsetWidth || 400, container.offsetHeight || 280)
    }

    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      sceneRef.current?.resize(width, height)
    })
    if (container) ro.observe(container)

    const raf = { id: null }
    const loop = ts => {
      scene.tick(ts)
      raf.id = requestAnimationFrame(loop)
    }
    raf.id = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf.id)
      ro.disconnect()
      scene.dispose()
      sceneRef.current = null
      prevPresetRef.current = null
    }
  }, [])

  // ── Photos changed ────────────────────────────────────────────────────────
  useEffect(() => {
    sceneRef.current?.setPhotos(photos)
  }, [photos])

  // ── Preset / controls changed ─────────────────────────────────────────────
  useEffect(() => {
    if (!sceneRef.current) return
    if (presetId !== prevPresetRef.current) {
      prevPresetRef.current = presetId
      sceneRef.current.setPreset(presetId, controls)
    } else {
      sceneRef.current.updateControls(controls)
    }
  }, [presetId, controls])

  // ── Scape name overlay ────────────────────────────────────────────────────
  useEffect(() => {
    sceneRef.current?.setScapeName(scapeName || '')
  }, [scapeName])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
})

export default ScapeCanvas
