# COPILOT_TOOLS.md

This document lists all GitHub Copilot tools installed in this repository, grouped by type. It explains their purpose and provides concrete usage examples for both VS Code and GitHub.com Copilot workflows.

---

## Quick Start

1. **Open VS Code or GitHub.com Copilot sidebar.**
2. **Select a Copilot tool (agent or skill) from the tools menu.**
3. **Follow the usage examples below to maximize productivity.**
4. **Refer to the "Customization" section to add or modify tools as needed.**

---

## Tool Overview

| Type         | Name             | File Path                                        | Purpose                                                                                  |
|--------------|------------------|--------------------------------------------------|------------------------------------------------------------------------------------------|
| Skill        | insforge-dev     | .agents/skills/insforge-dev/SKILL.md             | Coding standards and best practices for InsForge monorepo contributors                   |
| Skill        | backend          | .agents/skills/insforge-dev/backend/SKILL.md     | Backend development guidelines for InsForge backend package                              |
| Skill        | prime-server     | .github/prompts/prime-server.prompt.md           | Loads backend/server context for architectural analysis                                  |
| Skill        | prime            | .github/prompts/prime.prompt.md                  | Loads project-wide codebase context for architectural analysis                           |
| Skill        | review           | .github/prompts/review.prompt.md                 | Code review for PRs, files, folders, or custom scopes                                    |
| Skill        | validate         | .github/prompts/validate.prompt.md               | Runs linter, type checker, and tests; reports failures                                   |
| Agent        | code-reviewer    | .claude/agents/code-reviewer.md                  | Reviews code for guideline compliance, bugs, and quality issues                          |
| Agent        | code-simplifier  | .claude/agents/code-simplifier.md                | Identifies code simplification opportunities                                             |
| Agent        | codebase-analyst | .claude/agents/codebase-analyst.md               | Analyzes codebase implementation, data flow, and documents technical workings            |
| Agent        | rulecheck-agent  | .claude/agents/rulecheck-agent.md                | Autonomous agent for rule violation detection, fixes, validation, and PR creation        |

---

## Instructions

*No instruction tools are currently installed.*

---

## Agents

### code-reviewer

| Name           | code-reviewer                          |
|----------------|----------------------------------------|
| File Path      | .claude/agents/code-reviewer.md         |
| Purpose        | Reviews code for project guideline compliance, bugs, and quality issues. Use after writing code, before commits, or before PRs. Only high-confidence issues (80+) are reported to minimize noise. |

**Usage Example:**
- **VS Code:**  
  1. Open Copilot sidebar → Select "code-reviewer".
  2. Click "Run" to review unstaged changes or specify files/folders.
  3. Review Copilot's feedback and address issues before committing.

- **GitHub.com:**  
  1. In a Pull Request, select "code-reviewer" from Copilot tools.
  2. Let Copilot analyze the PR and provide actionable review comments.

---

### code-simplifier

| Name           | code-simplifier                        |
|----------------|----------------------------------------|
| File Path      | .claude/agents/code-simplifier.md       |
| Purpose        | Identifies code simplification opportunities for clarity and maintainability. Reports before/after suggestions. Advisory only—does not modify files. |

**Usage Example:**
- **VS Code:**  
  1. Open Copilot sidebar → Select "code-simplifier".
  2. Click "Run" to analyze recently changed code.
  3. Review suggestions and manually refactor as needed.

---

### codebase-analyst

| Name           | codebase-analyst                       |
|----------------|----------------------------------------|
| File Path      | .claude/agents/codebase-analyst.md      |
| Purpose        | Analyzes implementation details, traces data flow, and documents technical workings with precise file:line references. Use for deep codebase understanding. |

**Usage Example:**
- **VS Code:**  
  1. Open Copilot sidebar → Select "codebase-analyst".
  2. Ask specific questions, e.g., "How does authentication flow work in backend?"
  3. Review detailed analysis and file references.

---

### rulecheck-agent

| Name           | rulecheck-agent                        |
|----------------|----------------------------------------|
| File Path      | .claude/agents/rulecheck-agent.md       |
| Purpose        | Autonomous code quality agent: scans for rule violations, fixes them in an isolated worktree, runs validation, creates a PR, and updates memory for future runs. |

**Usage Example:**
- **VS Code:**  
  1. Open Copilot sidebar → Select "rulecheck-agent".
  2. Click "Run" to start a scan and auto-fix process.
  3. Review the generated PR and validation results.

- **GitHub.com:**  
  1. Trigger rulecheck-agent from Copilot tools in a PR or branch.
  2. Review automated fixes and validation in the resulting PR.

---

## Skills / Prompts

### insforge-dev

| Name           | insforge-dev                           |
|----------------|----------------------------------------|
| File Path      | .agents/skills/insforge-dev/SKILL.md    |
| Purpose        | Coding standards and best practices for InsForge monorepo contributors. Use when editing platform, dashboard, UI library, schemas, tests, or docs. |

**Usage Example:**
- **VS Code:**  
  1. Open Copilot sidebar → Select "insforge-dev".
  2. Use Copilot suggestions to ensure code follows InsForge conventions.

---

### backend

| Name           | backend                                |
|----------------|----------------------------------------|
| File Path      | .agents/skills/insforge-dev/backend/SKILL.md |
| Purpose        | Backend development guidelines for InsForge backend package. Covers routes, services, providers, auth, database logic, realtime, schedules, and backend tests. |

**Usage Example:**
- **VS Code:**  
  1. Open Copilot sidebar → Select "backend".
  2. Use Copilot to guide backend code structure and best practices.

---

### prime-server

| Name           | prime-server                           |
|----------------|----------------------------------------|
| File Path      | .github/prompts/prime-server.prompt.md  |
| Purpose        | Loads backend/server context for architectural analysis. Helps understand server structure and key files. |

**Usage Example:**
- **VS Code:**  
  1. Open Copilot sidebar → Select "prime-server".
  2. Ask: "Show me the main backend modules and their dependencies."
  3. Review Copilot's architectural summary.

---

### prime

| Name           | prime                                  |
|----------------|----------------------------------------|
| File Path      | .github/prompts/prime.prompt.md         |
| Purpose        | Loads project-wide codebase context for architectural analysis. Useful for understanding client/server structure and relationships. |

**Usage Example:**
- **VS Code:**  
  1. Open Copilot sidebar → Select "prime".
  2. Ask: "What are the main components of this project?"
  3. Review the generated project overview.

---

### review

| Name           | review                                 |
|----------------|----------------------------------------|
| File Path      | .github/prompts/review.prompt.md        |
| Purpose        | Code review for PRs, files, folders, or custom scopes. Finds potential issues and suggests improvements. |

**Usage Example:**
- **VS Code:**  
  1. Open Copilot sidebar → Select "review".
  2. Specify a file or PR number, e.g., "review src/api/user.ts".
  3. Review Copilot's feedback and suggestions.

---

### validate

| Name           | validate                               |
|----------------|----------------------------------------|
| File Path      | .github/prompts/validate.prompt.md      |
| Purpose        | Runs linter, type checker, and tests; reports any failures. Ensures code quality and correctness. |

**Usage Example:**
- **VS Code:**  
  1. Open Copilot sidebar → Select "validate".
  2. Click "Run" to execute lint, type check, and tests.
  3. Review failure reports and fix issues.

---

## Customization

### Adding a Tool

1. **Create a tool definition file**  
   - For skills/prompts: Place in `.github/prompts/` or `.agents/skills/`.
   - For agents: Place in `.claude/agents/`.
2. **Follow the format:**  
   - Include `name`, `description`, and any relevant configuration.
3. **Update this document:**  
   - Add the new tool to the relevant section and table above.

### Modifying a Tool

1. **Edit the tool's definition file** at its listed path.
2. **Update the description, logic, or configuration as needed.**
3. **Regenerate this document** to reflect changes.

### Removing a Tool

1. **Delete the tool's definition file** from the repository.
2. **Remove its entry from this document.**

---

**For further assistance, consult the Copilot documentation or reach out to the repository maintainers.**

---

*Last updated: 2024-06*