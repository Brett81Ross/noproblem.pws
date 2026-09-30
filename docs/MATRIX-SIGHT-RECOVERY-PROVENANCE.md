# Aug. 4 Pressure Washing Matrix Recovery Provenance

## Purpose
Preserve the verified recovery lineage before any reconstruction or deployment.

## Verified anchors

- `9f89ab85fe64b2c3542c5b3d6fb98895a9c0c5ea` (2026-08-02): clean No Problem Pressure Washing Matrix source. No MachZero fingerprint found.
- `66a71a28e358a0452ac4d5fe25f933acdfc67a8a` (2026-08-14): contamination event. `index.html` was replaced by a MachZero page.
- `2e9c7f1c3a5422d2b06745bfa21ee5e1f7e09455`: MachZero page still present.
- `b9a87e228ca9345bc999a4a6d3e1e1689e4d3619`: No Problem Matrix restored, but it is the older Admin/Technician + photo/upload + Satellite Site & Notes UI family. It does not contain the later Aug. 4 Pressure Washing Matrix DOM contract.
- `385208b84e07184d4d6c4ff61bdc53ef97419250` / `442fb331404d70b8ad28d00da49f3cc38da6f247` (2026-08-20): production intentionally routed to historical Aug. 4 Vercel deployment `noproblem-366sn8eq2-brett-ross-projects1.vercel.app`.
- That historical Vercel deployment is no longer available through the current Vercel deployment API.
- `f344c218e68c9722ec8852b5a3786e02b8390b6d`: first repository shell that fetched the historical Aug. 4 deployment and layered branding/settings on top.

## Aug. 4 Pressure Washing Matrix contract evidence preserved by later shell transformations

Later `api/shell.js` revisions prove that the missing upstream runtime contained exact hooks/strings including:

- `Four purposeful photos beat twenty random ones. Use the angles below to build a scan the customer and your crew can both understand.`
- `<strong id="photoCount">0 / 4</strong>`
- `var PHOTO_SLOTS = [...]`
- `var SERVICE_LABELS`
- `photos: [null, null, null, null]`
- `elements.photoCount`
- `elements.evidenceStatus`
- `state.photoTarget`
- `state.report.quoteMeta.minimumJob`
- `state.completedProof`
- `function proposalText()`
- `state.jobAddress`
- structured `service-chip` controls
- later styling references to `.brand-stage`, `.mode-switch`, `.mission-fields`, `.scope-grid`, and `.evidence-grid`

These hooks are absent from both the Aug. 2 anchor and the Aug. 14 restored old-style Matrix page. Therefore they belong to the missing Aug. 4 Pressure Washing Matrix runtime or a closely related upstream build, not to the older Git `index.html`.

## Recovery rules

1. Do not use the Aug. 14 MachZero-contaminated snapshots as Matrix recovery material.
2. Do not treat the Aug. 2 or Aug. 14 restored old-style Matrix page as byte-identical to Aug. 4 Aug. 4 Pressure Washing Matrix.
3. Do not force later Aug. 4 Pressure Washing Matrix modules onto the older DOM.
4. Reconstruct only from verified strings, functions, transformations, and preserved Matrix modules.
5. Keep demo/splash/VIP layers outside the recovery baseline unless separately proven necessary.
6. Do not deploy or replace production until the recovered candidate is visually and functionally reviewed by Brett.


## Native-vs-later boundary

The earliest shell commit (`f344c218e6`) made only minimal assumptions about the historical Aug. 4 upstream HTML: it expected a `.brand-logo` image and a `.footer`, then injected manifest metadata and `settings.js`. It did not itself introduce the later application structure.

The following structures appear only as later shell-layer work and therefore must not automatically be attributed to the Aug. 4 baseline:

- Supply Matrix branding/tab treatment (`ada4ad41a2`).
- Motion/animation styling and selectors such as `.status-rail`, `.product-mark`, `.hero-copy`, `.mode-switch`, `.matrix-card`, and `.service-chip` (`72266714c1`).
- Responsive/building-scope styling such as `.app-shell`, `.mission-fields`, and `.scope-grid` (`e020945405`).
- Customer contact and quote PDF (`bc491a741d`).
- 12-photo evidence expansion (`57dd8f6551`).
- Service-guided Quick Quote (`4d289aabd8`).
- Editable quote accuracy/review (`728eccca57`).

These later features may still be genuine desired Matrix improvements, but recovery must distinguish them from the Aug. 4 baseline.
