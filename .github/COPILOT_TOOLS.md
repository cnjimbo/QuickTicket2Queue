# COPILOT_TOOLS.md

> **Repository Copilot Tools Reference**  
> This document lists all GitHub Copilot tools installed in this repository, grouped by type. It explains what each tool does and how to use them effectively in VS Code (with Copilot Chat) or on GitHub.com.

---

## Quick Start

1. **Open VS Code** or **GitHub.com Copilot Chat**.
2. **Identify your task** (e.g., code review, debugging, planning).
3. **Find the relevant tool** in the table below.
4. **Use the provided usage example** to invoke the tool:
   - In VS Code: Use Copilot Chat (`Ctrl+I` or `/` in chat input), right-click context menu, or select code/files.
   - On GitHub.com: Use Copilot Chat in PRs, Issues, or directly in the code browser.

---

## Tool Overview

| Type        | Tool Name           | File Path                                         | Purpose Summary                                               |
|-------------|---------------------|---------------------------------------------------|---------------------------------------------------------------|
| Agent       | code-reviewer       | `.claude/agents/code-reviewer.md`                 | Reviews code for guideline compliance, bugs, and quality.     |
| Agent       | code-simplifier     | `.claude/agents/code-simplifier.md`               | Identifies code simplification opportunities.                 |
| Agent       | codebase-analyst    | `.claude/agents/codebase-analyst.md`              | Analyzes code implementation and technical workings.          |
| Agent       | codebase-explorer   | `.claude/agents/codebase-explorer.md`             | Explores codebase structure and extracts code patterns.       |
| Skill       | commit              | `.claude/skills/archon-dev/cookbooks/commit.md`   | Analyzes changes and generates structured Git commits.        |
| Skill       | debug               | `.claude/skills/archon-dev/cookbooks/debug.md`    | Systematic root cause analysis and debugging.                 |
| Skill       | implement           | `.claude/skills/archon-dev/cookbooks/implement.md`| Executes plan files step-by-step with validation.             |
| Skill       | investigate         | `.claude/skills/archon-dev/cookbooks/investigate.md`| Strategic research and feasibility assessment.             |
| Skill       | issue               | `.claude/skills/archon-dev/cookbooks/issue.md`    | Creates structured GitHub issues from context.                |
| Skill       | plan                | `.claude/skills/archon-dev/cookbooks/plan.md`     | Generates detailed implementation plans.                      |

---

## Agents

Agents are specialized Copilot tools that perform complex, multi-step tasks. Use them for deep code analysis, review, or refactoring.

| Name              | File Path                               | Purpose                                                      | Usage Example                                                |
|-------------------|-----------------------------------------|--------------------------------------------------------------|--------------------------------------------------------------|
| **code-reviewer** | `.claude/agents/code-reviewer.md`       | Reviews code for project guideline compliance, bugs, and quality issues. Reports only high-confidence issues (confidence ≥80). | **VS Code:**<br>1. Select files or code.<br>2. Copilot Chat: `Review code` or right-click → "Copilot: Review code".<br>**GitHub.com:**<br>In PRs, Copilot Chat: `Review code in this PR`. |
| **code-simplifier** | `.claude/agents/code-simplifier.md`   | Identifies opportunities to simplify code for clarity and maintainability. Provides before/after suggestions. Advisory only. | **VS Code:**<br>1. Select code.<br>2. Copilot Chat: `Simplify code`.<br>**GitHub.com:**<br>On file view, Copilot Chat: `Suggest simplifications for this file`. |
| **codebase-analyst** | `.claude/agents/codebase-analyst.md` | Analyzes implementation details, traces data flow, and documents technical workings with file:line references. | **VS Code:**<br>Copilot Chat: `Analyze code implementation in <file>:<line>`.<br>**GitHub.com:**<br>Copilot Chat: `Explain how <function> works in <file>`. |
| **codebase-explorer** | `.claude/agents/codebase-explorer.md` | Comprehensive codebase exploration: locates files, maps directory structure, and extracts code patterns. | **VS Code:**<br>Copilot Chat: `Explore codebase` or `Find all controllers`.<br>**GitHub.com:**<br>Copilot Chat: `Show directory structure and main patterns`. |

---

## Skills / Prompts

Skills are focused Copilot workflows for common development tasks. Use them to automate, plan, debug, or document your work.

| Name              | File Path                                         | Purpose                                                      | Usage Example                                                |
|-------------------|---------------------------------------------------|--------------------------------------------------------------|--------------------------------------------------------------|
| **commit**        | `.claude/skills/archon-dev/cookbooks/commit.md`   | Analyzes changes and creates well-structured Git commits. Supports natural language file targeting. | **VS Code:**<br>Copilot Chat: `Generate commit for changed files` or `Commit with message: Fix login bug`.<br>**GitHub.com:**<br>Copilot Chat: `Analyze changes and suggest commit message`. |
| **debug**         | `.claude/skills/archon-dev/cookbooks/debug.md`    | Systematic root cause analysis using hypothesis testing and evidence chains. | **VS Code:**<br>Copilot Chat: `Debug error: TypeError in auth.js`.<br>**GitHub.com:**<br>Copilot Chat: `Diagnose stack trace in issue #123`. |
| **implement**     | `.claude/skills/archon-dev/cookbooks/implement.md`| Executes a plan file step-by-step, auto-detects environment and branch. | **VS Code:**<br>Copilot Chat: `Implement plan from .plan.md`.<br>**GitHub.com:**<br>Copilot Chat: `Execute implementation plan for feature X`. |
| **investigate**   | `.claude/skills/archon-dev/cookbooks/investigate.md`| Strategic research: technology selection, approach comparison, codebase feasibility. | **VS Code:**<br>Copilot Chat: `Investigate: Should we use Redis or Memcached?`.<br>**GitHub.com:**<br>Copilot Chat: `Assess feasibility of migrating to Turso`. |
| **issue**         | `.claude/skills/archon-dev/cookbooks/issue.md`    | Creates structured GitHub issues, auto-classifies bug/feature, selects template. | **VS Code:**<br>Copilot Chat: `Create issue: Login fails on Safari`.<br>**GitHub.com:**<br>Copilot Chat: `Submit bug report for recent crash`. |
| **plan**          | `.claude/skills/archon-dev/cookbooks/plan.md`     | Generates detailed implementation plans from PRDs, feature descriptions, or issues. | **VS Code:**<br>Copilot Chat: `Generate plan for issue #456` or `Create plan for new payment integration`.<br>**GitHub.com:**<br>Copilot Chat: `Draft implementation plan for feature request`. |

---

## Instructions

> *No custom instruction tools are installed in this repository.*

---

## Customization

### Adding a New Copilot Tool

1. **Create the tool file** in the appropriate directory:
   - Agents: `.claude/agents/`
   - Skills/Prompts: `.claude/skills/archon-dev/cookbooks/`
   - Instructions: `.claude/instructions/`
2. **Define the tool metadata** at the top of the file (YAML frontmatter or Markdown).
3. **Document its purpose, usage, and input/output expectations**.
4. **Update this COPILOT_TOOLS.md**:
   - Add the new tool to the relevant table.
   - Provide a concrete usage example.

### Modifying Existing Tools

- **Edit the tool file** to update instructions, logic, or metadata.
- **Revise the entry** in this document if purpose or usage changes.
- **Test in Copilot Chat** (VS Code or GitHub.com) to ensure correct invocation.

---

## Tips for Effective Use

- **Be specific** in Copilot Chat prompts (e.g., reference files, lines, or error messages).
- **Use context menus** in VS Code for quick access to agent actions.
- **Leverage skills** for routine tasks (commits, debugging, planning).
- **Combine tools**: For example, use `plan` to generate a roadmap, then `implement` to execute.

---

> For questions or to request new tools, open a GitHub Issue or contact the repository maintainers.

---

**End of COPILOT_TOOLS.md**