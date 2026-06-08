import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { createPhotoBoothRenderer } from '../lib/photoBoothRenderer.js'

const PhotoBoothCanvas = forwardRef(function PhotoBoothCanvas(
  { photos = [], bgColor = '#0d0d0d' },
  ref,
) {
  const canvasRef   = useRef(null)
  const rendererRef = useRef(null)
  const bgColorRef  = useRef(bgColor)

  useEffect(() => { bgColorRef.current = bgColor }, [bgColor])

  function draw() {
    const canvas   = canvasRef.current
    const renderer = rendererRef.current
    if (!canvas || !renderer) return
    const rect = canvas.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const dpr = window.devicePixelRatio || 1
    canvas.width  = Math.round(rect.width  * dpr)
    canvas.height = Math.round(rect.height * dpr)
    renderer.draw(canvas, bgColorRef.current)
  }

  // Mount: create renderer
  useEffect(() => {
    const renderer = createPhotoBoothRenderer(photos)
    rendererRef.current = renderer
    renderer.onRedraw(draw)
    draw()
    return () => { rendererRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Photos changed
  useEffect(() => {
    rendererRef.current?.setPhotos(photos)
    draw()
  }, [photos]) // eslint-disable-line react-hooks/exhaustive-deps

  // BgColor changed
  useEffect(() => { draw() }, [bgColor]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(draw)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useImperativeHandle(ref, () => ({
    getRenderer() { return rendererRef.current },
  }))

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block' }}
    />
  )
})

export default PhotoBoothCanvas
