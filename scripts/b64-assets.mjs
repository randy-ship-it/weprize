// Decode text-stored binary assets (public/**/*.png.b64 -> *.png) before the build copies public/.
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p] })
for (const f of walk('public').filter((p) => /\.(png|jpg|webp)\.b64$/.test(p))) {
  writeFileSync(f.slice(0, -4), Buffer.from(readFileSync(f, 'utf8').trim(), 'base64'))
  console.log('decoded', f)
}
