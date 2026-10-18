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

SQL `SELECT` validation (read-only enforcement), SSRF protection in the HTTP monitor, the credential vault (AES-256-GCM), authentication/RBAC and wall tokens.
