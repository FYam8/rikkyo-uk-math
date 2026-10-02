# v1.0.1: shared Cloud progress

Adds the Rikkyo school sync profile and a read-only progress projection, using the production-verified Waseda transport at full commit 25c111ed4fc4dcd76b9af5053d6039698271e340. Learning state, all 623 problem IDs, scoring, the practice bank and the pinned math engine are unchanged.

The new canonical manifest pins 65 runtime files. The shared database is rikkyo-uk-progress-sync version 7; Cloud credentials are excluded from portable backups and retained during local reset/import. Results without official point authority are reference accuracy only. FY26B remains learner-unseen according to the existing school policy.

Publication requires exact-main Verify, deployment of that same commit, then two complete regression and production-browser audit rounds at 390px and 1280px. The release workflow records the exact main and successful run URLs below and never moves an existing tag. The v1.0.0 evidence remains in production-release-v1.0.0.md.
