import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Group,
  AmbientLight,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  CanvasTexture,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'
import { createPhotoPlane, createSquarePhotoPlane, disposePhotoPlane } from './photoPlane.js'
import { PRESETS } from './presets.js'

// ─── Name texture helper ───────────────────────────────────────────────────────

function renderNameToTexture(name) {
  const fontSize = 52
  const padding  = 24

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

// ─── Placeholder assets ───────────────────────────────────────────────────────

const PLACEHOLDER_LETTERS = ['M', 'Y', 'S', 'C', 'A', 'P', 'E']
const PLACEHOLDER_COUNTS  = { sphere: 16, ring: 12, helix: 14, rotatingImages: 9 }

// ─── Scene factory ─────────────────────────────────────────────────────────────

export function createScapeScene(canvas) {
  // ── Renderer ───────────────────────────────────────────────────────────────
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)

  // ── Camera ─────────────────────────────────────────────────────────────────
  const aspect = canvas.width > 0 && canvas.height > 0 ? canvas.width / canvas.height : 1
  const camera = new PerspectiveCamera(60, aspect, 0.1, 200)
  camera.position.set(0, 0, 6)

  // ── Scene ──────────────────────────────────────────────────────────────────
  const scene          = new Scene()
  const formationGroup = new Group()  // sphere / ring / helix meshes live here
  const fanGroup       = new Group()  // rotatingImages meshes live here
  scene.add(new AmbientLight(0xffffff, 1.0))
  scene.add(formationGroup)
  scene.add(fanGroup)
  scene.add(camera)  // camera in scene so nameMesh (child of camera) renders

  // ── OrbitControls — enabled for all presets ────────────────────────────────
  const orbitControls = new OrbitControls(camera, canvas)
  orbitControls.enableDamping = true
  orbitControls.dampingFactor = 0.05
  orbitControls.enabled       = true

  // ── State ──────────────────────────────────────────────────────────────────
  let meshes          = []
  let currentUrls     = []
  let nameMesh        = null
  let currentPreset   = PRESETS['sphere']
  let currentPresetId = 'sphere'
  let currentControls = { ...PRESETS['sphere'].defaults }
  let animClock       = 0
  let lastTimestamp   = null
  let canvasWidth     = 1080
  let canvasHeight    = 1080

  // ── Internal helpers ───────────────────────────────────────────────────────

  function applyLayout() {
    if (meshes.length === 0) return
    currentPreset.layoutPhotos(meshes, currentControls, canvasWidth, canvasHeight)
  }

  function driveFanAnimation() {
    if (currentPresetId !== 'rotatingImages' || meshes.length === 0) return
    const masterAngle = Math.sin(animClock * Math.PI * 2) * (55 * Math.PI / 180)
    fanGroup.rotation.z = masterAngle
    meshes.forEach((mesh, i) => {
      const phase = animClock + i * (1 / Math.max(meshes.length, 1)) * 0.5
      mesh.rotation.z = Math.sin(phase * Math.PI * 2) * (10 * Math.PI / 180)
    })
  }

  function disposeNameMesh() {
    if (!nameMesh) return
    camera.remove(nameMesh)
    nameMesh.geometry.dispose()
    if (nameMesh.material.map) nameMesh.material.map.dispose()
    nameMesh.material.dispose()
    nameMesh = null
  }

  async function spawnPlaceholders(presetId, isRotating) {
    const n = PLACEHOLDER_COUNTS[presetId] ?? 0
    if (n === 0) return
    const urls = Array.from({ length: n }, (_, i) => `/${PLACEHOLDER_LETTERS[i % PLACEHOLDER_LETTERS.length]}.jpg`)
    const newMeshes = await Promise.all(
      urls.map(url => isRotating ? createSquarePhotoPlane(url) : createPhotoPlane(url, 1))
    )
    for (const mesh of newMeshes) {
      mesh.userData.isPlaceholder = true
      isRotating ? fanGroup.add(mesh) : formationGroup.add(mesh)
      meshes.push(mesh)
    }
  }

  function resetCamera(presetId, controls) {
    const cz = presetId === 'rotatingImages' ? 6 : controls.radius * 2.6
    camera.position.set(0, 0, cz)
    orbitControls.target.set(0, 0, 0)
    orbitControls.update()
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async function setPhotos(urlArray) {
    currentUrls = urlArray || []

    if (meshes.length > 0) {
      gsap.killTweensOf(meshes.map(m => m.position))
      gsap.killTweensOf(meshes.map(m => m.rotation))
    }
    for (const mesh of meshes) disposePhotoPlane(mesh)
    meshes = []

    const isRotating = currentPresetId === 'rotatingImages'

    if (currentUrls.length === 0) {
      await spawnPlaceholders(currentPresetId, isRotating)
      applyLayout()
      return
    }

    const newMeshes = await Promise.all(
      currentUrls.map(url => isRotating ? createSquarePhotoPlane(url) : createPhotoPlane(url, 1))
    )
    for (const mesh of newMeshes) {
      isRotating ? fanGroup.add(mesh) : formationGroup.add(mesh)
      meshes.push(mesh)
    }
    applyLayout()
  }

  async function setPreset(presetId, controls) {
    const preset = PRESETS[presetId]
    if (!preset) return

    if (meshes.length > 0) {
      gsap.killTweensOf(meshes.map(m => m.position))
      gsap.killTweensOf(meshes.map(m => m.rotation))
    }

    const wasRotating = currentPresetId === 'rotatingImages'
    const isRotating  = presetId === 'rotatingImages'

    // Reset formation rotation and clock on every preset switch
    formationGroup.rotation.set(0, 0, 0)
    fanGroup.rotation.set(0, 0, 0)
    animClock = 0

    currentPreset   = preset
    currentPresetId = presetId
    currentControls = { ...controls }

    resetCamera(presetId, controls)

    // No real photos: replace placeholder tiles for the new preset
    if (currentUrls.length === 0) {
      for (const mesh of meshes) disposePhotoPlane(mesh)
      meshes = []
      await spawnPlaceholders(presetId, isRotating)
      applyLayout()
      return
    }

    // Switching between rotating ↔ non-rotating: must recreate planes
    if (wasRotating !== isRotating) {
      for (const mesh of meshes) disposePhotoPlane(mesh)
      meshes = []
      const newMeshes = await Promise.all(
        currentUrls.map(url => isRotating ? createSquarePhotoPlane(url) : createPhotoPlane(url, 1))
      )
      for (const mesh of newMeshes) {
        isRotating ? fanGroup.add(mesh) : formationGroup.add(mesh)
        meshes.push(mesh)
      }
      applyLayout()
      return
    }

    // Same type with real photos: tween to new layout (non-rotating only)
    if (!isRotating) {
      const saved = meshes.map(m => ({
        px: m.position.x, py: m.position.y, pz: m.position.z,
        ry: m.rotation.y,
      }))
      preset.layoutPhotos(meshes, controls, canvasWidth, canvasHeight)
      meshes.forEach((mesh, i) => {
        const tx = mesh.position.x, ty = mesh.position.y, tz = mesh.position.z
        const tRy = mesh.rotation.y
        mesh.position.set(saved[i].px, saved[i].py, saved[i].pz)
        mesh.rotation.y = saved[i].ry
        gsap.to(mesh.position, { x: tx, y: ty, z: tz, duration: 0.8, ease: 'power2.inOut' })
        gsap.to(mesh.rotation, { y: tRy,           duration: 0.8, ease: 'power2.inOut' })
      })
    } else {
      applyLayout()
    }
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

    const w   = 0.55
    const h   = w / aspect
    const geo = new PlaneGeometry(w, h)
    const mat = new MeshBasicMaterial({
      map: texture, transparent: true,
      depthTest: false, depthWrite: false,
    })

    nameMesh = new Mesh(geo, mat)
    nameMesh.renderOrder = 999
    nameMesh.position.set(0, 0, -2)
    camera.add(nameMesh)
  }

  function tick(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp
    const dt = (timestamp - lastTimestamp) / 1000
    lastTimestamp = timestamp

    if (meshes.length > 0) {
      if (['sphere', 'ring', 'helix'].includes(currentPresetId)) {
        formationGroup.rotation.y += dt * currentControls.speed * 0.6
      } else if (currentPresetId === 'rotatingImages') {
        animClock = (animClock + dt * currentControls.speed * 0.1) % 1.0
        driveFanAnimation()
      }
    }

    orbitControls.update()
    renderer.render(scene, camera)
  }

  function resize(width, height) {
    if (width <= 0 || height <= 0) return
    canvasWidth  = width
    canvasHeight = height
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  function dispose() {
    gsap.killTweensOf(meshes.map(m => m.position))
    gsap.killTweensOf(meshes.map(m => m.rotation))
    for (const mesh of meshes) disposePhotoPlane(mesh)
    meshes = []
    disposeNameMesh()
    scene.remove(formationGroup)
    scene.remove(fanGroup)
    scene.remove(camera)
    orbitControls.dispose()
    renderer.dispose()
  }

  return {
    setPhotos, setPreset, updateControls, setScapeName,
    tick, resize, dispose,
  }
}
