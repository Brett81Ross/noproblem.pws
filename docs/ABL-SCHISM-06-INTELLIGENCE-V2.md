# ABL-SCHISM-06 — Intelligence V2 / Closed-Loop Job Learning

Status: branch-only development on `feat/schismmatrix-intelligence-v2`.

Production baseline / rollback:
- `rollback/schismmatrix-2026-10-07-splash-fixed`
- commit `722ad07a75650bb8d0c999f0c3acd8331bfee1f4`

## Goal

Move SchismMatrix from a photo estimator toward a field decision system that explains what it knows, what it does not know, what evidence matters next, why the estimate costs what it costs, whether the job is ready for crew handoff, and what completed jobs teach the system.

## ABL

1. Deterministic Matrix Decision Brief
   - Field Ready / Review Required / Manual Review
   - next-best evidence prompt
   - evidence strength without fabricated confidence percentages
   - requested-vs-qualified scope comparison
   - additional observed scope review
   - price-driver explanation
   - crew-handoff readiness

2. Server quote-integrity guardrails
   - unknown service IDs are excluded from pricing
   - service labels and units come from the active rate card
   - unusable quantities fail closed into human review
   - final line pricing is calculated server-side
   - suspicious quote output appears in the Decision Brief

3. Closed-loop job outcome capture
   - Matrix estimated total
   - final quoted total
   - actual collected amount
   - estimated vs actual crew minutes
   - estimated vs actual water use
   - scope-change flag
   - return-visit / rework flag
   - completion notes

4. Job-learning governance
   - device-local storage only
   - no network transmission from `job-learning.js`
   - no writes to `MATRIX_ACTIVE_CALIBRATION_JSON`
   - no direct activation calls
   - recommendations are `ADVISORY_ONLY`
   - human approval and separate validated activation remain mandatory

5. Calibration evidence gates
   - minimum three clean single-service jobs
   - median-based bias calculation
   - pricing recommendation threshold: >=10% repeated bias
   - pricing adjustment candidate bounded to 0.75x–1.25x observed rate
   - time signal threshold: >=15%
   - water signal threshold: >=20%
   - single abnormal jobs cannot steer calibration

6. Outlier quarantine
   - extreme price/time variance retained for review
   - anomalous jobs excluded from operations and pricing calibration pools
   - anomalies remain visible in history

7. Data-quality safeguards
   - scope-changed jobs excluded from calibration
   - return-visit/rework jobs excluded from calibration
   - manually overridden quote pricing excluded from pricing calibration
   - non-field-ready jobs excluded from clean learning
   - duplicate completion submission for the same active job replaces the latest record instead of double-counting

8. Operator visibility
   - Crew Command: Close Job & Teach Matrix
   - recent outcome history
   - copyable learning report
   - pricing candidates
   - time/water operations signals
   - evidence-quality signals
   - command-center Matrix Learning pulse

9. Adaptive workflow preflight
   - deterministic workflow ladder: Property → Scope → Evidence → Analyze → Resolve Review → Crew
   - one best next move at a time
   - property-address gate
   - explicit service-scope gate to prevent invented requested scope
   - minimum evidence gate
   - thin-evidence advisory without fabricated confidence
   - multiple-level/high-access analysis remains review-bound
   - post-analysis next-best-evidence routing
   - quote-integrity/manual-review routing
   - field-ready jobs route directly to Crew Command
   - no network dependency

## Explicit non-goals

- No autonomous pricing changes.
- No automatic calibration-vault writes.
- No hidden network upload of job outcomes.
- No removal of existing human-review gates.
- No production deployment as part of this ABL until separately approved.

## QA gates

The branch must pass the complete existing Matrix test suite plus:
- `matrix-decision-support.test.js`
- `matrix-quote-guardrails.test.js`
- `schism-decision-brief.test.js`
- `schism-job-learning.test.js`
- `schism-job-learning-ui.test.js`
- `schism-workflow-preflight.test.js`
- `schism-workflow-preflight-ui.test.js`

