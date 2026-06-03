import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'
import { recordPath1 } from './recorder.js'

// ─── Shaders ──────────────────────────────────────────────────────────────────

const VERT = /* glsl */`
  varying vec2 vUv;
  uniform float uSizeX;
  uniform float uSizeY;

  void main() {
    vUv = uv;
    vec3 worldCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 right = normalize(vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]));
    vec3 up    = normalize(vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]));
    vec4 viewCenter = viewMatrix * vec4(worldCenter, 1.0);
    float dist  = max(0.5, -viewCenter.z);
    float scale = clamp(7.0 / dist, 0.15, 3.5);
    vec3 finalPos = worldCenter
      + right * position.x * scale * uSizeX
      + up    * position.y * scale * uSizeY;
    gl_Position = projectionMatrix * viewMatrix * vec4(finalPos, 1.0);
  }
`

const FRAG = /* glsl */`
  uniform sampler2D uTexture;
  uniform float uOpacity;
  varying vec2 vUv;
  void main() {
    vec4 color = texture2D(uTexture, vUv);
    gl_FragColor = vec4(color.rgb, color.a * uOpacity);
  }
`

// ─── Asset order ──────────────────────────────────────────────────────────────

const LETTERS = ['/M.jpg', '/Y.jpg', '/S.jpg', '/C.jpg', '/A.jpg', '/P.jpg', '/E.jpg']
const PARTICLE_COUNT = 7

// ─── CSS-style corner clip ────────────────────────────────────────────────────

function clipRoundRect(ctx, w, h, r) {
  if (r <= 0) return
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(w - r, 0)
  ctx.arcTo(w, 0,   w, r,   r)
  ctx.lineTo(w, h - r)
  ctx.arcTo(w, h,   w - r, h, r)
  ctx.lineTo(r, h)
  ctx.arcTo(0, h,   0, h - r, r)
  ctx.lineTo(0, r)
  ctx.arcTo(0, 0,   r, 0,   r)
  ctx.closePath()
  ctx.clip()
}

// ─── Asset loader (SVG / JPEG) ────────────────────────────────────────────────

function loadSvg(url, corner = 0) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const w = img.naturalWidth  || 99
      const h = img.naturalHeight || 78
      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      clipRoundRect(ctx, w, h, Math.round(Math.min(w, h) * corner))
      ctx.drawImage(img, 0, 0)
      const tex = new THREE.CanvasTexture(canvas)
      resolve({ tex, aspect: w / h })
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// ─── Photo texture loader (canvas-based — safe for blob URLs on iOS) ──────────
// Metadata is drawn OUTSIDE the image, below it, left-aligned.

async function loadAsTexture(url, meta = {}, corner = 0) {
  await document.fonts.ready
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const MAX   = 1024
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight, 1))
      const w     = Math.max(1, Math.round(img.naturalWidth  * scale))
      const h     = Math.max(1, Math.round(img.naturalHeight * scale))

      const lines = [meta.location, meta.date].filter(Boolean)
      const fs    = Math.max(9, Math.round(w * 0.031))
      const lineH = Math.round(fs * 1.55)
      const gap   = Math.round(fs * 0.7)   // vertical space between image bottom and text
      const metaH = lines.length > 0 ? gap + lines.length * lineH : 0

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h + metaH
      const ctx = canvas.getContext('2d')

      // Draw image with rounded corners — save/restore so the clip doesn't affect text
      ctx.save()
      clipRoundRect(ctx, w, h, Math.round(Math.min(w, h) * corner))
      ctx.drawImage(img, 0, 0, w, h)
      ctx.restore()

      // Draw metadata below the image, left-aligned
      if (lines.length > 0) {
        ctx.font          = `500 ${fs}px "IBM Plex Mono", monospace`
        ctx.fillStyle     = 'rgba(255, 255, 255, 0.9)'
        ctx.textAlign     = 'left'
        ctx.textBaseline  = 'top'
        ctx.letterSpacing = '0.04em'
        ctx.shadowColor   = 'rgba(0, 0, 0, 0.6)'
        ctx.shadowBlur    = 4
        ctx.shadowOffsetY = 1

        lines.forEach((line, i) => {
          ctx.fillText(line.toUpperCase(), 0, h + gap + i * lineH)
        })
      }

      const tex = new THREE.CanvasTexture(canvas)
      // Aspect uses the full canvas height (image + metadata area)
      resolve({ tex, aspect: w / (h + metaH) })
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export async function initScene(container) {
  const W = window.innerWidth
  const H = window.innerHeight

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(W, H)
  renderer.setClearColor(0x000000, 0)  // transparent — background comes from body CSS
  container.appendChild(renderer.domElement)

  const scene  = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 120)
  camera.position.set(0, 0, 10)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping   = true
  controls.dampingFactor   = 0.06
  controls.minDistance     = 4
  controls.maxDistance     = 40
  controls.rotateSpeed     = 0.6
  controls.zoomSpeed       = 0.8
  controls.autoRotate      = false

  // ─── Style state ─────────────────────────────────────────────────────────
  // corner: proportion of shorter side used as border-radius in canvas (0 = none)
  const style = { corner: 0.0 }

  // ─── Load MYSCAPE assets in order ────────────────────────────────────────
  const assets = await Promise.all(LETTERS.map(url => loadSvg(url, style.corner)))

  // ─── Build particle cloud ─────────────────────────────────────────────────
  const geo       = new THREE.PlaneGeometry(1, 1)
  const particles = []

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const asset = assets[i % LETTERS.length]
    if (!asset) continue

    const { tex, aspect } = asset
    const base = 1.1

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uTexture: { value: tex },
        uSizeX:   { value: aspect >= 1 ? base : base * aspect },
        uSizeY:   { value: aspect >= 1 ? base / aspect : base },
        uOpacity: { value: 1.0 },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData.baseSize = base
    mesh.position.set(0, 0, 0)

    // Positions match the MYSCAPE logo layout (M, Y, S, C, A, P, E order)
    // M is closest (front), E is farthest (back)
    const POSITIONS = [
      [-2.5,  0.3],  // M — left, mid
      [-1.2, -0.4],  // Y — left, below mid
      [ 0.0,  2.3],  // S — top center
      [ 1.0,  1.0],  // C — center right
      [ 2.6,  0.1],  // A — right middle
      [ 1.5, -1.4],  // P — center right, low
      [ 0.6, -3.8],  // E — bottom center
    ]
    const tx = POSITIONS[i][0]
    const ty = POSITIONS[i][1]
    const tz = (3 - i) * 1.0  // M: +3, Y: +2, ... E: -3

    gsap.to(mesh.position, {
      x: tx, y: ty, z: tz,
      duration: 1.4 + i * 0.04,
      delay: i * 0.13,
      ease: 'expo.out',
      onComplete() {
        gsap.to(mesh.position, {
          y: ty + 0.08,
          duration: 2.5 + Math.random() * 2,
          ease: 'sine.inOut', yoyo: true, repeat: -1,
          delay: Math.random() * 1.5,
        })
      },
    })

    scene.add(mesh)
    particles.push(mesh)
  }

  // ─── Spawn a new particle at a random position ───────────────────────────

  function spawnParticle() {
    const r    = 8
    const tx   = (Math.random() - 0.5) * r * 2
    const ty   = (Math.random() - 0.5) * r
    const tz   = (Math.random() - 0.5) * r * 1.5
    const base = 1.0 + Math.random() * 0.2
    const placeholder = assets[Math.floor(Math.random() * assets.length)]

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uTexture: { value: placeholder?.tex ?? assets[0].tex },
        uSizeX:   { value: base },
        uSizeY:   { value: base },
        uOpacity: { value: 0 },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData.baseSize = base
    mesh.position.set(0, 0, 0)

    gsap.to(mesh.position, {
      x: tx, y: ty, z: tz,
      duration: 1.4, ease: 'expo.out',
      onComplete() {
        gsap.to(mesh.position, {
          y: ty + 0.08,
          duration: 2.5 + Math.random() * 2,
          ease: 'sine.inOut', yoyo: true, repeat: -1,
          delay: Math.random() * 1.5,
        })
      },
    })

    scene.add(mesh)
    particles.push(mesh)
    return mesh
  }

  // ─── updateTextures — one container per image, no repeats ────────────────

  function updateTextures(images, onProgress) {
    // Grow the scape to fit all images
    while (particles.length < images.length) spawnParticle()

    const total = images.length
    let done = 0

    // Assign each image to its own particle
    images.forEach(({ url, meta = {} }, i) => {
      const mesh  = particles[i]
      const delay = i * 0.015 + Math.random() * 0.1

      gsap.to(mesh.material.uniforms.uOpacity, {
        value: 0, duration: 0.18, delay,
        onComplete() {
          loadAsTexture(url, meta, style.corner).then(result => {
            if (result) {
              const { tex, aspect } = result
              mesh.material.uniforms.uTexture.value = tex
              const base = mesh.userData.baseSize
              mesh.material.uniforms.uSizeX.value = aspect >= 1 ? base : base * aspect
              mesh.material.uniforms.uSizeY.value = aspect >= 1 ? base / aspect : base
            }
            gsap.to(mesh.material.uniforms.uOpacity, { value: 1, duration: 0.3 })
            if (onProgress) onProgress(++done, total)
          })
        },
      })
    })

    // Hide any particles beyond the current image count
    for (let i = images.length; i < particles.length; i++) {
      gsap.to(particles[i].material.uniforms.uOpacity, { value: 0, duration: 0.3 })
    }
  }

  // ─── Resize / render loop ─────────────────────────────────────────────────

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

  let rafId
  let paused = false
  function animate() {
    rafId = requestAnimationFrame(animate)
    if (!paused) {
      controls.update()
      renderer.render(scene, camera)
    }
  }
  animate()

  return {
    updateTextures,
    setBackground(_hex) { /* background handled by body CSS; recorder sets clearColor directly */ },
    setStyle({ corner }) {
      if (corner !== undefined) style.corner = corner
    },
    async reloadDefaults() {
      const fresh = await Promise.all(LETTERS.map(url => loadSvg(url, style.corner)))
      fresh.forEach((asset, i) => {
        if (!asset || i >= particles.length) return
        const mesh = particles[i]
        mesh.material.uniforms.uTexture.value = asset.tex
        const base = mesh.userData.baseSize
        mesh.material.uniforms.uSizeX.value = asset.aspect >= 1 ? base : base * asset.aspect
        mesh.material.uniforms.uSizeY.value = asset.aspect >= 1 ? base / asset.aspect : base
      })
    },
    async startRecording(bgColor, onProgress) {
      paused = true
      try {
        return await recordPath1(renderer, scene, particles, bgColor, onProgress)
      } finally {
        paused = false
      }
    },
    cleanup() {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      gsap.killTweensOf(particles.map(m => m.position))
      renderer.dispose()
      container.removeChild(renderer.domElement)
    },
  }
}
