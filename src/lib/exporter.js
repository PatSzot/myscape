import { Output, CanvasSource, BufferTarget, Mp4OutputFormat } from 'mediabunny'

/**
 * Export the current scene to an H.264 MP4.
 * Pass `spiralRenderer`    for the Spiral preset.
 * Pass `shuffleRenderer`   for the Shuffle preset.
 * Pass `mainStageRenderer` for the Main Stage preset.
 * Pass `scapeScene`        for sphere/ring/helix/flow presets (OrthographicCamera).
 * Pass `scene`             for the explore/landscape mode (real-time capture).
 */
export async function exportVideo({ scapeScene, scene, shuffleRenderer, mainStageRenderer, spiralRenderer, fps, loopS, format, bgColor, onProgress }) {
  if (typeof VideoEncoder === 'undefined') {
    throw new Error('VideoEncoder API not available. Use Chrome 94+, Edge 94+, or Firefox 130+.')
  }

  if (spiralRenderer) {
    return export2D({ renderer: spiralRenderer, fps, loopS, format, bgColor, onProgress, label: 'spiral' })
  }

  if (scapeScene) {
    return exportScape({ scapeScene, fps, loopS, format, bgColor, onProgress })
  }

  if (mainStageRenderer) {
    return export2D({ renderer: mainStageRenderer, fps, loopS, format, bgColor, onProgress, label: 'mainstage' })
  }

  if (shuffleRenderer) {
    return export2D({ renderer: shuffleRenderer, fps, loopS, format, bgColor, onProgress, label: 'shuffle' })
  }

  // ── Three.js path: real-time frame capture ──────────────────────────────────

  const canvas   = scene.getCanvas()
  const origSize = scene.getContainerSize()

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
      // Wait until wall-clock matches this frame's target time
      const targetMs = (p / fps) * 1000
      await new Promise(resolve => {
        function check() {
          if (performance.now() - startWall >= targetMs) resolve()
          else requestAnimationFrame(check)
        }
        requestAnimationFrame(check)
      })

      scene.renderFrame()
      await canvasSource.add(p / fps, 1 / fps)
      onProgress?.((p + 1) / totalFrames)
    }

    canvasSource.close()
    await output.finalize()

    const blob = new Blob([target.buffer], { type: 'video/mp4' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `myscape-${format.w}x${format.h}.mp4`
    a.click()
    URL.revokeObjectURL(a.href)

  } finally {
    scene.resize(origSize.width, origSize.height)
    scene.restoreBgColor()
    scene.resumeLoop()
    canvas.style.visibility = ''
  }
}

// ── Scape (3D preset) path: frame-perfect export ──────────────────────────────

async function exportScape({ scapeScene, fps, loopS, format, bgColor, onProgress }) {
  scapeScene.pauseLoop()
  scapeScene.reset()

  const origSize = scapeScene.getContainerSize()
  scapeScene.resize(format.w, format.h)
  scapeScene.setBgColor(bgColor)

  const exportCanvas = scapeScene.getCanvas()
  exportCanvas.style.visibility = 'hidden'

  const target = new BufferTarget()
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  })

  const canvasSource = new CanvasSource(exportCanvas, {
    codec: 'avc',
    bitrate: 24_000_000,
    bitrateMode: 'variable',
    latencyMode: 'quality',
  })

  output.addVideoTrack(canvasSource)
  await output.start()

  const totalFrames = Math.round(loopS * fps)

  try {
    for (let p = 0; p < totalFrames; p++) {
      scapeScene.stepFrame(fps)
      await canvasSource.add(p / fps, 1 / fps)
      onProgress?.((p + 1) / totalFrames)
    }

    canvasSource.close()
    await output.finalize()

    const blob = new Blob([target.buffer], { type: 'video/mp4' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `myscape-scape-${format.w}x${format.h}.mp4`
    a.click()
    URL.revokeObjectURL(a.href)

  } finally {
    scapeScene.resize(origSize.width, origSize.height)
    scapeScene.restoreBgColor()
    scapeScene.resumeLoop()
    exportCanvas.style.visibility = ''
  }
}

// ── 2D canvas path: frame-perfect export (Shuffle + Main Stage) ───────────────

async function export2D({ renderer, fps, loopS, format, bgColor, onProgress, label }) {
  // Pause + stop the live animation loop
  renderer.pause()
  renderer.stop()
  renderer.reset()

  // Off-screen canvas at export resolution
  const exportCanvas   = document.createElement('canvas')
  exportCanvas.width   = format.w
  exportCanvas.height  = format.h

  const target = new BufferTarget()
  const output = new Output({
    format: new Mp4OutputFormat({ fastStart: 'in-memory' }),
    target,
  })

  const canvasSource = new CanvasSource(exportCanvas, {
    codec: 'avc',
    bitrate: 24_000_000,
    bitrateMode: 'variable',
    latencyMode: 'quality',
  })

  output.addVideoTrack(canvasSource)
  await output.start()

  const totalFrames = Math.round(loopS * fps)

  try {
    for (let p = 0; p < totalFrames; p++) {
      renderer.stepFrame(fps, exportCanvas, bgColor)
      await canvasSource.add(p / fps, 1 / fps)
      onProgress?.((p + 1) / totalFrames)
    }

    canvasSource.close()
    await output.finalize()

    const blob = new Blob([target.buffer], { type: 'video/mp4' })
    const a    = document.createElement('a')
    a.href     = URL.createObjectURL(blob)
    a.download = `myscape-${label}-${format.w}x${format.h}.mp4`
    a.click()
    URL.revokeObjectURL(a.href)

  } finally {
    renderer.start()
    renderer.resume()
  }
}
