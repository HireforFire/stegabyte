# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Stegabyte, please open a **private
security advisory** on GitHub:

**[github.com/HireforFire/stegabyte/security/advisories/new](https://github.com/HireforFire/stegabyte/security/advisories/new)**

Please do not file a public GitHub issue for security vulnerabilities. GitHub
private advisories let you share details with the maintainers confidentially
without exposing either your identity or the vulnerability to the public.

We aim to:

- Acknowledge receipt within **72 hours**.
- Provide an initial assessment within **7 days**.
- Ship a fix for critical issues within **30 days**; for non-critical issues within **90 days**.

We follow a coordinated disclosure model: please do not publicly disclose the vulnerability until we have shipped a fix or 90 days have elapsed, whichever comes first.

## Scope

In scope:

- Anything in `src/` that affects confidentiality, integrity, or availability of user data.
- Anything that allows an attacker to exfiltrate plaintext, the password, or recover a payload without the password.

Out of scope:

- Denial-of-service attacks against the static deploy.
- Loss of password (the architecture intentionally makes this unrecoverable).
- Reports about LSB being statistically detectable (this is a known limitation, documented at `/security`).

## Recognition

We maintain a (currently empty) Hall of Fame for researchers who report valid issues. Reporters will be credited here with their consent.
