// 静态站本地预览服务器 — 正确处理 WASM MIME + SPA 回退
import { createServer } from 'http'
import { readFile, stat } from 'fs/promises'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const PORT = parseInt(process.argv[2] || '4173')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.sqlite': 'application/octet-stream',
}

async function tryFile(filePath) {
  try {
    const s = await stat(filePath)
    if (s.isFile()) return await readFile(filePath)
  } catch { /* not found */ }
  return null
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)
  let filePath = join(DIST, url.pathname)

  let data = await tryFile(filePath)
  let ext = extname(filePath)

  // SPA 回退：文件不存在则返回 index.html
  if (!data) {
    data = await readFile(join(DIST, 'index.html'))
    ext = '.html'
  }

  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  res.end(data)
}).listen(PORT, () => {
  console.log(`Static preview: http://localhost:${PORT}`)
})
