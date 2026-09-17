import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile } from 'node:fs/promises'

const hash = async path => createHash('sha256').update(await readFile(path)).digest('hex')
const enginePin = JSON.parse(await readFile('engine-source.json', 'utf8'))
const sourcePages = (await readdir('assets/source-pages')).filter(name => /\.(png|jpe?g)$/i.test(name)).sort().map(name => `assets/source-pages/${name}`)
const paths = [
  'release_manifest.json',
  'index.html',
  'styles.css',
  'app.js',
  'storage.js',
  'scoring.js',
  'src/schools/rikkyo/appProfile.js',
  'data/questions.json',
  'data/practice_bank.json',
  'data/exams.json',
  'data/registry.json',
  'data/canonical_content.json',
  'engine-source.json',
  ...Object.keys(enginePin.files),
  ...sourcePages
]
const fileChecksums = {}
for (const path of paths) fileChecksums[path] = await hash(path)
const manifest = {
  release: 'canonical-v1',
  rollbackBaseline: '3ea62c69bf8c77a5f3c703b10bf2c60012ef3268',
  sourceEngine: { repository: enginePin.masterRepository, commit: enginePin.masterCommit, contractVersion: enginePin.contractVersion },
  invariants: {
    pastExamQuestions: 212,
    fullyAuthoredPastExamExplanations: 212,
    practiceBankQuestions: 411,
    practiceByLevel: { L1: 100, L2: 168, TRANSFER: 77, RETENTION: 66 },
    totalProblemIds: 623,
    sourcePageImages: 31,
    officialScoreAvailable: false,
    reviewRequiredProblemIds: ['R26-MATH-A-Q5-3'],
    learnerUnseenExamIds: ['R26-MATH-B']
  },
  authoritativeInputs: ['data/questions.json', 'data/practice_bank.json', 'data/exams.json', 'data/registry.json', ...sourcePages],
  fileChecksums
}
await writeFile('release_manifest_canonical_v1.json', `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`wrote canonical release manifest with ${paths.length} pinned files`)
