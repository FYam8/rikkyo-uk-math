import { spawnSync } from 'node:child_process'

const commands = [
  ['node', ['scripts/build-canonical-content.mjs']],
  ['node', ['--check', 'app.js']],
  ['node', ['--check', 'scoring.js']],
  ['node', ['--check', 'storage.js']],
  ['node', ['--check', 'src/schools/rikkyo/appProfile.js']],
  ['node', ['scripts/verify-engine-pin.mjs']],
  ['node', ['scripts/verify-release-manifest.mjs']],
  ['node', ['tests/content.test.js']],
  ['node', ['tests/scoring_all.test.js']],
  ['node', ['tests/storage.test.js']],
  ['node', ['tests/canonical_content.test.js']],
  ['node', ['tests/canonical_migration.test.js']],
  ['node', ['tests/holdout_isolation.test.js']],
  ['node', ['tests/reinforcement_mapping.test.js']],
  ['node', ['tests/shared_today_planner.test.js']],
  ['node', ['tests/shared_engine_ownership.test.js']],
  ['node', ['tests/release_invariants.test.js']],
  ['node', ['tests/all_explanations.test.js']],
  ['python', ['tests/bank_math_verify.py']],
  ['python', ['tests/fy24a_math_verify.py']],
  ['python', ['tests/fy24b_math_verify.py']],
  ['python', ['tests/fy25a_full_math_verify.py']],
  ['python', ['tests/fy25b_math_verify.py']],
  ['python', ['tests/fy26a_math_verify.py']],
  ['python', ['tests/fy26b_math_verify.py']],
  ['python', ['tests/browser_inmemory_smoke.py']],
  ['python', ['tests/bank_mastery_smoke.py']]
]
for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status || 1)
}
console.log(`PASS full regression: ${commands.length} commands`)
