# Orbit Monitor — Data Protection (LGPD & PCI DSS)

Orbit runs arbitrary `SELECT`s and HTTP requests against production systems, so a probe result can contain cardholder data or personal data. This document defines the controls that keep Orbit aligned with **PCI DSS v4.0** and Brazil's **LGPD** (Lei 13.709/2018).

> Golden rule: **a full card number (PAN) never leaves the probe.** Not in the API, the preview, the WebSocket, logs, alerts, audit trail, exports, memory buffers or Orbit's configuration files. There is no setting to turn this off.

## 1. Data classes

| Class | Examples | Detection | Display | Storage |
|---|---|---|---|---|
| `PCI_PAN` | card number | 13–19 digits (spaces/hyphens allowed) passing **Luhn**; column/key names such as `card`, `pan`, `card_number`, `cartao`, `num_cartao` | `•••• •••• •••• 1234` (last 4 at most, never first 6) | Never stored, not even masked as a series |
| `PCI_SAD` | CVV/CVC, track data, PIN/PIN block | column/key names: `cvv`, `cvc`, `cvv2`, `cid`, `track`, `track1`, `track2`, `pin`, `pin_block` | `[REDACTED]` (no partial digits) | Never stored |
| `PERSONAL` | CPF, CNPJ, e-mail, phone, name, address | CPF/CNPJ check digits; e-mail and BR phone patterns; names such as `cpf`, `email`, `phone`, `telefone`, `nome`, `name`, `address` | `•••.•••.•••-12`, `j•••@d•••.com`, `(••) •••••-1234` | Only if explicitly selected, always masked |
| `SECRET` | passwords, tokens, API keys, JWT | names such as `password`, `senha`, `secret`, `token`, `api_key`; `eyJ…` JWT and `Bearer …` patterns | `••••` | Encrypted in the config files (AES-256-GCM) or `${env:…}` |

Detection runs on both the **value** and the **field name**; either match classifies the field. When unsure, Orbit classifies the field as sensitive.

## 2. Where redaction happens (defense in depth)

```
Target DB / API ──▶ SqlProbe / HttpProbe ──▶ SensitiveDataRedactor ──▶ ProbeResult (masked)
                         │                                              │
                         └─ raw value kept in memory only for           ├─▶ Telemetry (30-day log)
                            condition evaluation, then discarded         ├─▶ Alerting messages
                                                                         ├─▶ REST / WebSocket (Jackson guard)
                                                                         └─▶ Logs (Logback masking converter)
Frontend ──▶ <SafeValue> re-applies redaction before anything reaches the DOM
```

1. **Probe boundary**: results are redacted before leaving `SqlProbe`/`HttpProbe`. Conditions may evaluate raw values in memory; raw values are never persisted or serialized.
2. **Serialization guard**: a Jackson module redacts every `ResultPayload` and every `@Sensitive` field on the way out.
3. **Logs**: a Logback converter masks PAN, CPF/CNPJ, JWT and Bearer tokens in every log line. Probe payloads and credential request bodies are never logged.
4. **Frontend**: every value coming from a probe is rendered through `<SafeValue>`/`useSafeValue`, which runs the same detectors. Tests prove a valid PAN injected into any component never reaches the DOM.

## 3. PCI DSS controls

| Requirement | Control in Orbit |
|---|---|
| 3.3 – SAD not retained after authorization | `PCI_SAD` is always `[REDACTED]` and never stored |
| 3.4 – PAN masked when displayed | Last 4 digits at most; nobody can unmask |
| 3.5 – PAN unreadable wherever stored | PAN is never stored |
| 4.2 – Strong cryptography in transit | HTTPS/WSS in production; TLS to targets when supported |
| 6.2 – Secure development | TDD, code review, SQL validator (read-only), SSRF protection |
| 7 – Access by need to know | No accounts: edits only from loopback by default, LAN clients view-only; database users with `GRANT SELECT` only on the views a monitor needs |
| 8 – Authentication | Orbit has no login, so it must **not** be placed in a cardholder data environment that requires per-user authentication; keep card data out of queries (see recommendation below) |
| 10 – Logging and monitoring | Audit trail of every mutation and every preview execution (who, when, which query, never the result) |

**Recommendation for card environments**: point monitors at *views* that already aggregate or mask data (`COUNT(*)`, `SUM(amount)`, `RIGHT(pan, 4)`). Orbit only needs metrics, not cardholder data; keeping PAN out of the query keeps Orbit out of PCI scope.

## 4. LGPD controls

| Principle (art. 6) | Control in Orbit |
|---|---|
| Purpose and necessity | Only fields the operator explicitly checks in **Data & display** are stored; everything else is discarded after the check |
| Data minimization | Personal data is masked by default and never shown on the wall |
| Security | Vault encryption, masking, network access policy, bind to `127.0.0.1` by default, security headers, no sensitive data in browser storage |
| Prevention | Automatic detection warns the operator when a query returns personal or card data |
| Transparency and accountability | Audit trail, retention policy, documented data map (this file) |
| Data subject rights (art. 18) | Orbit keeps no user accounts; the only personal data it creates is the self-declared operator name, which can be anonymized across incidents and audit entries through an endpoint |

**Retention**: Orbit has no database. History (check results, selected series, events and audit) is kept for up to **30 days** in local log files and then purged automatically; it never contains SELECT rows, HTTP bodies or secrets ([08-logs-and-history.md](08-logs-and-history.md)). Configuration files store only what the operator configured. Application logs are rotated after 30 days with a size cap.

**Local-first**: all data stays on the operator's machine; Orbit sends nothing anywhere except the configured checks and notifications. No telemetry, analytics or update pings.

## 5. Product rules

- The **wall** never shows personal data; card fields cannot be added to a wall block.
- `PCI_PAN`/`PCI_SAD` fields cannot be stored as a series nor have masking removed; the API rejects such configurations.
- Probe payloads are never written to `localStorage`, `sessionStorage`, IndexedDB or a persisted query cache.
- Copying a masked value copies the masked text only.
- Secret inputs use `type="password"` and `autocomplete="off"`, with no "show" toggle; secrets come back from the API only as `•••• (vault)`.
- Probe and preview responses carry `Cache-Control: no-store`; all responses carry CSP, `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`.
- Exports (CSV/PDF/YAML) apply the same redaction.

## 6. Out of scope

Orbit is not a system of record for cardholder data and must not be used to process, store or transmit it. Running Orbit against a cardholder data environment is the operator's responsibility; it should be assessed by the organization's QSA/DPO.
