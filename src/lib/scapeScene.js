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
import { createPhotoPlane, disposePhotoPlane } from './photoPlane.js'
import { PRESETS } from './presets.js'

// ─── Placeholder assets ───────────────────────────────────────────────────────

const PLACEHOLDER_LETTERS = ['M', 'Y', 'S', 'C', 'A', 'P', 'E']
const PLACEHOLDER_COUNTS  = { sphere: 16, ring: 12, helix: 14 }

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
  const formationGroup = new Group()
  scene.add(new AmbientLight(0xffffff, 1.0))
  scene.add(formationGroup)
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
  let currentName     = ''
  let currentTheme    = 'dark'
  let currentPreset   = PRESETS['sphere']
  let currentPresetId = 'sphere'
  let currentControls = { ...PRESETS['sphere'].defaults }
  let currentCorner   = 0
  let lastTimestamp   = null
  let canvasWidth     = 1080
  let canvasHeight    = 1080

  // ── Internal helpers ───────────────────────────────────────────────────────

  function applyLayout() {
    if (meshes.length === 0) return
    currentPreset.layoutPhotos(meshes, currentControls, canvasWidth, canvasHeight)
  }

  function disposeNameMesh() {
    if (!nameMesh) return
    camera.remove(nameMesh)
    nameMesh.geometry.dispose()
    if (nameMesh.material.map) nameMesh.material.map.dispose()
    nameMesh.material.dispose()
    nameMesh = null
  }

  function buildNameMesh() {
    disposeNameMesh()
    if (!currentName) return

    const fontSize = 120
    const padding  = 80
    const tmp  = document.createElement('canvas')
    const tctx = tmp.getContext('2d')
    tctx.font  = `500 ${fontSize}px "Zalando Sans SemiExpanded", sans-serif`
    const textW = tctx.measureText(currentName.toUpperCase()).width

    const texW = Math.ceil(textW + padding * 2)
    const texH = Math.ceil(fontSize * 1.5)
    const tc   = document.createElement('canvas')
    tc.width  = texW
    tc.height = texH
    const ctx = tc.getContext('2d')
    ctx.font          = `500 ${fontSize}px "Zalando Sans SemiExpanded", sans-serif`
    ctx.fillStyle     = currentTheme === 'dark' ? '#ffffff' : '#1a1a12'
    ctx.textAlign     = 'center'
    ctx.textBaseline  = 'middle'
    ctx.letterSpacing = '0.08em'
    ctx.fillText(currentName.toUpperCase(), texW / 2, texH / 2)

    const texture = new CanvasTexture(tc)

    // Size the plane to fill the canvas width at z=-5 in camera space
    const zDist = 5
    const visH  = 2 * zDist * Math.tan(camera.fov * Math.PI / 360)
    const visW  = visH * (canvasWidth / canvasHeight)
    const pw    = visW
    const ph    = pw * (texH / texW)

    const geo = new PlaneGeometry(pw, ph)
    const mat = new MeshBasicMaterial({
      map: texture, transparent: true,
      depthTest: false, depthWrite: false,
    })
    nameMesh = new Mesh(geo, mat)
    nameMesh.renderOrder = -999
    nameMesh.position.set(0, 0, -zDist)
    camera.add(nameMesh)
  }

  async function spawnPlaceholders() {
    const n = PLACEHOLDER_COUNTS[currentPresetId] ?? 0
    if (n === 0) return
    const urls     = Array.from({ length: n }, (_, i) => `/${PLACEHOLDER_LETTERS[i % PLACEHOLDER_LETTERS.length]}.jpg`)
    const newMeshes = await Promise.all(urls.map(url => createPhotoPlane(url, 1, currentCorner)))
    for (const mesh of newMeshes) {
      mesh.userData.isPlaceholder = true
      formationGroup.add(mesh)
      meshes.push(mesh)
    }
  }

  function resetCamera(presetId, controls) {
    const cz = controls.radius * 2.6
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

    if (currentUrls.length === 0) {
      await spawnPlaceholders()
      applyLayout()
      return
    }

    const newMeshes = await Promise.all(
      currentUrls.map(url => createPhotoPlane(url, 1, currentCorner))
    )
    for (const mesh of newMeshes) {
      formationGroup.add(mesh)
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

    currentPreset   = preset
    currentPresetId = presetId
    currentControls = { ...controls }

    resetCamera(presetId, controls)

    // No real photos: replace placeholders for the new preset
    if (currentUrls.length === 0) {
      for (const mesh of meshes) disposePhotoPlane(mesh)
      meshes = []
      await spawnPlaceholders()
      applyLayout()
      return
    }

    // Tween real photos to new layout
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
  }

  function updateControls(controls) {
    currentControls = { ...controls }
    applyLayout()
  }

  async function setCorner(corner) {
    if (corner === currentCorner) return
    currentCorner = corner
    // Recreate all meshes with the new corner radius
    const urls = currentUrls.slice()
    for (const mesh of meshes) disposePhotoPlane(mesh)
    meshes = []
    if (urls.length === 0) {
      await spawnPlaceholders()
    } else {
      const newMeshes = await Promise.all(urls.map(url => createPhotoPlane(url, 1, currentCorner)))
      for (const mesh of newMeshes) {
        formationGroup.add(mesh)
        meshes.push(mesh)
      }
    }
    applyLayout()
  }

  function setScapeName(name, theme = 'dark') {
    currentName  = name || ''
    currentTheme = theme
    buildNameMesh()
  }

  function tick(timestamp) {
    if (lastTimestamp === null) lastTimestamp = timestamp
    const dt = (timestamp - lastTimestamp) / 1000
    lastTimestamp = timestamp

    if (meshes.length > 0 && ['sphere', 'ring', 'helix'].includes(currentPresetId)) {
      formationGroup.rotation.y += dt * currentControls.speed * 0.6
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
    if (nameMesh) buildNameMesh()
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  function dispose() {
    gsap.killTweensOf(meshes.map(m => m.position))
    gsap.killTweensOf(meshes.map(m => m.rotation))
    for (const mesh of meshes) disposePhotoPlane(mesh)
    meshes = []
    disposeNameMesh()
    scene.remove(formationGroup)
    scene.remove(camera)
    orbitControls.dispose()
    renderer.dispose()
  }

  return {
    setPhotos, setPreset, updateControls, setCorner, setScapeName,
    tick, resize, dispose,
  }
}
