DPDP Audit Progress Log
======================

Branch: compliance/dpdp (do not push)

Summary of actions performed (developer review required):

- Scanned repository for personal data collection points, third-party services, and trackers.
- Added a public `Privacy Notice` page at `/privacy.html` (legal copy placeholders marked for review).
- Added a `Data Rights` request page at `/data-rights.html` and an API endpoint to accept requests.
- Implemented a client-side `ConsentBanner` component to capture per-purpose opt-in (unticked by default).
- Added server API endpoints at `/api/dpdp/consent` and `/api/dpdp/rights` to accept consent records and rights requests and attempt to persist them to Supabase tables `dpdp_consents` and `dpdp_requests` (DB migrations required).
- Published a grievance contact placeholder in the site footer and privacy page (replace with official contact).
- Created `BREACH_RUNBOOK.md` with notification templates and 72-hour guidance.
- Flagged security gaps discovered and open technical items below.

Files added:

- [DPDP_PROGRESS.md](DPDP_PROGRESS.md)
- [BREACH_RUNBOOK.md](BREACH_RUNBOOK.md)
- [public/privacy.html](public/privacy.html)
- [public/data-rights.html](public/data-rights.html)
- [src/components/ConsentBanner.jsx](src/components/ConsentBanner.jsx)
- [api/dpdp/consent.js](api/dpdp/consent.js)
- [api/dpdp/rights.js](api/dpdp/rights.js)

What I built (technical):

- Static privacy and data-rights pages (legal text marked with `***LEGAL REVIEW***`).
- A React `ConsentBanner` that:
  - Shows per-purpose checkboxes (unticked by default).
  - Persists a consent record to `localStorage` and POSTs to `/api/dpdp/consent`.
  - Exposes `window.__dpdpConsent` for gating non-essential trackers.
- Server endpoints to record consents and data-rights requests; these attempt to insert rows into Supabase tables but will return a clear 501 message if tables are missing.

Immediate open items (developer / infra):

1. Create Supabase DB migrations to add tables `dpdp_consents` and `dpdp_requests`. Example schema in this progress file's notes.
2. Replace placeholder grievance contact email and phone number with the official Data Protection Officer (DPO) contact.
3. Wire any third-party analytics initialization (Google Analytics, Mixpanel, etc.) to check `window.__dpdpConsent?.analytics === true` before loading.
4. Decide whether to treat `localStorage` persistence of educational inputs as personal data; if so, consider server-side storage or allowing users to erase via the rights form.
5. Lawyer review required for all legal copy and retention periods indicated below.

Legal / review notes (must be reviewed by counsel):

- Privacy Notice contains sections marked `***LEGAL REVIEW***` where lawful basis, retention periods, and exact grievance contact must be finalized.
- BREACH_RUNBOOK contains template notices that must be reviewed by counsel before use.

Security & compliance gaps flagged (see code sections for locations):

- Local-only persistence: `localStorage` used across many features for persistent student data (GPA, attendance, planner). This stores potentially personal academic data in the user's browser and has no server-side backup or deletion API.
- Admin secrets: Supabase service keys and NVIDIA API keys are stored in environment variables; ensure these are rotated and not exposed in client builds. Admin UI accepts API key entry — ensure it's never written into client-side code.
- No verified CAPTCHA on public forms: data-rights endpoint currently has no abusive request protection.
- Fail-open encryption: some API endpoints rely on environment variables; ensure that missing encryption or keys does not leak data.
- HTTP enforcement: Ensure site is served over HTTPS in production; Vercel typically enforces this but confirm in hosting config.

Next steps (recommended):

1. Create DB migrations & deploy to Supabase (add `dpdp_consents`, `dpdp_requests` table). See suggested schemas below.
2. Provide DPO contact and retention policy details for `privacy.html` and `DPDP_PROGRESS.md`.
3. Run a security review: ensure routes use `https`, verify CORS, add rate limiting and CAPTCHA on rights endpoints.
4. Legal review of `privacy.html`, `BREACH_RUNBOOK.md`, and Terms change suggested below.

Suggested DB schemas (example):

-- `dpdp_consents`:
-- id: uuid (primary key)
-- created_at: timestamptz
-- user_agent: text
-- ip_address: text
-- purposes: jsonb
-- consented: boolean
-- raw_payload: jsonb

-- `dpdp_requests`:
-- id: uuid (primary key)
-- created_at: timestamptz
-- name: text
-- email: text
-- request_type: text
-- details: text
-- status: text

Additional: a minimal `Terms` clause was added at `/public/terms.html` as a placeholder for legal review.
