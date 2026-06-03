import { Output, CanvasSource, BufferTarget, Mp4OutputFormat } from 'mediabunny'

/**
 * Export the current scene to an H.264 MP4 using WebCodecs VideoEncoder via Mediabunny.
 *
 * @param {object} opts
 * @param {object} opts.scene      - Scene controller returned by initScene
 * @param {number} opts.fps        - 30 or 60
 * @param {number} opts.loopS      - Loop duration in seconds
 * @param {{ w: number, h: number }} opts.format - Export resolution
 * @param {string} opts.bgColor    - CSS hex background color
 * @param {function} opts.onProgress - Called with 0→1 progress
 */
export async function exportVideo({ scene, fps, loopS, format, bgColor, onProgress }) {
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('VideoEncoder API not available. Use Chrome 94+, Edge 94+, or Firefox 130+.')
  }

  const canvas = scene.getCanvas()
  const origSize = scene.getContainerSize()

  // Configure renderer for export resolution
  scene.setBgColor(bgColor)
  scene.resize(format.w, format.h)
  scene.pauseLoop()
  canvas.style.visibility = 'hidden'

  const target = new BufferTarget()
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  })

  const canvasSource = new CanvasSource(canvas, {
    codec: 'avc',
    bitrate: 24_000_000,
    bitrateMode: 'variable',
    latencyMode: 'quality',
  })

  output.addVideoTrack(canvasSource)
  await output.start()

  const totalFrames = Math.round(loopS * fps)
  const startWall   = performance.now()

  try {
    for (let p = 0; p < totalFrames; p++) {
      // Wait until wall-clock time matches this frame's target time
      // (ensures animation plays at correct speed)
      const targetMs = (p / fps) * 1000
      await new Promise(resolve => {
        function check() {
          if (performance.now() - startWall >= targetMs) resolve()
          else requestAnimationFrame(check)
        }
        requestAnimationFrame(check)
      })

      // Render the scene for this frame (GSAP has ticked naturally)
      scene.renderFrame()

      // Encode this frame
      await canvasSource.add(p / fps, 1 / fps)

      onProgress?.((p + 1) / totalFrames)
    }

    canvasSource.close()
    await output.finalize()

    // Download the MP4
    const blob = new Blob([target.buffer], { type: 'video/mp4' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `myscape-${format.w}x${format.h}.mp4`
    a.click()
    URL.revokeObjectURL(url)

  } finally {
    // Always restore scene state
    scene.resize(origSize.width, origSize.height)
    scene.restoreBgColor()
    scene.resumeLoop()
    canvas.style.visibility = ''
  }
}
