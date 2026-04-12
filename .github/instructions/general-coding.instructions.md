---
applyTo: "**"
---
# General Coding Instructions

Follow these principles when writing or reviewing code:

- **Clean Code**: Use meaningful names; keep functions small and focused (single responsibility).
- **DRY / SOLID**: Avoid duplication; prefer composition over deep inheritance.
- **Error Handling**: Always handle errors and edge cases explicitly; never swallow exceptions silently.
- **Type Safety**: Use type hints / annotations wherever the language supports them.
- **Comments**: Explain *why*, not *what*; let clear code explain itself.
- **Testing**: Write or update tests for every change; cover edge cases and error paths.
- **Security**: Validate all inputs; never log secrets; follow least-privilege for permissions.
- **Performance**: Profile before optimising; prefer readability over premature optimisation.
