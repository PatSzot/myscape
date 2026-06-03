// ─── Shared layout helper ─────────────────────────────────────────────────────

// Apply scale + visibility to all meshes based on count
function applyVisibility(meshes, controls) {
  const N = Math.min(meshes.length, controls.count)
  meshes.forEach((mesh, i) => {
    mesh.visible = i < N
    if (i < N) mesh.scale.setScalar(controls.scale)
  })
  return N
}

// ─── Preset definitions ───────────────────────────────────────────────────────

const SPHERE = {
  id: 'sphere',
  label: 'SPHERE',
  defaults: { count: 28, zoom: 2.4, radius: 1.8, scale: 0.55, speed: 0.4 },

  layoutPhotos(meshes, controls) {
    const N = applyVisibility(meshes, controls)
    const r = controls.radius
    for (let i = 0; i < N; i++) {
      const mesh  = meshes[i]
      const theta = i * 2.399963
      const phi   = Math.acos(1 - 2 * (i + 0.5) / N)
      mesh.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      )
      mesh.lookAt(0, 0, 0)
    }
  },

}

const RING = {
  id: 'ring',
  label: 'RING',
  defaults: { count: 18, zoom: 2.2, radius: 2.0, scale: 0.65, speed: 0.5 },

  layoutPhotos(meshes, controls) {
    const N = applyVisibility(meshes, controls)
    const r = controls.radius
    for (let i = 0; i < N; i++) {
      const angle = (i / N) * Math.PI * 2
      meshes[i].position.set(r * Math.cos(angle), 0, r * Math.sin(angle))
      meshes[i].lookAt(0, 0, 0)
    }
  },

}

const HELIX = {
  id: 'helix',
  label: 'HELIX',
  defaults: { count: 21, zoom: 1.8, radius: 1.6, scale: 0.6, speed: 0.35 },

  layoutPhotos(meshes, controls) {
    const N            = applyVisibility(meshes, controls)
    const r            = controls.radius
    const photosPerTurn = 7
    for (let i = 0; i < N; i++) {
      const angle = (i / photosPerTurn) * Math.PI * 2
      meshes[i].position.set(
        r * Math.cos(angle),
        (i - N / 2) * 0.45,
        r * Math.sin(angle)
      )
      meshes[i].rotation.set(0, -angle, 0)
    }
  },

}

const FLOW = {
  id: 'flow',
  label: 'FLOW',
  defaults: { count: 32, zoom: 1.9, radius: 2.4, scale: 0.55, speed: 0.3 },

  layoutPhotos(meshes, controls) {
    const N = applyVisibility(meshes, controls)
    const r = controls.radius
    for (let i = 0; i < N; i++) {
      meshes[i].position.set(
        Math.sin(i * 1.618033) * r * 2.2,
        Math.cos(i * 2.718281) * r * 0.9,
        Math.sin(i * 3.141592 + 1) * r * 2.2
      )
      meshes[i].rotation.set(0, Math.sin(i * 0.7) * 0.4, 0)
    }
  },

}

const EXPLORE = {
  id: 'explore',
  label: 'EXPLORE',
  defaults: { count: 32, zoom: 2.0, radius: 2.4, scale: 0.65, speed: 1.0 },

  // Same organic scatter as FLOW
  layoutPhotos(meshes, controls) {
    const N = applyVisibility(meshes, controls)
    const r = controls.radius
    for (let i = 0; i < N; i++) {
      meshes[i].position.set(
        Math.sin(i * 1.618033) * r * 2.2,
        Math.cos(i * 2.718281) * r * 0.9,
        Math.sin(i * 3.141592 + 1) * r * 2.2
      )
      meshes[i].rotation.set(0, Math.sin(i * 0.7) * 0.4, 0)
    }
  },

}

// ─── Rotating Images (fan/wheel) ──────────────────────────────────────────────

function getSpreadDegrees(n) {
  if (n <= 1) return 0
  if (n <= 12) return (n - 1) * 40
  return Math.min(320 + (n - 12) * 3, 355)
}

const ROTATING_IMAGES = {
  id: 'rotatingImages',
  label: 'ROTATING IMAGES',
  defaults: { count: null, zoom: 1.0, radius: 2.2, scale: 0.9, speed: 1.0 },

  layoutPhotos(meshes, controls, canvasWidth = 1080, canvasHeight = 1080) {
    const N = meshes.length
    if (N === 0) return

    const referenceSize = Math.min(canvasWidth, canvasHeight)
    const canvasScale   = referenceSize / 1080

    const baseCardSize  = controls.scale * canvasScale
    const cardSize      = Math.max(baseCardSize * (9 / Math.max(N, 9)), baseCardSize * 0.25)

    const spreadDegrees    = getSpreadDegrees(N)
    const spreadRadians    = (spreadDegrees * Math.PI) / 180
    const targetArcSpacing = cardSize * 1.15
    const minRadius        = controls.radius * canvasScale
    const dynamicRadius    = N <= 1
      ? minRadius
      : Math.max(minRadius, (targetArcSpacing * (N - 1)) / Math.max(spreadRadians, 0.01))

    meshes.forEach((mesh, i) => {
      const angleDeg = N === 1 ? 0 : -spreadDegrees / 2 + (i / (N - 1)) * spreadDegrees
      const angleRad = (angleDeg * Math.PI) / 180
      mesh.position.set(
        Math.sin(angleRad) * dynamicRadius,
        Math.cos(angleRad) * dynamicRadius * -1,
        0
      )
      mesh.rotation.set(0, 0, 0)
      mesh.userData.fanAngle = angleDeg
      mesh.userData.fanIndex = i
      mesh.userData.fanTotal = N
      mesh.scale.setScalar(cardSize)
      mesh.visible = true
    })
  },

}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const PRESETS = { sphere: SPHERE, ring: RING, helix: HELIX, flow: FLOW, explore: EXPLORE, rotatingImages: ROTATING_IMAGES }
export const PRESET_IDS = ['sphere', 'ring', 'helix', 'flow', 'explore', 'rotatingImages']
