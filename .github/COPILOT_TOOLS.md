# COPILOT_TOOLS.md

This document describes all installed GitHub Copilot tools in this repository. It explains their purpose, locations, and how to use them effectively in VS Code or GitHub.com. Use this guide to supercharge your development workflow with Copilot-powered agents, instructions, and skills.

---

## Quick Start

1. **Open VS Code or GitHub.com** and ensure GitHub Copilot is enabled.
2. **Explore Agents**: Use the "Agents" panel in VS Code to manage, review, and configure agents.
3. **Invoke Code Reviewer**: After coding, trigger the `code-reviewer` agent to review your changes.
4. **Customize Agents**: Edit agent instructions, settings, and skills directly in their respective tabs.
5. **Add or Modify Tools**: See the [Customization](#customization) section for guidance.

---

## Tools Overview

| Type         | Count |
|--------------|-------|
| Agents       | 11    |
| Instructions | 0     |
| Skills/Prompts | 0   |

---

## Agents

Agents are Copilot-powered helpers that automate tasks, review code, and manage workflows. Use them via the VS Code Agents panel or GitHub Copilot chat.

| Name                  | File Path                                               | Purpose                                                                                   | Usage Example                                                                                   |
|-----------------------|--------------------------------------------------------|-------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| **code-reviewer**     | `.claude/agents/code-reviewer.md`                      | Reviews code for guideline compliance, bugs, and quality issues.                          | In VS Code, run `Copilot: Run Agent` → select `code-reviewer`.<br>Or, in Copilot Chat: <br>`Review my unstaged changes.` |
| **agent-detail**      | `packages/views/agents/components/agent-detail.tsx`    | Displays agent details; allows viewing and editing agent properties.                      | In VS Code, open the Agents panel and click an agent to view details.<br>Edit agent attributes as needed. |
| **agent-list-item**   | `packages/views/agents/components/agent-list-item.tsx` | Shows agent list items; supports selection and actions on agents.                         | Browse the Agents panel; click an agent in the list to select or operate on it.                 |
| **agents-page**       | `packages/views/agents/components/agents-page.tsx`     | Manages all agents; supports creating, editing, and archiving agents.                     | In VS Code, open the Agents panel and select "All Agents" to manage agents.                     |
| **create-agent-dialog** | `packages/views/agents/components/create-agent-dialog.tsx` | Dialog for creating new agents; fill in properties and submit.                      | In Agents panel, click "New Agent" to open dialog; enter details and create agent.              |
| **instructions-tab**  | `packages/views/agents/components/tabs/instructions-tab.tsx` | Edit and save agent instructions to configure behavior.                            | In agent detail view, switch to "Instructions" tab; edit instructions and click "Save".         |
| **settings-tab**      | `packages/views/agents/components/tabs/settings-tab.tsx` | Configure agent settings (visibility, environment, etc.).                         | In agent detail view, switch to "Settings" tab; adjust settings and save changes.               |
| **skills-tab**        | `packages/views/agents/components/tabs/skills-tab.tsx` | Manage agent skills; add, remove, or edit skills.                                        | In agent detail view, switch to "Skills" tab; manage skills as needed.                          |
| **tasks-tab**         | `packages/views/agents/components/tabs/tasks-tab.tsx`  | Manage agent tasks; view and interact with tasks assigned to agents.                      | In agent detail view, switch to "Tasks" tab; review and update tasks.                           |
| **config**            | `packages/views/agents/config.ts`                      | Configures agent status display (labels, colors, etc.).                                   | Status config is applied automatically in agent management UI; no manual action needed.          |

---

## Instructions

_No instruction tools are currently installed in this repository._

---

## Skills/Prompts

_No skill or prompt tools are currently installed in this repository._

---

## Usage Examples

### Reviewing Code with Copilot Agent

- **VS Code**:  
  1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`).
  2. Run `Copilot: Run Agent`.
  3. Select `code-reviewer`.
  4. Optionally specify files or let it review unstaged changes.

- **GitHub.com Copilot Chat**:  
  ```
  Review my latest changes for bugs and guideline compliance.
  ```

### Managing Agents

- **Viewing Agent Details**:  
  - Open the Agents panel in VS Code, click an agent to view details (uses `agent-detail`).

- **Creating a New Agent**:  
  - Click "New Agent" in the Agents panel to open the creation dialog (`create-agent-dialog`).

- **Editing Instructions/Settings/Skills**:  
  - In agent detail, switch to the relevant tab (`instructions-tab`, `settings-tab`, `skills-tab`) and edit as needed.

---

## Customization

### Adding a New Tool

1. **Create the Tool File**:  
   - Place your tool file in the appropriate directory (e.g., `.claude/agents/` for agents).
   - Follow the format of existing tools for metadata and implementation.

2. **Register the Tool**:  
   - Update your repository's tool registry/configuration if required.

3. **Document the Tool**:  
   - Add an entry in this file with name, path, purpose, and usage example.

### Modifying an Existing Tool

1. **Edit the Tool File**:  
   - Update instructions, settings, or skills in their respective files.

2. **Reload in VS Code**:  
   - Restart VS Code or reload the Agents panel to apply changes.

3. **Update Documentation**:  
   - Reflect changes in this file for clarity.

---

## Need Help?

- For Copilot configuration, refer to [GitHub Copilot Documentation](https://docs.github.com/en/copilot).
- For agent-specific issues, check the tool file for comments and instructions.

---

**Keep this file updated as you add or modify Copilot tools to ensure your team leverages all available capabilities!**