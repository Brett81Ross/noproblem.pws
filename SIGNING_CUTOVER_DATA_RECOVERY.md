# No Problem Pressure Washing Matrix™ — Signing Cutover Data Recovery

Status: **staged recovery work only — not deployed, not merged, not authorized for uninstall/cutover**.

## Provenance and source boundary

- Production URL: `https://noproblem-pws.vercel.app/`
- Vercel project: `noproblem-pws` (`prj_YrxY2uClOcRRosWRM9XxsnLQL6ub`)
- Connected GitHub repository: `Brett81Ross/noproblem.pws`
- Recovery branch: `android-signing-cutover-data-recovery`
- Branch base: `1e83bc6868ab742b7807f9e6cd92addd08e9cf04`
- Latest production deployment inspected during the audit was a direct/manual production deployment without Git commit metadata. Therefore GitHub `main` is **not assumed to be byte-for-byte production authority**.

Read-only production inspection showed one material source divergence: live `enhancements.js` already uses the approved automatic access/elevation check, while GitHub `main` still contained the deprecated manual one-story/multiple-level selector. The deterministic recovery patch removes that stale selector on this isolated branch so recovery work cannot accidentally resurrect it.

## Persistent browser data verified in production

Recovery explicitly covers only these persistent local-storage records:

1. `no-problem-matrix-last-project` — saved job/project metadata, customer email/phone, address and optional GPS location, report, selected services/proof, quote discount and notes.
2. `no-problem-matrix-settings-v1` — device pricing floor (`minimumJob`).
3. `no-problem-matrix-inventory-v1` — Supply Matrix counts/minimums for the known inventory IDs.
4. `np_matrix_customer_contact` — customer email/phone convenience record.

The deprecated `np_matrix_building_level` key is intentionally **not** exported or restored. Production has already removed the manual story selector and uses automatic access detection.

## Data intentionally excluded

The backup never exports or restores `np_matrix_access` or any other cookie, lifetime-access state, paid scan credits, monthly/free-scan counters, CactusByte tester tokens, staged photos, caches, service workers, session state, or secrets/API keys.

This is deliberate. Entitlement state is server-signed and must not be converted into portable plaintext backup data.

## Entitlement recovery finding

No Problem's scan gate uses the HttpOnly, server-signed `np_matrix_access` cookie. Its payload tracks monthly free usage, paid credits, and lifetime access. Uninstalling the legacy Android wrapper deletes that cookie.

The CactusByte tester/VIP bridge is recoverable without copying the cookie: an authenticated CactusByte ID with an active lifetime tester pass can request a **fresh** short-lived app token from `/api/tester/issue-app-token`; No Problem consumes that token once through `/api/cactusbyte-vip` and issues a fresh lifetime cookie. Individual app tokens are one-time, but token **issuance is repeatable while the CactusByte lifetime tester entitlement remains active**.

Purchased scan credits or purchased lifetime access that exist only in `np_matrix_access` do **not** yet have an account-backed clean-install recovery mechanism proven by this audit. Therefore this app remains blocked from general signing cutover until the exact user's entitlement path is verified before uninstall, and product-wide cutover requires a durable purchase-restoration design.

## Backup format and safety rules

- schema: `no-problem-matrix-backup-v1`
- app ID: `noproblem`
- version: `1`
- maximum file size: 5 MB
- recursive depth limit: 24
- array safety limit: 5,000 records
- strips `__proto__`, `prototype`, and `constructor`
- allowlisted persistent records only
- inventory allowlisted to production item IDs
- merge-only restore
- current-device data wins when both sides contain a value
- backup fills missing current contact/inventory fields
- current saved project wins over imported project
- all four storage writes are transactional with rollback on failure
- no `localStorage.clear()`
- UI downloads a **pre-import backup before the first restore write**

Because backups can contain customer contact information, job addresses, GPS location, and report details, the UI explicitly warns the user to keep backup files private. Recovery data remains local to the user's device/file handling; this recovery feature does not upload backups to CactusByte or another server.

## Runtime/cutover gate

A green CI run proves source contract, deterministic generation, backup/restore behavior, rollback behavior, and JavaScript syntax. It does **not** authorize uninstall.

Before No Problem can be cut over on an existing device:

1. Complete the source/CI settle run on this branch.
2. Verify an export → clean isolated environment → restore/merge round trip.
3. Verify the applicable entitlement re-activation path in that isolated environment.
4. Verify primary Matrix scan, inventory, saved project, PDF/share flow, permissions, back navigation, and service-worker removal behavior.
5. Only then may a separate explicit cutover authorization allow uninstall of the legacy-signed app and installation of the permanent-signed Direct APK.

Never attempt an update-in-place from the legacy-signed APK to the permanent-signed APK; Android signature mismatch prevents it.
