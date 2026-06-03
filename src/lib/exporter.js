/**
 * exportVideo — records the ScapeCanvas Three.js renderer at export resolution.
 *
 * Strategy:
 *  1. Pause the live RAF (tick() becomes a no-op)
 *  2. Resize renderer to export resolution
 *  3. Reset animClock to exactly 0
 *  4. Warm up 3 frames so GPU textures are fully flushed
 *  5. MediaRecorder on canvas.captureStream(30)
 *  6. Drive frames manually: t = frame/totalFrames (0 → just-under-1)
 *     — because getCameraState is periodic, frame 0 = frame N, so the loop is seamless
 *  7. Trigger download, restore preview size, resume RAF
 */
export async function exportVideo({
  sceneController,
  scapeName,
  durationSeconds,
  canvasSize,
  presetId,
  onProgress,
}) {
  if (!window.MediaRecorder) throw new Error('NO_MEDIARECORDER')

  const canvas   = sceneController.getCanvas()
  const previewW = canvas.parentElement?.offsetWidth  || canvas.clientWidth  || 400
  const previewH = canvas.parentElement?.offsetHeight || canvas.clientHeight || 280

  sceneController.pauseLoop()

  try {
    // Resize to export resolution
    sceneController.resize(canvasSize.width, canvasSize.height)

    // Reset clock to clean loop start
    sceneController.resetClock()

    // Warm-up frames — ensures textures are on GPU before recording begins
    for (let i = 0; i < 3; i++) {
      sceneController.setClockPosition(0)
      await new Promise(r => requestAnimationFrame(r))
    }

    // Pick best supported mime type
    const mimeType = [
      'video/mp4;codecs=avc1',
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
    ].find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm'

    const stream   = canvas.captureStream(30)
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
    const chunks   = []
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

    recorder.start()

    // Drive frames at exactly t = frame/totalFrames
    // t ranges 0 → (N-1)/N — never hits 1.0 — so start and end frames are identical (seamless)
    const fps         = 30
    const totalFrames = Math.round(durationSeconds * fps)

    for (let frame = 0; frame < totalFrames; frame++) {
      const t = frame / totalFrames
      sceneController.setClockPosition(t)
      if (onProgress) onProgress(frame / totalFrames)
      // Brief yield so captureStream can pull the rendered frame
      await new Promise(r => setTimeout(r, 4))
    }

    recorder.stop()
    await new Promise(resolve => { recorder.onstop = resolve })
    if (onProgress) onProgress(1)

    // Trigger download
    const ext      = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
    const safeName = (scapeName || 'myscape').replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase()
    const filename = `${safeName}-${presetId}.${ext}`
    const blob     = new Blob(chunks, { type: mimeType })
    const url      = URL.createObjectURL(blob)
    const a        = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)

  } finally {
    // Always restore preview size + resume live animation
    sceneController.resize(previewW, previewH)
    sceneController.resumeLoop()
  }
}
