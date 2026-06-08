// ─── Photo Booth renderer ─────────────────────────────────────────────────────
// Draws a classic 3-photo strip (portrait frame with 3 stacked slots).
// Frame is white on dark background, black on light background.
// Photos are randomly selected from the provided array on each setPhotos call.

function isDark(hex) {
  const h = (hex || '#000000').replace('#', '')
  if (h.length < 6) return true
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.299 * r + 0.587 * g + 0.114 * b < 0.5
}

function pickRandom(photos, n) {
  if (!photos.length) return []
  const shuffled = [...photos].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

function loadImg(url) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

function getLayout(cw, ch) {
  const stripW   = Math.round(Math.min(cw, ch) * 0.22)
  const framePad = Math.max(4, Math.round(stripW * 0.070))
  const gap      = Math.max(2, Math.round(stripW * 0.045))

  const photoW = stripW - 2 * framePad
  const photoH = photoW  // square slots — consistent across all formats

  const stripH = 2 * framePad + 3 * photoH + 2 * gap
  const stripX = Math.round((cw - stripW) / 2)
  const stripY = Math.round((ch - stripH) / 2)

  return { stripX, stripY, stripW, stripH, framePad, gap, photoW, photoH }
}

function drawCover(ctx, img, x, y, w, h) {
  const ir = img.naturalWidth / img.naturalHeight
  const sr = w / h
  let dw, dh, dx, dy
  if (ir > sr) {
    dh = h; dw = h * ir; dx = x - (dw - w) / 2; dy = y
  } else {
    dw = w; dh = w / ir; dx = x; dy = y - (dh - h) / 2
  }
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, dx, dy, dw, dh)
  ctx.restore()
}

export function createPhotoBoothRenderer(photos) {
  let selected    = pickRandom(photos, 3)
  let loaded      = []          // HTMLImageElement | null, length = selected.length
  let onRedrawFn  = null

  async function loadSelected() {
    loaded = await Promise.all(selected.map(p => loadImg(p.url)))
    onRedrawFn?.()
  }

  loadSelected()

  function draw(canvas, bgColor) {
    const ctx = canvas.getContext('2d')
    const cw  = canvas.width
    const ch  = canvas.height
    const bg  = bgColor || '#0d0d0d'

    ctx.fillStyle = bg
    ctx.fillRect(0, 0, cw, ch)

    const frameColor = isDark(bg) ? '#ffffff' : '#000000'
    const { stripX, stripY, stripW, stripH, framePad, gap, photoW, photoH } = getLayout(cw, ch)

    // Draw frame
    ctx.fillStyle = frameColor
    ctx.fillRect(stripX, stripY, stripW, stripH)

    // Fill 3 photo slots
    const available = loaded.filter(Boolean)
    for (let i = 0; i < 3; i++) {
      const px = stripX + framePad
      const py = stripY + framePad + i * (photoH + gap)
      const img = available.length > 0 ? available[i % available.length] : null
      if (img) {
        drawCover(ctx, img, px, py, photoW, photoH)
      } else {
        ctx.fillStyle = 'rgba(128,128,128,0.25)'
        ctx.fillRect(px, py, photoW, photoH)
      }
    }
  }

  return {
    draw,
    stepFrame(_fps, canvas, bgColor) { draw(canvas, bgColor) },

    setPhotos(newPhotos) {
      selected = pickRandom(newPhotos, 3)
      loaded   = []
      loadSelected()
    },

    onRedraw(fn) { onRedrawFn = fn },

    // No-ops for export2D compat
    pause()  {},
    resume() {},
    stop()   {},
    start()  {},
    reset()  {},
  }
}
