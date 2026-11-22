# Privacy and retention — v2 public prototype

The public notice is `privacy.html`, built from `work/privacy.html`. This document is an implementation record, not retailer legal approval.

- Use demo RUT11.111.111-1. No real customer identifiers or profiles should be used.
- RUT validation and a per-page salted digest run locally; no raw RUT is placed in a URL, QR, persistent store or server request.
- Separate opt-ins: local demo processing, camera/upload color extraction, optional mock Puntos Go enrollment. No preselected loyalty permission.
- Photos remain in a canvas only during color review. Moving to tastes discards pixels. Only a chosen RGB reference can remain in memory.
- Profiles, sample purchases and tickets exist only in this tab's memory. Finish/reset, hidden tab, reload or three minutes without input clears them. No cookies, localStorage, sessionStorage or IndexedDB.
- Ticket payload is campaign + random opaque token; no RUT, profile, color or size. A printed/saved copy stays under the user's control.
- Local ticket duplicate blocking is a demo constraint, not secure cross-device POS deduplication. RUT is identification, not authentication.
- Content Security Policy blocks outbound connections; no analytics, CRM, stock, loyalty or payment endpoint is configured.

## Before a real pilot

Require written retailer approval and legal/privacy review of controller/contact, specific purposes, lawful basis/consent, identity/profile access safeguards, processors/recipients, rights/withdrawal/deletion, security, retention and incident handling. The supplied strategy references Ley21.719; applicability and dates must be verified by counsel. No generic demo consent proves compliance. Real Puntos Go enrollment requires its own approved terms and integration. Hardware calibration and a validated colorimetry model remain separate work.
