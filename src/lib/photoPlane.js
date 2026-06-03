import { PlaneGeometry, MeshBasicMaterial, Mesh, CanvasTexture, DoubleSide } from 'three'

// Canvas-based loader — avoids crossOrigin issues with blob URLs on iOS Safari
export function createPhotoPlane(imageUrl, scale) {
  return new Promise(resolve => {
    const img = new Image()

    img.onload = () => {
      const MAX     = 1024
      const aspect  = img.naturalWidth / img.naturalHeight
      const s       = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight, 1))
      const w       = Math.max(1, Math.round(img.naturalWidth  * s))
      const h       = Math.max(1, Math.round(img.naturalHeight * s))

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)

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
      const mat  = new MeshBasicMaterial({ color: 0x999999, side: DoubleSide })
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
