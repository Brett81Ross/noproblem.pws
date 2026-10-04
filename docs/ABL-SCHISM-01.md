# ABL-SCHISM-01 — SchismMatrix provisional brand foundation

Status: BUILD
Production impact: NONE
Deployment authorized: NO
Trademark status: PROVISIONAL WORKING BRAND — NOT LEGALLY CLEARED

## Purpose

Introduce the provisional product identity **SchismMatrix™ — Property Intelligence** without renaming runtime modules, APIs, environment variables, storage keys, pricing rules, calibration contracts, or existing integrations.

This batch is intentionally documentation-only. The existing Matrix runtime remains the compatibility boundary until a later, explicitly approved migration batch.

## Product architecture

**Property evidence → SchismMatrix intelligence → human decision/authorization → RIVETEX operations → actuals → governed calibration**

SchismMatrix is a standalone CactusByte Studios product. It is not MCX itself and is not an MCX-only product.

For the MCX deployment:

**Medicine Creek Exterior Co. → SchismMatrix™ → RIVETEX™**

- MCX: operating exterior-cleaning business.
- SchismMatrix: property evidence, surface intelligence, qualification, scope, estimate support, field guidance, confidence/unknowns, and governed learning.
- RIVETEX: customer authorization, jobs, operations, execution records, actuals, and business workflow.

## Non-negotiable authority boundary

SchismMatrix may create or hand off estimation context. It may not constitute customer authorization, create an authorized RIVETEX job by inference, activate pricing recalibration by itself, or override human approval.

Calibration remains:

**RIVETEX actuals → evidence assessment → proposed recalibration → human review → human approval → immutable release → SchismMatrix validates → explicit activation**

## Compatibility freeze

Do not rename these in this batch:

- repository `noproblem.pws`
- `api/analyze.js`
- `lib/matrix-*`
- `tests/matrix-*`
- `MATRIX_ACTIVE_CALIBRATION_JSON`
- `MATRIX_PRICING_RULE_VERSION`
- persisted browser/storage keys
- request/response contracts
- RIVETEX integration contracts
- package name
- production URLs/domains

A later migration may introduce brand-facing aliases only after inventorying every external and persisted dependency.

## Brand usage

Preferred display:

**SchismMatrix™**
**Property Intelligence**

Use `SchismMatrix` as one compound word in customer-facing prose. Internal legacy `Matrix` terminology remains valid until migrated deliberately.

Do not claim trademark registration or legal clearance. The ™ symbol denotes a claimed/provisional brand identity, not a federal registration.

## Acceptance gate

This ABL is complete only when:

1. The brand foundation exists on an isolated branch.
2. Runtime behavior is unchanged.
3. No production deployment occurs.
4. No paid service/domain/trademark action occurs.
5. No expensive GitHub Actions gate is intentionally triggered merely for this documentation batch.
6. Future rename work starts with a dependency inventory and compatibility plan.

## Deferred work

- final trademark/legal clearance
- customer-facing UI rename
- package/repository rename
- URL/domain decisions
- logo/visual identity
- runtime aliases/migration
- production deployment

