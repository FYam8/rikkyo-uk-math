import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const readJson = async path => JSON.parse(await readFile(path, 'utf8'))
const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex')
const manifest = await readJson('release_manifest_canonical_v1.json')
const rc2 = await readJson('release_manifest.json')
const pin = await readJson('engine-source.json')
if (manifest.release !== 'canonical-v1') throw new Error('wrong release manifest')
if (manifest.rollbackBaseline !== '3ea62c69bf8c77a5f3c703b10bf2c60012ef3268') throw new Error('rollback baseline drift')
if (manifest.sourceEngine.commit !== pin.masterCommit || manifest.sourceEngine.repository !== pin.masterRepository) throw new Error('engine source drift')
const expected = { pastExamQuestions: 212, fullyAuthoredPastExamExplanations: 212, practiceBankQuestions: 411, totalProblemIds: 623, sourcePageImages: 31 }
for (const [key, value] of Object.entries(expected)) if (manifest.invariants[key] !== value) throw new Error(`invariant drift: ${key}`)
if (manifest.authoritativeInputs.filter(path => path.startsWith('assets/source-pages/')).length !== 31) throw new Error('source page manifest count drift')
for (const path of manifest.authoritativeInputs) {
  const baseline = rc2.fileChecksums[path]
  if (!baseline) throw new Error(`authoritative input absent from RC2 baseline: ${path}`)
  if (await hash(path) !== baseline) throw new Error(`authoritative input changed since RC2: ${path}`)
}
for (const [path, expectedHash] of Object.entries(manifest.fileChecksums)) if (await hash(path) !== expectedHash) throw new Error(`release hash mismatch: ${path}`)
console.log(`PASS canonical release manifest: ${Object.keys(manifest.fileChecksums).length} files, 31/31 source pages, RC2 inputs unchanged`)
