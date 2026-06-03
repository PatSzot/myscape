import * as THREE from 'three'

const DURATION = 15  // seconds
const REC_W   = 1080
const REC_H   = 1920

// Camera offsets from each focus particle — orbit at ~8 units from varied directions
// Large XZ spread and sign changes ensure the camera rotates fully around the scene
const OFFSETS = [
  new THREE.Vector3(-5.5,  2.5,  5.5),  // front-left, high
  new THREE.Vector3( 7.5,  0.0,  2.0),  // right side
  new THREE.Vector3( 1.0,  5.0, -4.5),  // top-behind
  new THREE.Vector3( 5.0, -3.0,  5.0),  // front-right, low
  new THREE.Vector3(-6.5,  1.0, -3.5),  // left-behind
]

export async function recordPath1(renderer, scene, particles, bgColor, fps = 30, onProgress) {
  if (!window.MediaRecorder || !renderer.domElement.captureStream) {
    throw new Error('Video recording is not supported in this browser.')
  }

  // Use all visible particles as focus candidates
  const visible = particles.filter(p => p.material.uniforms.uOpacity.value > 0.3)
  if (!visible.length) throw new Error('No visible images to animate.')

  const count   = Math.min(5, visible.length)
  const targets = Array.from({ length: count }, (_, i) =>
    visible[Math.floor((i / count) * visible.length)]
  )

  // Build smooth closed curves: camera positions + look-at targets
  const camPts  = [new THREE.Vector3(0, 0.5, 12)]
  const lookPts = [new THREE.Vector3(0, 0, 0)]
  targets.forEach((p, i) => {
    camPts.push(p.position.clone().add(OFFSETS[i % OFFSETS.length]))
    lookPts.push(p.position.clone())
  })

  const camCurve  = new THREE.CatmullRomCurve3(camPts,  true, 'catmullrom', 0.5)
  const lookCurve = new THREE.CatmullRomCurve3(lookPts, true, 'catmullrom', 0.5)

  // Save renderer state
  const savedColor = new THREE.Color()
  renderer.getClearColor(savedColor)
  const savedAlpha = renderer.getClearAlpha()
  const savedDpr   = renderer.getPixelRatio()

  // Switch renderer to portrait recording resolution
  renderer.setPixelRatio(1)
  renderer.setSize(REC_W, REC_H, false)   // false = don't change CSS size
  renderer.setClearColor(bgColor, 1)
  renderer.domElement.style.visibility = 'hidden'

  const recCam = new THREE.PerspectiveCamera(55, REC_W / REC_H, 0.1, 120)

  // Pick best supported mime type (Safari needs mp4, Chrome/FF prefer webm)
  const mimeType = [
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ].find(t => MediaRecorder.isTypeSupported(t)) ?? 'video/webm'

  const stream   = renderer.domElement.captureStream(fps)
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 })
  const chunks   = []
  recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }

  return new Promise((resolve, reject) => {
    function restore() {
      renderer.setPixelRatio(savedDpr)
      renderer.setSize(window.innerWidth, window.innerHeight)
      renderer.setClearColor(savedColor, savedAlpha)
      renderer.domElement.style.visibility = ''
    }

    recorder.onstop = () => {
      restore()
      const ext = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
      resolve({ blob: new Blob(chunks, { type: mimeType }), ext })
    }

    recorder.onerror = e => { restore(); reject(e) }
    recorder.start(200)

    const t0 = performance.now()

    function tick() {
      const t = Math.min((performance.now() - t0) / 1000 / DURATION, 1)

      const pos    = camCurve.getPoint(t)
      const lookAt = lookCurve.getPoint(t)
      recCam.position.copy(pos)
      recCam.lookAt(lookAt)
      renderer.render(scene, recCam)

      if (onProgress) onProgress(t)

      if (t < 1) requestAnimationFrame(tick)
      else recorder.stop()
    }

    requestAnimationFrame(tick)
  })
}
