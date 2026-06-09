import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcSvg = path.resolve(__dirname, '../src/assets/mark-square.svg')
const publicDir = path.resolve(__dirname, '../public')

const sizes = [
  { name: 'favicon-96.png', size: 96 },
  { name: 'favicon-192.png', size: 192 },
  { name: 'favicon-512.png', size: 512 },
]

async function generate() {
  for (const { name, size } of sizes) {
    const dest = path.join(publicDir, name)
    await sharp(srcSvg).resize(size, size).png().toFile(dest)
    console.log(`Generated ${dest}`)
  }
}

generate().catch((err) => { console.error(err); process.exit(1) })
