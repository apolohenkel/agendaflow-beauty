// Regenera app/favicon.ico desde public/brand/agendaflow-favicon.svg
// Uso: node scripts/generate-favicon.js
//
// Produce un .ico multi-resolución (16, 32, 48) para compatibilidad legacy.
// Los navegadores modernos usan el SVG directo vía layout.js (icons.icon).

const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

const SVG = path.join(__dirname, '..', 'public', 'brand', 'agendaflow-favicon.svg')
const ICO = path.join(__dirname, '..', 'app', 'favicon.ico')

// Construye un ICO v1 manualmente: header + dir entries + PNG payloads.
// Ver spec: https://en.wikipedia.org/wiki/ICO_(file_format)
async function main() {
  const svg = fs.readFileSync(SVG)
  const sizes = [16, 32, 48]
  const pngs = await Promise.all(
    sizes.map((s) =>
      sharp(svg).resize(s, s).png({ compressionLevel: 9 }).toBuffer()
    )
  )

  // ICONDIR header: reserved(2) + type(2) + count(2) = 6 bytes
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(sizes.length, 4) // image count

  // Cada ICONDIRENTRY = 16 bytes
  let offset = 6 + 16 * sizes.length
  const entries = []
  for (let i = 0; i < sizes.length; i++) {
    const e = Buffer.alloc(16)
    const s = sizes[i] === 256 ? 0 : sizes[i]
    e.writeUInt8(s, 0) // width
    e.writeUInt8(s, 1) // height
    e.writeUInt8(0, 2) // color palette
    e.writeUInt8(0, 3) // reserved
    e.writeUInt16LE(1, 4) // planes
    e.writeUInt16LE(32, 6) // bits per pixel
    e.writeUInt32LE(pngs[i].length, 8) // image data size
    e.writeUInt32LE(offset, 12) // offset to image data
    entries.push(e)
    offset += pngs[i].length
  }

  const ico = Buffer.concat([header, ...entries, ...pngs])
  fs.writeFileSync(ICO, ico)
  console.log(`✓ Favicon regenerado: ${ICO} (${ico.length} bytes, ${sizes.join('x')})`)
}

main().catch((err) => {
  console.error('Error generando favicon:', err)
  process.exit(1)
})
