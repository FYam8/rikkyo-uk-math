import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const pin = JSON.parse(await readFile(new URL('../engine-source.json', import.meta.url), 'utf8'))
if (pin.masterRepository !== 'FYam8/waseshibu-math') throw new Error('unexpected canonical master')
if (!/^[0-9a-f]{40}$/.test(pin.masterCommit)) throw new Error('masterCommit must be an immutable SHA')
if (pin.contractVersion !== 1) throw new Error('unsupported engine contract version')

const entries = Object.entries(pin.files || {})
if (!entries.length) throw new Error('engine pin has no files')
for (const [path, expected] of entries) {
  if (!path.startsWith('src/engine/') || path.includes('..')) throw new Error(`non-engine path in pin: ${path}`)
  const body = await readFile(new URL(`../${path}`, import.meta.url))
  const actual = createHash('sha256').update(body).digest('hex')
  if (actual !== expected) throw new Error(`engine drift: ${path}`)
}
console.log(`PASS engine pin: ${entries.length} files @ ${pin.masterCommit}`)
