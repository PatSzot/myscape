import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  AmbientLight,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  CanvasTexture,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'
import { createPhotoPlane, disposePhotoPlane } from './photoPlane.js'
import { PRESETS } from './presets.js'

// ─── Name texture helper ───────────────────────────────────────────────────────

function renderNameToTexture(name) {
  const fontSize = 52
  const padding  = 24

  // Measure with a temp canvas to get exact text width
  const tmp  = document.createElement('canvas')
  const tctx = tmp.getContext('2d')
  tctx.font  = `500 ${fontSize}px "Zalando Sans SemiExpanded", sans-serif`
  const textW = tctx.measureText(name.toUpperCase()).width

  const w = Math.ceil(textW + padding * 2)
  const h = Math.ceil(fontSize * 1.6)

  const canvas = document.createElement('canvas')
  canvas.width  = w
  canvas.height = h
  const ctx = canvas.getContext('2d')

  ctx.font          = `500 ${fontSize}px "Zalando Sans SemiExpanded", sans-serif`
  ctx.fillStyle     = 'rgba(255, 255, 255, 0.82)'
  ctx.textAlign     = 'center'
  ctx.textBaseline  = 'middle'
  ctx.letterSpacing = '0.08em'
  ctx.fillText(name.toUpperCase(), w / 2, h / 2)

  return { canvas, aspect: w / h }
}

// ─── Scene factory ─────────────────────────────────────────────────────────────

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
  // Camera must be in scene for its children (name mesh) to render
  scene.add(camera)

  // ── OrbitControls (only active in 'explore' mode) ──────────────────────────
  const orbitControls = new OrbitControls(camera, canvas)
  orbitControls.enableDamping  = true
  orbitControls.dampingFactor  = 0.05
  orbitControls.enabled        = false

  // ── State ──────────────────────────────────────────────────────────────────
  let meshes          = []
  let nameMesh        = null
  let currentPreset   = PRESETS['sphere']
  let currentPresetId = 'sphere'
  let currentControls = { ...PRESETS['sphere'].defaults }
  let animClock       = 0
  let lastTimestamp   = null
  let isPaused        = false

  // ── Internal helpers ───────────────────────────────────────────────────────

  function applyLayout() {
    if (meshes.length === 0) return
    currentPreset.layoutPhotos(meshes, currentControls)
  }

  function disposeNameMesh() {
    if (!nameMesh) return
    camera.remove(nameMesh)
    nameMesh.geometry.dispose()
    if (nameMesh.material.map) nameMesh.material.map.dispose()
    nameMesh.material.dispose()
    nameMesh = null
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async function setPhotos(urlArray) {
    if (meshes.length > 0) {
      gsap.killTweensOf(meshes.map(m => m.position))
      gsap.killTweensOf(meshes.map(m => m.rotation))
    }

    for (const mesh of meshes) {
      scene.remove(mesh)
      disposePhotoPlane(mesh)
    }
    meshes = []

    if (!urlArray || urlArray.length === 0) return

    const scale = currentControls.scale
    const newMeshes = await Promise.all(urlArray.map(url => createPhotoPlane(url, scale)))
    for (const mesh of newMeshes) {
      scene.add(mesh)
      meshes.push(mesh)
    }

    applyLayout()
  }

  function setPreset(presetId, controls) {
    const preset = PRESETS[presetId]
    if (!preset) return

    if (meshes.length > 0) {
      gsap.killTweensOf(meshes.map(m => m.position))
      gsap.killTweensOf(meshes.map(m => m.rotation))
    }

    if (meshes.length === 0) {
      currentPreset   = preset
      currentPresetId = presetId
      currentControls = { ...controls }
      orbitControls.enabled = (presetId === 'explore')
      animClock = 0
      return
    }

    const saved = meshes.map(m => ({
      px: m.position.x, py: m.position.y, pz: m.position.z,
      ry: m.rotation.y,
    }))

    preset.layoutPhotos(meshes, controls)

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

  function setScapeName(name) {
    disposeNameMesh()
    if (!name) return

    const { canvas: tc, aspect } = renderNameToTexture(name)
    const texture = new CanvasTexture(tc)

    // Size: ~0.55 units wide in camera space at z=-2 (subtle caption scale)
    const w   = 0.55
    const h   = w / aspect
    const geo = new PlaneGeometry(w, h)
    const mat = new MeshBasicMaterial({
      map: texture, transparent: true,
      depthTest: false, depthWrite: false,
    })

    nameMesh = new Mesh(geo, mat)
    nameMesh.renderOrder = 999
    // Position bottom-center in camera space, 2 units ahead
    nameMesh.position.set(0, 0, -2)

    camera.add(nameMesh)
  }

  function tick(timestamp) {
    if (isPaused) return

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
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  // ── Export helpers ─────────────────────────────────────────────────────────

  function getCanvas() {
    return renderer.domElement
  }

  function resetClock() {
    animClock    = 0
    lastTimestamp = null
  }

  function setClockPosition(t) {
    animClock = t
    if (currentPresetId !== 'explore' && currentPreset) {
      const state = currentPreset.getCameraState(t, currentControls)
      if (state) {
        camera.position.copy(state.position)
        camera.lookAt(state.target)
      }
    }
    renderer.render(scene, camera)
  }

  function pauseLoop() {
    isPaused = true
  }

  function resumeLoop() {
    isPaused      = false
    lastTimestamp = null  // prevent clock jump after pause
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  function dispose() {
    gsap.killTweensOf(meshes.map(m => m.position))
    gsap.killTweensOf(meshes.map(m => m.rotation))
    for (const mesh of meshes) {
      scene.remove(mesh)
      disposePhotoPlane(mesh)
    }
    meshes = []
    disposeNameMesh()
    scene.remove(camera)
    orbitControls.dispose()
    renderer.dispose()
  }

  return {
    setPhotos, setPreset, updateControls, setScapeName,
    tick, resize, dispose,
    getCanvas, resetClock, setClockPosition, pauseLoop, resumeLoop,
  }
}
