// T96: prepara ÚNICAMENTE un bundle test-only de sesión en un directorio TEMP.
// No carga vite.config.ts, PWA, App, backend, dist ni escribe en el repo.
import { build } from 'vite'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destino = process.argv[2]
if (!destino) {
  console.error('Falta el directorio TEMP de salida')
  process.exit(1)
}
const raizTemp = path.join(process.env.TEMP ?? '', 'opencode')
const destinoAbs = path.resolve(destino)
if (!destinoAbs.startsWith(path.join(raizTemp, ''))) {
  console.error('El destino debe residir bajo TEMP/opencode aprobado')
  process.exit(1)
}

// Typecheck acotado al fixture, con el tsc local y sin tocar tsconfig del repo.
execFileSync(process.execPath, [
  path.join(frontend, 'node_modules/typescript/bin/tsc'),
  '--noEmit', '--strict', '--target', 'ES2020', '--module', 'ESNext',
  '--moduleResolution', 'bundler', '--lib', 'ES2020,DOM,DOM.Iterable',
  '--types', 'vite/client',
  path.join(frontend, 'tests/aislados/sesion-idb.ts'),
], { cwd: frontend, stdio: 'inherit' })

// Bundle test-only: entrada única, config desactivada, sin plugins de app.
await build({
  configFile: false,
  root: frontend,
  logLevel: 'warn',
  publicDir: false,
  define: { 'process.env.NODE_ENV': '"test"' },
  build: {
    outDir: path.join(destinoAbs, 'bundle'),
    emptyOutDir: true,
    target: 'es2020',
    minify: false,
    sourcemap: false,
    lib: {
      entry: path.join(frontend, 'tests/aislados/sesion-idb.ts'),
      formats: ['es'],
      fileName: () => 'sesion.js',
    },
  },
})

fs.writeFileSync(
  path.join(destinoAbs, 'bundle/index.html'),
  '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<title>T96</title><script type="module" src="/sesion.js"></script>' +
    '</head><body>T96</body></html>',
  'utf8',
)
console.log('Preparación T96 lista en', path.join(destinoAbs, 'bundle'))
