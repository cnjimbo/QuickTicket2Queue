# 🛠️ Copilot 工具索引

> 由 AI 自动整理分类，包含本仓库所有已安装的 GitHub Copilot 工具。
> 使用 GitHub Copilot Chat 或 VS Code 中的 Copilot 功能调用这些工具。

---

## 🔍 代码审查

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`代码审查助手`](.claude/agents/code-reviewer.md) | Agent | 帮助审查代码，发现高置信度的项目规范违规、Bug 和质量问题。适用于代码提交前或 PR 前的检查。 | 在 VS Code 中选择文件后，右键菜单或通过 Copilot Chat 输入“审查代码”调用。 |
| [`代码分析专家`](.claude/agents/codebase-analyst.md) | Agent | 帮助分析代码实现细节，追踪数据流并精确定位技术细节，适合深入理解现有代码。 | 在 Copilot Chat 输入“分析代码实现”并指定文件或行号调用。 |
| [`代码库探索器`](.claude/agents/codebase-explorer.md) | Agent | 用于全面探索代码库，定位文件、目录结构并提取实际代码模式，适合快速了解项目结构。 | 在 Copilot Chat 输入“探索代码库”或“查找文件”调用。 |
| [`提交助手`](.claude/skills/archon-dev/cookbooks/commit.md) | 提示词 | 帮助分析变更并生成结构化的 Git 提交，支持自然语言描述目标文件和提交信息。 | 在 VS Code 中通过 Copilot Chat 输入“生成提交”或“分析变更”调用。 |
| [`调试助手`](.claude/skills/archon-dev/cookbooks/debug.md) | 提示词 | 用于系统性根因分析，结合假设验证和证据链，帮助定位和解决错误。 | 在 Copilot Chat 输入“调试错误”并附上错误描述或堆栈信息调用。 |
| [`Issue助手`](.claude/skills/archon-dev/cookbooks/issue.md) | 提示词 | 用于创建结构化的 GitHub Issue，自动分类 Bug 或功能请求并选择合适模板提交。 | 在 Copilot Chat 输入“创建Issue”或“提交Bug/功能”调用。 |

## ♻️ 代码重构

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`代码简化助手`](.claude/agents/code-simplifier.md) | Agent | 用于识别代码简化机会，提升代码清晰度和可维护性，保持功能不变。适用于代码修改后优化。 | 在 VS Code 中选中代码片段，通过 Copilot Chat 输入“简化代码”调用。 |

## 🔍 代码审查

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`代码审查助手`](.claude/agents/code-reviewer.md) | Agent | 帮助审查代码，发现高置信度的项目规范违规、Bug 和质量问题。适用于代码提交前或 PR 前的检查。 | 在 VS Code 中选择文件后，右键菜单或通过 Copilot Chat 输入“审查代码”调用。 |
| [`代码分析专家`](.claude/agents/codebase-analyst.md) | Agent | 帮助分析代码实现细节，追踪数据流并精确定位技术细节，适合深入理解现有代码。 | 在 Copilot Chat 输入“分析代码实现”并指定文件或行号调用。 |
| [`代码库探索器`](.claude/agents/codebase-explorer.md) | Agent | 用于全面探索代码库，定位文件、目录结构并提取实际代码模式，适合快速了解项目结构。 | 在 Copilot Chat 输入“探索代码库”或“查找文件”调用。 |
| [`提交助手`](.claude/skills/archon-dev/cookbooks/commit.md) | 提示词 | 帮助分析变更并生成结构化的 Git 提交，支持自然语言描述目标文件和提交信息。 | 在 VS Code 中通过 Copilot Chat 输入“生成提交”或“分析变更”调用。 |
| [`调试助手`](.claude/skills/archon-dev/cookbooks/debug.md) | 提示词 | 用于系统性根因分析，结合假设验证和证据链，帮助定位和解决错误。 | 在 Copilot Chat 输入“调试错误”并附上错误描述或堆栈信息调用。 |
| [`Issue助手`](.claude/skills/archon-dev/cookbooks/issue.md) | 提示词 | 用于创建结构化的 GitHub Issue，自动分类 Bug 或功能请求并选择合适模板提交。 | 在 Copilot Chat 输入“创建Issue”或“提交Bug/功能”调用。 |

## 🏗️ 架构设计

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`调研助手`](.claude/skills/archon-dev/cookbooks/investigate.md) | 提示词 | 帮助战略性调研技术选型、方案比较和代码库可行性评估，适合架构决策和集成规划。 | 在 Copilot Chat 输入“调研方案”或“评估技术”调用。 |

## 📌 任务规划

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`计划助手`](.claude/skills/archon-dev/cookbooks/plan.md) | 提示词 | 帮助生成详细的实施计划，结合代码库智能分析，适用于需求拆解和项目规划。 | 在 Copilot Chat 输入“生成计划”并指定PRD或Issue编号调用。 |

## 🤖 通用助手

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`实施助手`](.claude/skills/archon-dev/cookbooks/implement.md) | 提示词 | 用于按计划文件逐步执行任务，自动检测环境和分支，适合一键实施方案。 | 在 Copilot Chat 输入“执行计划”并指定.plan.md文件调用。 |

---

*此文件由 [repos-ai-tools-maintain](https://github.com/knewbeing/repos-ai-tools-maintain) workflow 自动生成。*
