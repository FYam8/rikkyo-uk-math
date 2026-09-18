import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const [masterCheckout, requestedCommit] = process.argv.slice(2)
if (!masterCheckout || !/^[0-9a-f]{40}$/.test(requestedCommit || '')) {
  throw new Error('usage: node scripts/sync-engine.mjs <waseshibu-checkout> <40-char-commit>')
}
const actualCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: masterCheckout, encoding: 'utf8' }).trim()
if (actualCommit !== requestedCommit) throw new Error(`checkout mismatch: ${actualCommit}`)

const paths = [
  'src/engine/appProfile.ts',
  'src/engine/candidateWriteContract.ts',
  'src/engine/contentContract.ts',
  'src/engine/examContract.ts',
  'src/engine/externalSyncContract.ts',
  'src/engine/learnerState.ts',
  'src/engine/localRestoreContract.ts',
  'src/engine/learningFlow.ts',
  'src/engine/learningFlow.runtime.js',
  'src/engine/noLossTransport.ts',
  'src/engine/practiceHistoryContract.ts',
  'src/engine/remediationContract.ts',
  'src/engine/todayPlanner.ts',
  'src/engine/todayPlanner.runtime.js'
]
const files = {}
for (const path of paths) {
  const source = resolve(masterCheckout, path)
  const destination = resolve(path)
  await mkdir(resolve(destination, '..'), { recursive: true })
  await cp(source, destination)
  files[path] = createHash('sha256').update(await readFile(destination)).digest('hex')
}
const pin = {
  masterRepository: 'FYam8/waseshibu-math',
  masterCommit: requestedCommit,
  contractVersion: 1,
  propagation: 'vendored-pinned-candidate-only',
  schoolOwnedPathsExcluded: ['src/schools/rikkyo/', 'data/', 'assets/', 'storage.js', 'scoring.js'],
  files
}
await writeFile('engine-source.json', `${JSON.stringify(pin, null, 2)}\n`)
console.log(`synced ${paths.length} canonical engine files from ${requestedCommit}`)
