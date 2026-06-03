import { PlaneGeometry, MeshBasicMaterial, Mesh, CanvasTexture, DoubleSide } from 'three'

// Rounded-rect path — compatible with all browsers
function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// Canvas-based loader — avoids crossOrigin issues with blob URLs on iOS Safari
export function createPhotoPlane(imageUrl, scale, corner = 0) {
  return new Promise(resolve => {
    const img = new Image()

    img.onload = () => {
      const MAX    = 1024
      const aspect = img.naturalWidth / img.naturalHeight
      const s      = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight, 1))
      const w      = Math.max(1, Math.round(img.naturalWidth  * s))
      const h      = Math.max(1, Math.round(img.naturalHeight * s))

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)

      if (corner > 0) {
        const r = Math.max(1, Math.round(corner * Math.min(w, h)))
        ctx.globalCompositeOperation = 'destination-in'
        roundRectPath(ctx, 0, 0, w, h, r)
        ctx.fillStyle = 'black'
        ctx.fill()
        ctx.globalCompositeOperation = 'source-over'
      }

      const texture = new CanvasTexture(canvas)
      // Normalized geometry: aspect × 1, overall size controlled by mesh.scale
      const geo     = new PlaneGeometry(aspect, 1)
      const mat     = new MeshBasicMaterial({ map: texture, side: DoubleSide, transparent: true })
      const mesh    = new Mesh(geo, mat)
      mesh.scale.setScalar(scale)
      mesh.userData.imageUrl = imageUrl
      mesh.userData.aspect   = aspect
      resolve(mesh)
    }

    img.onerror = () => {
      const geo  = new PlaneGeometry(1, 1)
      const mat  = new MeshBasicMaterial({ color: 0x333330, side: DoubleSide })
      const mesh = new Mesh(geo, mat)
      mesh.scale.setScalar(scale)
      mesh.userData.imageUrl = imageUrl
      mesh.userData.aspect   = 1
      resolve(mesh)
    }

    img.src = imageUrl
  })
}

export function disposePhotoPlane(mesh) {
  if (mesh.parent) mesh.parent.remove(mesh)
  mesh.geometry.dispose()
  if (mesh.material.map) mesh.material.map.dispose()
  mesh.material.dispose()
}
