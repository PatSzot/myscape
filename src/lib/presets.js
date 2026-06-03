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

// ─── Exports ──────────────────────────────────────────────────────────────────

export const PRESETS = { sphere: SPHERE, ring: RING, helix: HELIX, flow: FLOW, explore: EXPLORE }
export const PRESET_IDS = ['sphere', 'ring', 'helix', 'flow', 'explore']
