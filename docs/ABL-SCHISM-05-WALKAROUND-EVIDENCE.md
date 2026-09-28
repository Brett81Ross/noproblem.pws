# ABL-SCHISM-05 — Walk-Around Evidence Capture

Status: BUILD CANDIDATE — TARGETED VALIDATION NEXT
Production authorization: NO
Source pattern: TerraFlow Matrix™ SiteVision Matrix™ v1.14
Parent UX doctrine: ABL-SCHISM-04

## Objective

Give an ordinary field operator a guided, phone-first property walk that gathers useful evidence for SchismMatrix without exposing diagnostic complexity.

Operator path:

Start Property Walk → Capture → Follow plain-language evidence requests → Confirm uncertainty → Review Estimate

This feature gathers evidence. It does not independently authorize work, customer acceptance, pricing overrides, calibration, or RIVETEX job creation.

## Reuse decision

### REUSE from TerraFlow SiteVision

- rear-facing `getUserMedia` camera pattern
- still capture from live video
- walk-video recording
- sampled video frames rather than retaining/transmitting full video
- microphone disabled for ordinary property walkthrough
- bounded recording duration
- compressed JPEG evidence
- capped analysis-frame count/payload
- object URL cleanup and camera-track shutdown
- file-upload fallback when live camera is unavailable
- graceful local/manual fallback when AI analysis is unavailable

### EXTEND for SchismMatrix

- operator evidence remains authoritative when explicitly measured/confirmed
- compare visual inference against field evidence rather than silently replacing it
- preserve evidence provenance: live photo, uploaded photo, sampled video frame, operator confirmation
- attach confidence/review state without exposing raw diagnostic state in the normal operator UI
- connect accepted evidence to SchismMatrix analysis and estimate context
- later handoff to RIVETEX remains subject to existing human-authorization boundary

### DO NOT PORT

- TerraFlow landscaping service taxonomy
- turf/bed/fence-specific fields
- TerraFlow quote math
- TerraFlow localStorage keys or branding
- landscaping AI prompt
- ProfitGuard coupling
- assumptions that ordinary imagery yields exact dimensions

## SchismMatrix evidence sequence

The guided walk should seek evidence in this order when relevant:

1. Property/context
2. Material/surface
3. Condition
4. Contamination
5. Access
6. Surroundings/property-protection concerns
7. Runoff/drainage
8. Hazards
9. Missing views / uncertainty
10. Operator confirmation

The engine may skip irrelevant steps. The operator should not have to understand this internal sequence.

## Operator UI

Primary controls should remain minimal:

- Start Property Walk
- Take Photo
- Continue Walk / Stop Walk
- Add Existing Photo or Video
- Review
- Retake / Add Evidence
- Confirm

Normal UI uses prompts such as:

- “Show me the driveway from end to end.”
- “Move closer to that stained area.”
- “Show me how we would reach this surface.”
- “Show me where water would run.”
- “I’m not sure about this area. Take another photo or mark it for review.”

Do not display raw model payloads, schema fields, internal service IDs, provider names, calibration internals, or raw confidence thresholds to normal operators.

## Evidence contract

Every retained evidence item should be representable with:

- id
- kind: photo | video-frame | upload
- source
- capturedAt
- optional location context when explicitly available/authorized
- media dimensions
- compressed evidence payload or durable reference
- analysis observations
- provenance
- confidence class
- requiresHumanReview
- operator confirmation state

Exact storage implementation is deferred until compatibility with the existing SchismMatrix evidence model is inspected.

## Measurement rule

Ordinary phone photos/video are observational evidence, not surveyed measurement.

Without defensible scale/reference:
- do not invent exact square footage, linear footage, boundaries, heights, or distances
- return unknown/not estimable
- request better evidence or operator measurement when the estimate materially depends on it

## Mobile guardrails

Target Samsung Galaxy Z Fold first, while remaining normal Android/iOS friendly.

- rear camera preferred
- no microphone by default
- 90-second maximum continuous walkthrough candidate inherited from TerraFlow; validate before final lock
- compressed evidence frames
- bounded frame count
- release camera tracks on close/background/navigation
- tolerate permission denial
- upload fallback
- narrow cover-screen touch targets and text must remain usable
- unfolded view must not become a diagnostic dashboard

## Authority boundaries

Walk-Around may:
- gather evidence
- propose observations
- identify missing evidence
- recommend manual review
- populate estimate context

Walk-Around may not:
- authorize customer work
- create a RIVETEX job by itself
- activate calibration
- silently override owner pricing
- turn uncertain evidence into a confident fact
- bypass MCX/other policy adapters

## Build order

1. Inspect current SchismMatrix capture/evidence functions and identify reusable native pieces.
2. Create a small media-capture module adapted from TerraFlow rather than copying the monolithic SiteVision UI.
3. Map captured evidence into the existing SchismMatrix analysis contract.
4. Add guided operator prompts and missing-evidence loop.
5. Add manual/local fallback.
6. Add advanced evidence detail behind progressive disclosure.
7. Run static/targeted tests without triggering expensive CI.
8. Fold/mobile visual QA.
9. One final full QA gate on the candidate SHA before READY.

## Acceptance gate

This ABL is not READY unless a first-day field employee can complete a representative property walk with almost no instruction and without encountering diagnostic terminology.

No deployment is authorized by this ABL.

## Development checkpoint — provenance groundwork

Walk-Around capture now tags each retained frame with development-only provenance metadata before it is staged: capture kind, manual-vs-sampled source, capture timestamp, SchismMatrix walk provenance, and operator-confirmation state. This is groundwork for the evidence contract; the staging/request contract now carries sanitized provenance alongside the corresponding bounded image set. The analysis layer uses provenance only as evidence context: deliberate captures/selections may establish operator intent, while automatic sampled frames remain observational context and never become operator confirmation merely by existing.

## Large-batch checkpoint

The evidence loop now preserves image-to-metadata alignment when staging and removing photos, sends only metadata for the same bounded image set submitted for analysis, sanitizes provenance server-side, distinguishes manual/operator-selected evidence from automatic sampled frames, and marks photos added through a specific SchismMatrix follow-up request as requested follow-up captures. This does not make an image true, complete, measured, or customer-authorized; it only records how the evidence entered the review.

Remaining gate work is validation rather than feature expansion: targeted static/runtime checks, follow-up state regression checks, narrow-screen/Fold inspection, and one final full QA gate only after the candidate is stable.

## Targeted regression checkpoint

Pre-gate source inspection found and hardened two stale/duplicate-action risks: estimate submission now ignores duplicate taps while a request is active and restores its state on success, evidence follow-up, or failure; follow-up camera intent is cleared when the chooser returns without evidence so a later unrelated upload is not mislabeled as requested evidence. Walk-Around camera start and finish actions are also guarded against duplicate activation. These are development hardening changes only; Fold/mobile visual QA and the final full QA gate remain outstanding.

## Mobile/Fold source-layout checkpoint

A source-level responsive pass hardened the Walk-Around sheet for narrow cover-screen and short-screen conditions: dynamic viewport height is bounded, card padding/type scale tighten below 430px, camera preview height is capped so actions remain reachable, and an additional <=380px/short-height layout reduces preview and control footprint while retaining touch-sized actions. This is not a substitute for physical Galaxy Z Fold visual QA; device verification remains required before READY.

## Cross-device responsive acceptance matrix

The Galaxy Z Fold is a QA target, not the product specification. ABL-05 responsive acceptance covers representative viewport classes rather than device-specific styling: narrow phones/cover displays (<=380px), standard phones (381-430px), large phones/small foldable layouts (431-699px), tablet/unfolded layouts (>=700px), and short landscape viewports. Android and iOS safe-area behavior must remain usable. Device-specific fixes are permitted only for demonstrated platform/device defects. Physical/browser verification remains outstanding; source breakpoints alone do not constitute cross-device PASS.
