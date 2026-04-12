# 🛠️ Copilot 工具索引

> 由 AI 自动整理分类，包含本仓库所有已安装的 GitHub Copilot 工具。
> 使用 GitHub Copilot Chat 或 VS Code 中的 Copilot 功能调用这些工具。

---

## 📋 编码规范

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`InsForge开发`](.agents/skills/insforge-dev/SKILL.md) | 提示词 | 帮助维护 InsForge 平台及相关包的编码规范和最佳实践。适用于平台、仪表盘、UI 库、共享 schema、测试和文档的开发。 | 在 VS Code 中选择 Copilot 工具栏，应用 insforge-dev 技能进行代码编辑时自动提示。 |
| [`后端开发规范`](.agents/skills/insforge-dev/backend/SKILL.md) | 提示词 | 用于 InsForge 后端包的编码规范和开发流程指导，涵盖路由、服务、数据库、鉴权等。 | 在 VS Code 中选择 Copilot 工具栏，应用 backend 技能进行后端代码编辑时自动提示。 |

## 🔍 代码审查

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`代码审查助手`](.claude/agents/code-reviewer.md) | Agent | 帮助审查代码是否符合项目规范，排查 Bug 和质量问题，适用于提交前的代码检查。 | 在 GitHub PR 或 VS Code Copilot 工具栏中选择 code-reviewer 进行代码审查。 |
| [`代码分析专家`](.claude/agents/codebase-analyst.md) | Agent | 帮助分析代码实现细节，追踪数据流并生成技术文档，适用于深入理解代码结构。 | 在 VS Code Copilot 工具栏中选择 codebase-analyst，针对指定文件或模块进行分析。 |
| [`规则检查代理`](.claude/agents/rulecheck-agent.md) | Agent | 自动扫描代码规则违规，修复并验证后创建 PR，持续提升代码质量。 | 在 GitHub Actions 或 VS Code Copilot 工具栏中选择 rulecheck-agent，自动执行规则检查和修复。 |
| [`代码审查技能`](.github/prompts/review.prompt.md) | 提示词 | 用于审查 PR、文件、文件夹或任意代码范围，发现潜在问题并提出建议。 | 在 GitHub PR 或 VS Code Copilot 工具栏中选择 review，输入审查范围进行代码检查。 |

## ♻️ 代码重构

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`代码简化助手`](.claude/agents/code-simplifier.md) | Agent | 用于识别代码简化和优化机会，提升代码可读性和可维护性，保留原有功能。 | 在 VS Code Copilot 工具栏中选择 code-simplifier，对修改后的代码进行简化建议。 |

## 🧪 测试辅助

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`代码验证助手`](.github/prompts/validate.prompt.md) | 提示词 | 帮助运行 linter、类型检查和测试，自动报告所有失败项，保障代码质量。 | 在 VS Code Copilot 工具栏中选择 validate，自动执行 lint、类型检查和测试并报告结果。 |

## 🏗️ 架构设计

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`后端架构加载`](.github/prompts/prime-server.prompt.md) | 提示词 | 帮助加载并分析后端代码结构，辅助理解服务器架构和关键文件。 | 在 VS Code Copilot 工具栏中选择 prime-server，进行后端架构分析和上下文加载。 |
| [`项目架构加载`](.github/prompts/prime.prompt.md) | 提示词 | 用于加载项目整体代码结构，辅助理解客户端和服务端架构。 | 在 VS Code Copilot 工具栏中选择 prime，进行项目架构分析和上下文加载。 |

---

*此文件由 [repos-ai-tools-maintain](https://github.com/knewbeing/repos-ai-tools-maintain) workflow 自动生成。*
