# Security Policy

## Supported versions

The project is under development; only the `main` branch receives security fixes.

## Reporting a vulnerability

**Do not open a public issue.** Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability) (*Security → Report a vulnerability*) or e-mail matheuschiodi20@gmail.com.

Please include, if possible:

- a description of the issue and its impact;
- steps to reproduce;
- the affected version or commit.

You will get a response within 7 days. Once fixed, you will be credited in the changelog if you wish.

## Sensitive areas

Sensitive data masking (card numbers, CVV, CPF/CNPJ, e-mails, secrets — see [docs/04-data-protection.md](docs/04-data-protection.md)), SQL `SELECT` validation (read-only enforcement), the outbound guard in the HTTP monitor, the network access policy (Orbit has no login: edits only from loopback by default), the encrypted secrets in the local configuration files (AES-256-GCM) and the pre-commit hook that keeps those files out of Git.
