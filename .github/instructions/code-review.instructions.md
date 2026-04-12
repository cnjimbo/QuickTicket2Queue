---
applyTo: "**"
---
# Code Review Instructions

When reviewing code, focus on:

1. **Correctness** — logic errors, off-by-one, race conditions, incorrect assumptions.
2. **Security** — injection, broken auth, insecure deserialization, exposed secrets.
3. **Error Handling** — uncaught exceptions, silent failures, missing input validation.
4. **Performance** — unnecessary I/O, N+1 queries, blocking calls in async contexts.
5. **API Design** — backwards compatibility, consistent naming, clear contracts.
6. **Test Coverage** — are new code paths covered? Are edge cases tested?
7. **Readability** — would a new team member understand this in 60 seconds?

Be constructive: suggest *how* to improve, not just *what* is wrong.
