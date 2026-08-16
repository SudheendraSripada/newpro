# DPDP Act (India) Compliance Progress

## What Was Built
- Added BREACH_RUNBOOK.md with 72-hour Board notice requirements.
- Added PrivacyNotice.jsx detailing data usage, retention, third-party sharing, rights, and Grievance Officer details.
- Added TermsOfService.jsx with a data-protection clause.
- Added ConsentBanner.jsx to gate non-essential trackers.
- Added DataRightsForm.jsx for user data rights requests (access/correct/erase/withdraw).
- Updated existing data entry forms with per-purpose unticked opt-in checkboxes.
- Updated footer with grievance contact and compliance links.

## What Needs Lawyer Review
- [LEGAL REVIEW REQUIRED] The exact wording in PrivacyNotice.jsx regarding data processing purposes and retention periods.
- [LEGAL REVIEW REQUIRED] The Terms of Service data-protection clause.
- [LEGAL REVIEW REQUIRED] The templates in BREACH_RUNBOOK.md.

## Open Items
- Connect DataRightsForm.jsx to a backend endpoint or email notification system.
- Add an explicit Grievance Officer contact email address (currently using placeholders).
- Integrate the consent state with the Supabase schema.

## Security Gaps
- **Unverified CAPTCHA**: Data rights requests and forms do not have CAPTCHA, making them vulnerable to automated spam/DDoS.
- **Fail-Open Encryption**: LocalStorage data is currently unencrypted in the browser, exposing sensitive tracking data.
- **No HTTPS**: No forced redirection to HTTPS, exposing data to MITM attacks.
