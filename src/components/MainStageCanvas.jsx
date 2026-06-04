import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { createMainStageRenderer } from '../lib/mainStageRenderer.js'

const MainStageCanvas = forwardRef(function MainStageCanvas(
  { photos = [], bgColor = '#000000', speed = 1.0 },
  ref,
) {
  const canvasRef   = useRef(null)
  const rendererRef = useRef(null)
  const imgElsRef   = useRef([])

  // ── Load HTMLImageElements from URLs whenever photos change ──────────────────
  useEffect(() => {
    let cancelled = false
    Promise.all(
      photos.map(({ url }) =>
        new Promise(resolve => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload  = () => resolve(img)
          img.onerror = () => resolve(null)
          img.src = url
        }),
      ),
    ).then(els => {
      if (cancelled) return
      imgElsRef.current = els.filter(Boolean)
      rendererRef.current?.setPhotos(imgElsRef.current)
    })
    return () => { cancelled = true }
  }, [photos])

  useEffect(() => { rendererRef.current?.setBgColor(bgColor) }, [bgColor])
  useEffect(() => { rendererRef.current?.setSpeed(speed) }, [speed])

  // ── Mount: create renderer + ResizeObserver ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    function setSize(w, h) {
      const dpr = Math.min(window.devicePixelRatio, 2)
      canvas.width  = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }

    const parent = canvas.parentElement || canvas
    setSize(parent.offsetWidth, parent.offsetHeight)

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize(width, height)
    })
    ro.observe(parent)

    const renderer = createMainStageRenderer(canvas, {
      photos: imgElsRef.current,
      bgColor,
      speed,
    })
    rendererRef.current = renderer

    return () => {
      ro.disconnect()
      renderer.stop()
      rendererRef.current = null
    }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    togglePause() { rendererRef.current?.togglePause() },
    pause()       { rendererRef.current?.pause() },
    resume()      { rendererRef.current?.resume() },
    getRenderer() { return rendererRef.current },
  }))

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
})

export default MainStageCanvas
