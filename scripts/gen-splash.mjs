import sharp from 'sharp'
import { mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ANDROID_RES = join(__dirname, '..', 'android/app/src/main/res')

/* 牌记：BG 影刻自 src/styles/tokens.css --bg（light, oklch(98.2% 0.002 250)）
   的 sRGB 折算值——splash 与首帧同底，冷启动无闪变（记-04）。底本改则此值随改，
   并重跑本脚本。INK/ACCENT 为品牌 icon 实物之色，不随底本（icon 经主认可）。 */
const BG = '#F8F9FA'
const INK = '#2D2920'
const ACCENT = '#B86A30'

// Splash screen sizes per density + orientation
const sizes = [
  { dir: 'drawable',              w: 480, h: 320  },  // land-mdpi (default)
  { dir: 'drawable-land-mdpi',    w: 480, h: 320  },
  { dir: 'drawable-land-hdpi',    w: 800, h: 480  },
  { dir: 'drawable-land-xhdpi',   w: 1280, h: 720 },
  { dir: 'drawable-land-xxhdpi',  w: 1600, h: 960 },
  { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280},
  { dir: 'drawable-port-mdpi',    w: 320, h: 480  },
  { dir: 'drawable-port-hdpi',    w: 480, h: 800  },
  { dir: 'drawable-port-xhdpi',   w: 720, h: 1280 },
  { dir: 'drawable-port-xxhdpi',  w: 960, h: 1600 },
  { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920},
]

function makeSplashSvg(w, h) {
  // M mark size: ~30% of smaller dimension, capped at 200dp
  const markSize = Math.min(Math.round(Math.min(w, h) * 0.30), 200)
  // Scale factor from 64x64 viewBox to markSize
  const scale = markSize / 64
  // Center the M
  const tx = (w - 52 * scale) / 2 - 6 * scale  // adjust for M visual bounds
  const ty = (h - 43 * scale) / 2 - 11 * scale

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">
  <rect width="${w}" height="${h}" fill="${BG}"/>
  <g transform="translate(${tx.toFixed(1)}, ${ty.toFixed(1)}) scale(${scale.toFixed(3)})">
    <path d="M10 52 L10 14 L20 14 L32 30 L44 14 L54 14 L54 52"
      stroke="${INK}" stroke-width="6" stroke-linecap="square" stroke-linejoin="miter"/>
    <path d="M22 24 L32 38 L42 24"
      stroke="${ACCENT}" stroke-width="4" stroke-linecap="square" stroke-linejoin="miter"/>
    <rect x="6" y="50" width="12" height="4" fill="${INK}"/>
    <rect x="46" y="50" width="12" height="4" fill="${INK}"/>
  </g>
</svg>`
}

async function generate() {
  for (const { dir, w, h } of sizes) {
    const dirPath = join(ANDROID_RES, dir)
    if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true })

    const svg = Buffer.from(makeSplashSvg(w, h))
    await sharp(svg)
      .resize(w, h, { kernel: 'lanczos3' })
      .png()
      .toFile(join(dirPath, 'splash.png'))

    console.log(`  ${dir}: ${w}x${h}`)
  }
  console.log('Done!')
}

generate().catch(console.error)
