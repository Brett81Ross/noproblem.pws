# SchismMatrix™ — Isolated live Gemini acceptance

**Status: Prepared, not executed.** This runner sends one synthetic image request to the real Gemini service only after explicit opt-in with a **separate QA API key**. It never deploys to Vercel and never writes production customer records.

## Prerequisites

- A separately issued, usage-limited QA Gemini API key (do not copy or decrypt the key stored in production/preview Vercel).
- A fictional/synthetic JPEG image no larger than 500 KB. Never use a real customer address, actual house photo, or personally identifying material.
- Explicit owner authorization to incur any applicable API usage.

## Run in an isolated development machine or secure CI runner

Set environment variables in the runner's secret manager, **not in repository files or command history**:

- \`SCHISM_QA_GEMINI_KEY\`: separate QA key
- \`SCHISM_QA_SYNTHETIC_JPEG\`: absolute path to a fictional JPEG
- \`SCHISM_ALLOW_LIVE_QA\`: \`YES\`
- \`SCHISM_GEMINI_MODEL\`: optional; defaults to \`gemini-3.6-flash\`

Command: \`node tests/schism-live-gemini-qa.js\`

Never include this test in the automatic \`npm test\` or PR workflow: it requires explicit authorization and may incur usage fees. It is designed to call the real route handler once; Gemini service retries may occur on a 503 according to the existing app's retry policy.

### Pass criteria

HTTP 200, structured Matrix service output, explicit evidence readiness decision, no excluded roof/gutter services, no user data, no production deployment. A green result is evidence of an isolated API round trip **only**; it does not establish measurement accuracy, approval for execution, pricing correctness for real properties, or Android camera compatibility.

### Current blockers (October 19, 2026)

Vercel currently has one \`GEMINI_API_KEY\` tagged for both production and preview; no isolated Vercel QA environment, separate QA credential, or preexisting QA deployment was found. The sensitive production/preview key was not decrypted or used. No live Gemini call has been made in this release-readiness batch. Production remains unchanged.
