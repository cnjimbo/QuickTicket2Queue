---
name: security-review
description: Perform a focused security review of selected code
---
Perform a security review of the following code:

1. **Injection risks** — SQL, command, LDAP, XSS, template injection.
2. **Authentication & authorisation** — missing checks, privilege escalation paths.
3. **Secrets & sensitive data** — hardcoded credentials, insecure storage, logged PII.
4. **Dependency risks** — known-vulnerable libraries or unsafe API usage.
5. **Cryptography** — weak algorithms, insecure randomness, improper key management.
6. **Input validation** — missing sanitisation, unchecked trust boundaries.

For each finding: rate severity (Critical / High / Medium / Low), explain the risk, and show the fix.

${selection}
