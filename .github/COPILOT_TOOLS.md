# GitHub Copilot Tools

This repository includes a curated set of GitHub Copilot tools designed to enhance your development workflow. These tools provide advanced code analysis, planning, implementation, and validation capabilities, seamlessly integrated with VS Code and GitHub Copilot.

## Quick Start

- **Agents**: Agents operate behind the scenes and are invoked automatically by Copilot when relevant tasks arise (e.g., code analysis or exploration). You do not need to manually activate agents.
- **Skills & Prompts**: Skills and prompts can be triggered directly in VS Code or GitHub Copilot by selecting the relevant action or entering the provided argument hints. Look for Copilot sidebar actions or context menus to activate these tools.

---

## 📋 Instructions

Below are the available Copilot tools, grouped by their type. Each entry includes the tool's name, file path, and a brief description.

---

## 🤖 Agents

### Codebase Analyst
- **Path**: `.github/agents/codebase-analyst.agent.md`
- **Description**: Analyzes how code works by tracing data flow, mapping integration points, and documenting implementation details with precise file and line references.

### Codebase Explorer
- **Path**: `.github/agents/codebase-explorer.agent.md`
- **Description**: Locates where code resides, maps directory structures, and extracts implementation patterns and code snippets with file and line references.

---

## ⚡ Skills & Prompts

### Implement
- **Path**: `.github/prompts/implement.prompt.md`
- **Description**: Executes implementation plans with rigorous validation loops, leveraging codebase editing, testing, and terminal commands.

### Investigate Debug
- **Path**: `.github/prompts/investigate-debug.prompt.md`
- **Description**: Investigates GitHub issues or problems by analyzing the codebase, creating actionable plans, and posting updates to GitHub.

### Plan
- **Path**: `.github/prompts/plan.prompt.md`
- **Description**: Creates comprehensive implementation plans with codebase analysis and research, supporting feature development and PRD mapping.

### Review
- **Path**: `.github/prompts/review.prompt.md`
- **Description**: Performs code reviews on pull requests, files, folders, or any code scope, providing actionable feedback and validation.

### Validate
- **Path**: `.github/prompts/validate.prompt.md`
- **Description**: Runs linting, type checking, and tests, reporting any failures to ensure code quality and correctness.

---

> **Note:** These tools were auto-discovered from trending GitHub repositories and are intended to streamline your development workflow with Copilot.