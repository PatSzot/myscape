import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import gsap from 'gsap'
import { createTexturePool } from './texturePool.js'

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
    float scale = clamp(6.0 / dist, 0.12, 3.0);
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
    gl_FragColor = vec4(color.rgb, uOpacity);
  }
`

// ─── Meta overlay ─────────────────────────────────────────────────────────────

function drawMeta(ctx, w, h, { date, location } = {}) {
  const lines = [location, date].filter(Boolean)
  if (!lines.length) return

  const fs   = Math.max(9,  Math.round(w * 0.031))
  const pad  = Math.round(w * 0.048)
  const lineH = Math.round(fs * 1.65)
  const zone  = pad + lines.length * lineH

  // Gradient scrim
  const grad = ctx.createLinearGradient(0, h - zone * 2.2, 0, h)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.62)')
  ctx.fillStyle = grad
  ctx.fillRect(0, h - zone * 2.2, w, zone * 2.2)

  // Text — IBM Plex Mono, all caps
  ctx.font      = `500 ${fs}px "IBM Plex Mono", monospace`
  ctx.fillStyle = 'rgba(255,255,255,0.93)'
  ctx.textAlign    = 'left'
  ctx.textBaseline = 'bottom'
  ctx.letterSpacing = '0.04em'

  lines.forEach((line, i) => {
    const y = h - Math.round(pad * 0.35) - (lines.length - 1 - i) * lineH
    ctx.fillText(line.toUpperCase(), pad, y)
  })
}

// ─── Texture loader (canvas-based — safe for blob URLs on iOS) ────────────────

async function loadAsTexture(url, meta = {}) {
  // Ensure fonts are ready before drawing text
  await document.fonts.ready

  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const MAX   = 1024
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight, 1))
      const w     = Math.max(1, Math.round(img.naturalWidth  * scale))
      const h     = Math.max(1, Math.round(img.naturalHeight * scale))

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')

      ctx.drawImage(img, 0, 0, w, h)
      drawMeta(ctx, w, h, meta)

      const tex = new THREE.CanvasTexture(canvas)
      tex.colorSpace = THREE.SRGBColorSpace
      resolve({ tex, aspect: img.naturalWidth / img.naturalHeight })
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// ─── Scene ────────────────────────────────────────────────────────────────────

export function initScene(container) {
  const W = window.innerWidth
  const H = window.innerHeight

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(W, H)
  renderer.setClearColor(0xF5F3EC, 1)
  container.appendChild(renderer.domElement)

  const scene  = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 120)
  camera.position.set(0, 0, 20)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping  = true
  controls.dampingFactor  = 0.06
  controls.minDistance    = 4
  controls.maxDistance    = 50
  controls.rotateSpeed    = 0.6
  controls.zoomSpeed      = 0.8

  const pool     = createTexturePool()
  const animated = pool.filter(e => e.animated)
  const geo      = new THREE.PlaneGeometry(1, 1)
  const particles = []

  for (let i = 0; i < 100; i++) {
    const entry = pool[Math.floor(Math.random() * pool.length)]
    const base  = 0.9 + Math.random() * 1.3

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        uTexture: { value: entry.tex },
        uSizeX:   { value: base },
        uSizeY:   { value: base },
        uOpacity: { value: 1.0 },
      },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })

    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData.baseSize = base

    const r  = 14
    const tx = (Math.random() - 0.5) * r * 2
    const ty = (Math.random() - 0.5) * r * 1.2
    const tz = (Math.random() - 0.5) * r * 2

    mesh.position.set(0, 0, 0)
    gsap.to(mesh.position, {
      x: tx, y: ty, z: tz,
      duration: 1.8 + Math.random() * 1.4,
      delay: Math.random() * 0.6,
      ease: 'expo.out',
      onComplete() {
        gsap.to(mesh.position, {
          x: tx + (Math.random() - 0.5) * 0.6,
          y: ty + (Math.random() - 0.5) * 0.6,
          duration: 3 + Math.random() * 4,
          ease: 'sine.inOut', yoyo: true, repeat: -1,
          delay: Math.random() * 3,
        })
      },
    })

    scene.add(mesh)
    particles.push(mesh)
  }

  // ─── updateTextures({ url, meta }[]) ────────────────────────────────────────

  function updateTextures(images, onProgress) {
    const total = particles.length
    let done = 0

    particles.forEach((mesh, i) => {
      const { url, meta = {} } = images[i % images.length]
      const delay = i * 0.015 + Math.random() * 0.1

      gsap.to(mesh.material.uniforms.uOpacity, {
        value: 0, duration: 0.18, delay,
        onComplete() {
          loadAsTexture(url, meta).then(result => {
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
  }

  // ─── Resize / loop ────────────────────────────────────────────────────────

  function onResize() {
    const w = window.innerWidth, h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  }
  window.addEventListener('resize', onResize)

  let rafId
  const clock = new THREE.Clock()
  function animate() {
    rafId = requestAnimationFrame(animate)
    const t = clock.getElapsedTime()
    for (const e of animated) e.update(t)
    controls.update()
    renderer.render(scene, camera)
  }
  animate()

  return {
    updateTextures,
    cleanup() {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', onResize)
      gsap.killTweensOf(particles.map(m => m.position))
      renderer.dispose()
      container.removeChild(renderer.domElement)
    },
  }
}
