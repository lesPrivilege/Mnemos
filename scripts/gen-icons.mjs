import sharp from 'sharp'
import { readFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ANDROID_RES = join(__dirname, '..', 'android/app/src/main/res')

const BG = '#FAF8F5'
const INK = '#2D2920'
const ACCENT = '#B86A30'

const densities = {
  mdpi:    108,
  hdpi:    162,
  xhdpi:   216,
  xxhdpi:  324,
  xxxhdpi: 432,
}

const foregroundSvg = readFileSync(join(__dirname, 'ic_foreground.svg'), 'utf-8')

function makeBackgroundSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${BG}"/>
</svg>`
}

function makeLegacySvg(size) {
  const r = size * 0.224 * 4.5
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FAF8F5"/>
      <stop offset="1" stop-color="#F5F0E8"/>
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="${r}" fill="url(#bg)"/>
  <rect x="14" y="14" width="228" height="228" rx="${r*0.89}" fill="none" stroke="${INK}" stroke-opacity="0.08" stroke-width="1.5"/>
  <g transform="translate(40, 56)">
    <path d="M0 144 L0 0 L36 0 L88 64 L140 0 L176 0 L176 144" stroke="${INK}" stroke-width="18" stroke-linecap="square" stroke-linejoin="miter" fill="none"/>
    <path d="M40 36 L88 92 L136 36" stroke="${ACCENT}" stroke-width="12" stroke-linecap="square" stroke-linejoin="miter" fill="none"/>
    <rect x="-14" y="138" width="42" height="14" fill="${INK}"/>
    <rect x="148" y="138" width="42" height="14" fill="${INK}"/>
  </g>
</svg>`
}

async function generate() {
  for (const [density, size] of Object.entries(densities)) {
    const dir = join(ANDROID_RES, `mipmap-${density}`)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    // Foreground (adaptive) — render from the centered foreground SVG
    await sharp(Buffer.from(foregroundSvg))
      .resize(size, size, { kernel: 'lanczos3' })
      .png({ compressionLevel: 0 })
      .toFile(join(dir, 'ic_launcher_foreground.png'))

    // Background (adaptive) — solid color
    await sharp(Buffer.from(makeBackgroundSvg(size)))
      .resize(size, size)
      .png()
      .toFile(join(dir, 'ic_launcher_background.png'))

    // Legacy icon (pre-API 26) — full rounded icon
    await sharp(Buffer.from(makeLegacySvg(size)))
      .resize(size, size)
      .png()
      .toFile(join(dir, 'ic_launcher.png'))

    // Round legacy icon — same as legacy for simplicity
    await sharp(Buffer.from(makeLegacySvg(size)))
      .resize(size, size)
      .png()
      .toFile(join(dir, 'ic_launcher_round.png'))

    console.log(`  ${density}: ${size}px`)
  }
  console.log('Done!')
}

generate().catch(console.error)
