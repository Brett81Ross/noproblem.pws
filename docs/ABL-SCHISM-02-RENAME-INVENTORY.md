# ABL-SCHISM-02 — Rename dependency inventory

Status: BUILD / INVENTORY
Parent: ABL-SCHISM-01
Production impact: NONE
Deployment authorized: NO

## Verified branch state

PR #5 is open, draft, unmerged, and currently mergeable. Its base is `abl-matrix-active-calibration-vault`; the SchismMatrix brand-foundation commit is `3a9d78a9166f5546cbe43fcd955d5e6bdde39cf9`.

## Why this inventory exists

The current application mixes customer-facing legacy branding with internal compatibility identifiers. A blind global rename could break persisted browser state, calibration configuration, tests, or the RIVETEX handoff. SchismMatrix therefore migrates by identifier class.

## Class A — safe customer-facing rename candidates

Verified examples on this branch:

- `index.html` document title: `No Problem Pressure Washing Matrix`
- `settings.js` Settings & About subtitle: `No Problem Pressure Washing Matrix™`

These are presentation strings. They can become **SchismMatrix™** / **Property Intelligence** in a later UI batch without changing runtime contracts.

## Class B — preserve through compatibility window

Verified identifiers:

- package name: `noproblem-matrix`
- package description: `No Problem Pressure Washing AI Matrix`
- browser storage key: `no-problem-matrix-settings-v1`
- browser project key: `no-problem-matrix-last-project`
- runtime endpoint: `api/analyze.js`
- internal modules/tests using `matrix-*`
- calibration environment identifiers, including `MATRIX_ACTIVE_CALIBRATION_JSON` and `MATRIX_PRICING_RULE_VERSION`

These must not be globally replaced merely for branding.

## Storage migration rule

When customer-facing branding changes, existing `no-problem-matrix-*` localStorage keys remain readable. A future storage-key migration must use read-old/write-new or dual-read semantics with an explicit rollback plan. Never strand an existing user's settings or last project because the brand changed.

## Calibration migration rule

Calibration identifiers are protocol/configuration contracts, not UI copy. Keep the existing `MATRIX_*` environment contract until a separately tested alias migration exists. SchismMatrix branding must not invalidate an ACTIVE calibration or change its SHA/rule-version governance.

## RIVETEX integration rule

The handoff contract remains semantically unchanged:

**SchismMatrix intelligence context → explicit human/customer authorization boundary → RIVETEX operations**

Branding cannot turn estimation context into authorization, and renaming cannot alter payload semantics silently.

## Package/repository rule

Do not rename the GitHub repository or npm/package identifier in the branding phase. Those are operational identifiers and can be migrated later only if there is a concrete benefit.

## Proposed migration order

1. Brand foundation/inventory.
2. Customer-facing strings and accessible labels only.
3. Static/mobile presentation QA.
4. Compatibility aliases where justified.
5. Contract/storage migrations only with dedicated tests.
6. Final candidate QA.
7. Production deployment only after explicit approval.

## Cost guard

Do not intentionally trigger the expensive full QA gate for inventory/documentation commits. Preserve the final full gate for the completed candidate SHA.

## Exit criteria for this inventory

- presentation strings are separated from compatibility identifiers;
- storage/calibration/RIVETEX boundaries are documented;
- no runtime identifier is renamed;
- no production deployment occurs;
- no paid action occurs.
