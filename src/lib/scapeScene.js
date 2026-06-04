// ─── Scape scene: animated 3D presets ────────────────────────────────────────
// Three.js scene with OrthographicCamera driving sphere/ring/helix/flow layouts.
// animOffset (0→1 per loopDuration seconds) is the single animation clock.

import * as THREE from 'three'
import { PRESET_LAYOUTS } from './presets.js'

const FRUSTUM_BASE = 3   // base frustum half-height at zoom=1

// ─── Shaders ──────────────────────────────────────────────────────────────────

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const FRAG = /* glsl */`
  uniform sampler2D uTexture;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(uTexture, vUv);
    gl_FragColor = vec4(c.rgb, c.a * uOpacity);
  }
`

// ─── Texture helpers ──────────────────────────────────────────────────────────

function clipRoundRect(ctx, w, h, r) {
  if (r <= 0) return
  ctx.beginPath()
  ctx.moveTo(r, 0);           ctx.lineTo(w - r, 0)
  ctx.arcTo(w, 0,   w, r,   r)
  ctx.lineTo(w, h - r);      ctx.arcTo(w, h,   w - r, h, r)
  ctx.lineTo(r, h);          ctx.arcTo(0, h,   0, h - r, r)
  ctx.lineTo(0, r);          ctx.arcTo(0, 0,   r, 0,   r)
  ctx.closePath()
  ctx.clip()
}

async function loadPhotoTex(url, corner = 0) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const MAX   = 1024
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight, 1))
      const w     = Math.max(1, Math.round(img.naturalWidth  * scale))
      const h     = Math.max(1, Math.round(img.naturalHeight * scale))
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.save()
      if (corner > 0) clipRoundRect(ctx, w, h, Math.round(Math.min(w, h) * corner))
      ctx.drawImage(img, 0, 0, w, h)
      ctx.restore()
      resolve({ tex: new THREE.CanvasTexture(canvas), aspect: w / h })
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function makePlaceholderTex() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size; canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, size, size)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.font = `500 ${Math.round(size * 0.3)}px "IBM Plex Mono", monospace`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('M', size / 2, size / 2)
  return new THREE.CanvasTexture(canvas)
}

// ─── Scene factory ────────────────────────────────────────────────────────────

export async function initScapeScene(container) {
  const W = container.offsetWidth  || window.innerWidth
  const H = container.offsetHeight || window.innerHeight

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(W, H)
  renderer.setClearColor(0x000000, 0)
  container.appendChild(renderer.domElement)

  const threeScene   = new THREE.Scene()
  const orthoCamera  = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 100)
  orthoCamera.position.set(0, 0, 10)
  orthoCamera.lookAt(0, 0, 0)

  const sharedGeo      = new THREE.PlaneGeometry(1, 1)
  const placeholderTex = makePlaceholderTex()

  const meshes = []

  let currentPresetId = 'sphere'
  let currentControls = { count: 35, zoom: 1.0, radius: 1.0, scale: 0.8, corners: 0.08, speed: 1.0 }
  let loopDuration    = 8.0
  let animOffset      = 0
  let lastTimestamp   = null
  let paused          = false
  let rafId           = null

  // ── Camera ─────────────────────────────────────────────────────────────────

  function updateOrthoCamera() {
    const el      = renderer.domElement
    const aspect  = (el.width / renderer.getPixelRatio()) / (el.height / renderer.getPixelRatio())
    const frustum = FRUSTUM_BASE / Math.max(0.001, currentControls.zoom)
    orthoCamera.left   = -frustum * aspect
    orthoCamera.right  =  frustum * aspect
    orthoCamera.top    =  frustum
    orthoCamera.bottom = -frustum
    orthoCamera.updateProjectionMatrix()
  }

  // ── Meshes ─────────────────────────────────────────────────────────────────

  function clearMeshes() {
    meshes.forEach(m => {
      // Dispose owned textures (not the shared placeholder)
      if (m.userData.ownedTex) m.material.uniforms.uTexture.value?.dispose()
      m.material.dispose()
      threeScene.remove(m)
    })
    meshes.length = 0
  }

  function buildMeshes(texData) {
    clearMeshes()
    const count = currentControls.count
    for (let i = 0; i < count; i++) {
      const d   = texData.length > 0 ? texData[i % texData.length] : null
      const tex = d?.tex ?? placeholderTex
      const mat = new THREE.ShaderMaterial({
        vertexShader:   VERT,
        fragmentShader: FRAG,
        uniforms: {
          uTexture: { value: tex },
          uOpacity: { value: 1.0 },
        },
        transparent: true,
        depthWrite:  false,
        side:        THREE.DoubleSide,
      })
      const mesh = new THREE.Mesh(sharedGeo, mat)
      mesh.userData.aspect   = d?.aspect ?? 1
      mesh.userData.ownedTex = !!d
      threeScene.add(mesh)
      meshes.push(mesh)
    }
  }

  // ── Layout application ─────────────────────────────────────────────────────

  function applyLayout() {
    const layoutFn = PRESET_LAYOUTS[currentPresetId]
    if (!layoutFn || meshes.length === 0) return
    const el     = renderer.domElement
    const aspect = (el.width / renderer.getPixelRatio()) / (el.height / renderer.getPixelRatio())
    meshes.forEach((mesh, i) => {
      layoutFn(mesh, i, meshes.length, animOffset, currentControls, aspect)
      // Restore image aspect ratio — layout uses setScalar (uniform) so we correct X
      mesh.scale.x *= (mesh.userData.aspect || 1)
      // Apply per-mesh opacity set by Helix / Flow
      const op = mesh.userData.opacity
      mesh.material.uniforms.uOpacity.value = op !== undefined ? Math.max(0, Math.min(1, op)) : 1.0
    })
  }

  // ── RAF loop ───────────────────────────────────────────────────────────────

  function animate(timestamp) {
    rafId = requestAnimationFrame(animate)
    if (paused) return

    if (lastTimestamp !== null) {
      const dt = (timestamp - lastTimestamp) / 1000
      animOffset = (animOffset + dt * currentControls.speed / Math.max(0.01, loopDuration)) % 1
    }
    lastTimestamp = timestamp

    updateOrthoCamera()
    applyLayout()
    renderer.render(threeScene, orthoCamera)
  }

  // ── ResizeObserver ─────────────────────────────────────────────────────────

  const ro = new ResizeObserver(entries => {
    const { width: w, height: h } = entries[0].contentRect
    if (w > 0 && h > 0) {
      renderer.setSize(w, h)
      updateOrthoCamera()
    }
  })
  ro.observe(container)

  // Start – use requestAnimationFrame so the first animate() call receives a
  // proper DOMHighResTimeStamp; calling animate() directly passes undefined,
  // which makes dt = NaN and corrupts animOffset on frame 2.
  updateOrthoCamera()
  rafId = requestAnimationFrame(animate)

  // ── Public API ─────────────────────────────────────────────────────────────

  return {
    // Load photos as textures and rebuild meshes
    async setPhotos(photos, corner) {
      const c = corner ?? currentControls.corners
      let texData = []
      if (photos.length > 0) {
        const results = await Promise.all(photos.map(p => loadPhotoTex(p.url, c)))
        texData = results.filter(Boolean)
      }
      buildMeshes(texData)
    },

    setPreset(id) {
      currentPresetId = id
    },

    setControls(controls) {
      currentControls = { ...currentControls, ...controls }
    },

    setLoopDuration(s) { loopDuration = s },

    reset() { animOffset = 0; lastTimestamp = null },

    // Frame-perfect advance for export
    stepFrame(fps) {
      const dt = 1 / fps
      animOffset = (animOffset + dt * currentControls.speed / Math.max(0.01, loopDuration)) % 1
      updateOrthoCamera()
      applyLayout()
      renderer.render(threeScene, orthoCamera)
    },

    getCanvas()        { return renderer.domElement },
    getSize()          { return { width: renderer.domElement.width, height: renderer.domElement.height } },
    getContainerSize() { return { width: container.offsetWidth, height: container.offsetHeight } },
    getPixelRatio()    { return renderer.getPixelRatio() },

    setBgColor(hex) {
      try { renderer.setClearColor(new THREE.Color(hex), 1) } catch (e) {}
    },
    restoreBgColor() { renderer.setClearColor(0x000000, 0) },

    pauseLoop()   { paused = true },
    resumeLoop()  { paused = false; lastTimestamp = null },
    togglePause() { paused = !paused; if (!paused) lastTimestamp = null },

    resize(w, h) {
      renderer.setSize(w, h, false)
      updateOrthoCamera()
    },

    renderFrame() {
      updateOrthoCamera()
      applyLayout()
      renderer.render(threeScene, orthoCamera)
    },

    cleanup() {
      if (rafId !== null) cancelAnimationFrame(rafId)
      ro.disconnect()
      clearMeshes()
      sharedGeo.dispose()
      placeholderTex.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement)
      }
    },
  }
}
