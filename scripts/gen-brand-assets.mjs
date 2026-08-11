import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { brandPalette, brandSvg, repoRoot } from './lib/brand-assets.mjs'

const androidRes = join(repoRoot, 'android/app/src/main/res')
const iosAssets = join(repoRoot, 'ios/App/App/Assets.xcassets')

const androidDensities = {
  mdpi: 108,
  hdpi: 162,
  xhdpi: 216,
  xxhdpi: 324,
  xxxhdpi: 432,
}

const splashSizes = [
  { dir: 'drawable',              width: 480,  height: 320,  scale: 1 },
  { dir: 'drawable-land-mdpi',    width: 480,  height: 320,  scale: 1 },
  { dir: 'drawable-land-hdpi',    width: 800,  height: 480,  scale: 1.5 },
  { dir: 'drawable-land-xhdpi',   width: 1280, height: 720,  scale: 2 },
  { dir: 'drawable-land-xxhdpi',  width: 1600, height: 960,  scale: 3 },
  { dir: 'drawable-land-xxxhdpi', width: 1920, height: 1280, scale: 4 },
  { dir: 'drawable-port-mdpi',    width: 320,  height: 480,  scale: 1 },
  { dir: 'drawable-port-hdpi',    width: 480,  height: 800,  scale: 1.5 },
  { dir: 'drawable-port-xhdpi',   width: 720,  height: 1280, scale: 2 },
  { dir: 'drawable-port-xxhdpi',  width: 960,  height: 1600, scale: 3 },
  { dir: 'drawable-port-xxxhdpi', width: 1280, height: 1920, scale: 4 },
]

function ensureParent(path) {
  mkdirSync(dirname(path), { recursive: true })
}

async function writePng(svg, path) {
  ensureParent(path)
  await sharp(Buffer.from(svg)).png().toFile(path)
}

async function generateAndroidIcons() {
  for (const [density, size] of Object.entries(androidDensities)) {
    const dir = join(androidRes, `mipmap-${density}`)
    const markSize = size * (64 / 108)

    await writePng(brandSvg({
      width: size,
      palette: brandPalette.dark,
      background: 'none',
      markSize,
    }), join(dir, 'ic_launcher_foreground.png'))

    await writePng(brandSvg({
      width: size,
      palette: brandPalette.dark,
      markSize: 0,
      opticalShiftY: 0,
    }), join(dir, 'ic_launcher_background.png'))

    await writePng(brandSvg({
      width: size,
      palette: brandPalette.dark,
      radius: size * 0.225,
      markSize: size * 0.68,
    }), join(dir, 'ic_launcher.png'))

    await writePng(brandSvg({
      width: size,
      palette: brandPalette.dark,
      radius: size / 2,
      markSize: size * 0.66,
    }), join(dir, 'ic_launcher_round.png'))
  }

  writeFileSync(
    join(androidRes, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${brandPalette.dark.bg.toUpperCase()}</color>\n</resources>\n`,
  )
}

async function generateIosIcon() {
  await writePng(brandSvg({
    width: 1024,
    palette: brandPalette.dark,
    markSize: 680,
    opticalShiftY: 16,
  }), join(iosAssets, 'AppIcon.appiconset/AppIcon-512@2x.png'))
}

async function generateReferenceIcons() {
  await writePng(brandSvg({
    width: 432,
    palette: brandPalette.dark,
    radius: 96,
    markSize: 294,
  }), join(repoRoot, 'docs/icon.png'))

  const favicon = brandSvg({
    width: 64,
    palette: brandPalette.dark,
    radius: 14,
    markSize: 44,
    opticalShiftY: 1,
  })
  writeFileSync(join(repoRoot, 'public/favicon.svg'), favicon)
}

async function generateAndroidSplash() {
  for (const { dir, width, height, scale } of splashSizes) {
    await writePng(brandSvg({
      width,
      height,
      palette: brandPalette.light,
      markSize: 92 * scale,
      opticalShiftY: 2 * scale,
    }), join(androidRes, dir, 'splash.png'))
  }
}

async function generateIosSplash() {
  const splash = brandSvg({
    width: 2732,
    palette: brandPalette.light,
    markSize: 480,
    opticalShiftY: 12,
  })
  const dir = join(iosAssets, 'Splash.imageset')
  await Promise.all([
    writePng(splash, join(dir, 'splash-2732x2732.png')),
    writePng(splash, join(dir, 'splash-2732x2732-1.png')),
    writePng(splash, join(dir, 'splash-2732x2732-2.png')),
  ])
}

async function generate() {
  await generateAndroidIcons()
  await generateIosIcon()
  await generateReferenceIcons()
  await generateAndroidSplash()
  await generateIosSplash()

  console.log('Brand assets generated from src/assets/brand/mnemos-mark.svg')
  console.log(`light: ${JSON.stringify(brandPalette.light)}`)
  console.log(`dark:  ${JSON.stringify(brandPalette.dark)}`)
}

generate().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
