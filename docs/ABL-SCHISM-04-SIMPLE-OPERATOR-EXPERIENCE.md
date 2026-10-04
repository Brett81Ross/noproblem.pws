# ABL-SCHISM-04 — Simple Operator Experience

Status: DEVELOPMENT DOCTRINE LOCK
Production authorization: NO

## Product rule

> Complex engine. Simple controls.
>
> The software does the thinking. The user does the work.

SchismMatrix may contain sophisticated evidence, confidence, qualification, pricing, calibration, and RIVETEX handoff systems. Normal operators must not be required to understand those internals to perform ordinary field work correctly.

## First-day operator gate

Every operator-facing feature must answer YES before READY:

> Could a reasonably competent first-day employee use this feature correctly with almost no training?

If not, inspect and simplify the UX before blaming the operator or adding training.

## Progressive disclosure

1. Operator layer — plain-language guided actions, one obvious next step, minimal typing.
2. Advanced layer — reasons, confidence, evidence detail, overrides and review tools for authorized users.
3. Diagnostic/developer layer — technical state, schemas, identifiers, provider/debug detail.

Do not expose diagnostic complexity in the normal workflow merely because it exists.

## Interaction requirements

- Prefer guided workflows over dashboards full of controls.
- Prefer plain-language prompts over internal terminology.
- Use sensible defaults and request only information needed at that moment.
- Use camera/voice/evidence capture where it reduces typing and cognitive load.
- Errors must explain what the user should do next.
- Advanced details stay collapsed unless needed.
- High-consequence actions remain deliberate: customer authorization, pricing overrides, hazardous-condition decisions, calibration activation, destructive actions, and similar authority boundaries require explicit confirmation.
- Accessibility, narrow-phone usability, Galaxy Z Fold cover-screen/unfolded usability, and clear touch targets are READY criteria.

## Walk-Around Evidence Capture target

TerraFlow Matrix SiteVision is the reuse source, not a feature to copy blindly.

Target operator flow:

Start Property Walk → capture property evidence → SchismMatrix requests missing/uncertain evidence in plain language → operator confirms uncertainty → Review Estimate.

Examples of acceptable prompts:
- “Show me the side gate.”
- “I need a closer look at that stain.”
- “Is this area accessible from ground level?”

Avoid normal-operator prompts such as raw confidence thresholds, schema names, service IDs, model/provider diagnostics, or calibration internals.

## TerraFlow reuse classification

REUSE:
- rear-camera capture mechanics
- still capture
- sampled video-frame extraction
- no-microphone mobile capture
- bounded recording duration
- image compression/payload limits
- camera/media cleanup
- graceful local fallback patterns

EXTEND:
- technician/manual evidence authority
- AI-vs-field cross-check
- evidence persistence/metadata
- quote handoff
- guided demo/help patterns where useful

ADAPT TO SCHISMMATRIX:
- surface/material recognition
- condition and contamination
- access
- surroundings
- runoff
- hazards
- service qualification
- confidence/manual review
- estimate evidence
- RIVETEX handoff

DO NOT COPY:
- landscaping-specific service taxonomy
- landscaping-specific pricing/cost inputs
- TerraFlow branding/storage identifiers
- any assumption that visual imagery provides exact dimensions without defensible scale/reference

## Evidence rule

Phone imagery may support observations and planning. It must not create false precision. When scale/reference is insufficient, SchismMatrix should say that measurement is unknown/not estimable and request better evidence or human verification.

## Release gate

User-friendly behavior is functional acceptance criteria, not post-build polish. A feature that technically works but presents unnecessary diagnostic complexity to ordinary users is not READY.
