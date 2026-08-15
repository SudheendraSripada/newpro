# Breach Runbook (DPDP - India)

Purpose: step-by-step runbook to follow after detecting a personal data breach. This is a template and MUST be reviewed by legal and management before use.

1) Triage (0-12 hours)
- Contain the breach: isolate affected systems and revoke any compromised credentials.
- Capture logs, timestamps, and affected resources.
- Identify data categories involved (e.g., student planner entries, attendance records, emails).

2) Board / Senior Management Notification (within 72 hours)
- Notify CEO / Board with high-level incident summary including scope and timeline.
- Use the template below for the board notice.

3) Prepare user notification (within 72 hours where required)
- Identify affected users and prepare a plain-language notice describing what happened, what data was involved, steps taken, and mitigation measures.
- Use the template below for user notification.

4) Remediation and follow-up
- Patch vulnerabilities, rotate keys, harden access controls.
- Log forensic steps and keep an audit trail.
- Offer remediation to affected users (password reset, monitoring, etc.).

Templates

Board Notice Template
---------------------

Subject: Security incident summary — immediate attention required

Body:

Date: [YYYY-MM-DD HH:MM]
Incident ID: [auto-generated]

Summary:
- What: High-level description of breach and systems affected.
- When: First detection timestamp and window of exposure.
- Scope: Number of user accounts potentially impacted and categories of personal data involved.
- Actions taken: Containment steps, forensic collection, temporary mitigations.
- Next steps: Planned remediation, user notification timeline, legal steps.

User Notice Template
--------------------

Subject: Important notice about your personal data

Body:

Date: [YYYY-MM-DD]
Dear [User],

We are writing to inform you of a security incident affecting some personal data stored by [Organization]. We detected unauthorized access to [systems] on [date/time]. The data potentially involved includes: [list categories].

What we are doing: [Containment, investigation, steps to secure data].

What you can do: [Reset passwords, monitor accounts, contact DPO].

Contact: [DPO name], [DPO email], [phone]

This notice is provided as part of our regulatory obligations and to help you take steps to protect yourself.

***LEGAL REVIEW***: Final templates and timelines must be approved by legal.
