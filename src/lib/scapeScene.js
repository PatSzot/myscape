import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  AmbientLight,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'
import { createPhotoPlane, disposePhotoPlane } from './photoPlane.js'
import { PRESETS } from './presets.js'

export function createScapeScene(canvas) {
  // ── Renderer ───────────────────────────────────────────────────────────────
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)   // transparent — CSS bg shows through

  // ── Camera ─────────────────────────────────────────────────────────────────
  const aspect = canvas.width > 0 && canvas.height > 0 ? canvas.width / canvas.height : 1
  const camera = new PerspectiveCamera(60, aspect, 0.1, 200)
  camera.position.set(0, 0, 6)

  // ── Scene ──────────────────────────────────────────────────────────────────
  const scene = new Scene()
  scene.add(new AmbientLight(0xffffff, 1.0))

  // ── OrbitControls (only active in 'explore' mode) ──────────────────────────
  const orbitControls = new OrbitControls(camera, canvas)
  orbitControls.enableDamping  = true
  orbitControls.dampingFactor  = 0.05
  orbitControls.enabled        = false

  // ── State ──────────────────────────────────────────────────────────────────
  let meshes         = []
  let currentPreset  = PRESETS['sphere']
  let currentPresetId = 'sphere'
  let currentControls = { ...PRESETS['sphere'].defaults }
  let animClock      = 0
  let lastTimestamp  = null

  // ── Internal helpers ───────────────────────────────────────────────────────

  function applyLayout() {
    if (meshes.length === 0) return
    currentPreset.layoutPhotos(meshes, currentControls)
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async function setPhotos(urlArray) {
    // Kill active tweens on old meshes
    if (meshes.length > 0) {
      gsap.killTweensOf(meshes.map(m => m.position))
      gsap.killTweensOf(meshes.map(m => m.rotation))
    }

    // Dispose and remove all old meshes
    for (const mesh of meshes) {
      scene.remove(mesh)
      disposePhotoPlane(mesh)
    }
    meshes = []

    if (!urlArray || urlArray.length === 0) return

    // Create new meshes for every URL
    const scale = currentControls.scale
    const newMeshes = await Promise.all(urlArray.map(url => createPhotoPlane(url, scale)))
    for (const mesh of newMeshes) {
      scene.add(mesh)
      meshes.push(mesh)
    }

    // Layout with current preset
    applyLayout()
  }

  function setPreset(presetId, controls) {
    const preset = PRESETS[presetId]
    if (!preset) return

    // Kill existing tweens
    if (meshes.length > 0) {
      gsap.killTweensOf(meshes.map(m => m.position))
      gsap.killTweensOf(meshes.map(m => m.rotation))
    }

    if (meshes.length === 0) {
      // No meshes yet — just store state, layout will run after setPhotos
      currentPreset   = preset
      currentPresetId = presetId
      currentControls = { ...controls }
      orbitControls.enabled = (presetId === 'explore')
      animClock = 0
      return
    }

    // Save current positions/rotations before layout
    const saved = meshes.map(m => ({
      px: m.position.x, py: m.position.y, pz: m.position.z,
      ry: m.rotation.y,
    }))

    // Apply new layout to get targets
    preset.layoutPhotos(meshes, controls)

    // Tween each mesh from saved → new (reset to saved first, then gsap.to)
    meshes.forEach((mesh, i) => {
      const tx = mesh.position.x, ty = mesh.position.y, tz = mesh.position.z
      const tRy = mesh.rotation.y

      mesh.position.set(saved[i].px, saved[i].py, saved[i].pz)
      mesh.rotation.y = saved[i].ry

      gsap.to(mesh.position, { x: tx, y: ty, z: tz, duration: 0.8, ease: 'power2.inOut' })
      gsap.to(mesh.rotation, { y: tRy,           duration: 0.8, ease: 'power2.inOut' })
    })

    currentPreset   = preset
    currentPresetId = presetId
    currentControls = { ...controls }
    orbitControls.enabled = (presetId === 'explore')
    animClock = 0
  }

  function updateControls(controls) {
    currentControls = { ...controls }
    applyLayout()
  }

  function tick(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp

    if (currentPresetId === 'explore') {
      orbitControls.update()
    } else if (currentPreset && meshes.length > 0) {
      const dt = (timestamp - lastTimestamp) / 1000
      animClock = (animClock + dt * currentControls.speed * 0.1) % 1.0
      const state = currentPreset.getCameraState(animClock, currentControls)
      if (state) {
        camera.position.copy(state.position)
        camera.lookAt(state.target)
      }
    }

    lastTimestamp = timestamp
    renderer.render(scene, camera)
  }

  function resize(width, height) {
    if (width <= 0 || height <= 0) return
    renderer.setSize(width, height, false)  // false = don't update CSS size
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  function dispose() {
    gsap.killTweensOf(meshes.map(m => m.position))
    gsap.killTweensOf(meshes.map(m => m.rotation))
    for (const mesh of meshes) {
      scene.remove(mesh)
      disposePhotoPlane(mesh)
    }
    meshes = []
    orbitControls.dispose()
    renderer.dispose()
  }

  return { setPhotos, setPreset, updateControls, tick, resize, dispose }
}
