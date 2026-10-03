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
const expected = { pastExamQuestions: 212, fullyAuthoredPastExamExplanations: 212, practiceBankQuestions: 421, totalProblemIds: 633, sourcePageImages: 31 }
for (const [key, value] of Object.entries(expected)) if (manifest.invariants[key] !== value) throw new Error(`invariant drift: ${key}`)
if (manifest.authoritativeInputs.filter(path => path.startsWith('assets/source-pages/')).length !== 31) throw new Error('source page manifest count drift')
for (const path of manifest.authoritativeInputs) {
  const baseline = rc2.fileChecksums[path]
  if (!baseline) throw new Error(`authoritative input absent from RC2 baseline: ${path}`)
  if (path === 'data/practice_bank.json') {
    const raw = await readFile(path, 'utf8');
    const marker = ',\n  {\n    \"id\": \"PB3-MIXTURE-RATIO-L1-01\"';
    const at = raw.indexOf(marker);
    if (at < 0 || createHash('sha256').update(raw.slice(0, at)+'\n]').digest('hex') !== baseline) throw new Error('Original 411 practice records changed');
    const addition = await readJson('data/practice_additions_20261003.json');
    const bank = JSON.parse(raw);
    if (addition.baselineSha256 !== baseline || addition.baselineCount !== 411 || bank.length !== 421 || JSON.stringify(bank.slice(411)) !== JSON.stringify(addition.additions)) throw new Error('Unreviewed practice addition');
    continue;
  }
  if (await hash(path) !== baseline) throw new Error(`authoritative input changed since RC2: ${path}`)
}
for (const [path, expectedHash] of Object.entries(manifest.fileChecksums)) if (await hash(path) !== expectedHash) throw new Error(`release hash mismatch: ${path}`)
console.log(`PASS canonical release manifest: ${Object.keys(manifest.fileChecksums).length} files, 31/31 source pages, RC2 inputs preserved; ten declared append-only practice items`)
