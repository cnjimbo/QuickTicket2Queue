# 🛠️ Copilot 工具索引

> 由 AI 自动整理分类，包含本仓库所有已安装的 GitHub Copilot 工具。
> 使用 GitHub Copilot Chat 或 VS Code 中的 Copilot 功能调用这些工具。

---

## 🔍 代码审查

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`代码审查助手`](.claude/agents/code-reviewer.md) | Agent | 帮助审查代码，检查项目规范、Bug 和质量问题。适用于提交前或 PR 前的代码检查。 | 在 VS Code 中通过 Copilot Chat 输入“审查当前代码”或指定文件，GitHub PR 页面可直接调用。 |

## 🤖 通用助手

| 工具 | 类型 | 说明 | 使用方式 |
|------|------|------|----------|
| [`代理详情页`](packages/views/agents/components/agent-detail.tsx) | Agent | 用于展示代理详细信息，支持查看和编辑代理属性。 | 在 VS Code 的 Agents 面板中点击代理名称，弹出详情页面。 |
| [`代理列表项`](packages/views/agents/components/agent-list-item.tsx) | Agent | 用于展示代理列表项，支持选择和操作代理。 | 在 Agents 面板中浏览代理列表，点击列表项进行操作。 |
| [`代理管理页`](packages/views/agents/components/agents-page.tsx) | Agent | 用于展示和管理所有代理，支持创建、编辑和归档代理。 | 在 VS Code 的 Agents 面板中访问“全部代理”页面。 |
| [`创建代理对话框`](packages/views/agents/components/create-agent-dialog.tsx) | Agent | 用于新建代理，支持填写代理属性并提交创建。 | 在 Agents 面板点击“新建代理”按钮，弹出创建对话框。 |
| [`指令编辑页`](packages/views/agents/components/tabs/instructions-tab.tsx) | Agent | 用于编辑和保存代理指令，帮助配置代理行为。 | 在代理详情页切换到“指令”标签页进行编辑和保存。 |
| [`设置配置页`](packages/views/agents/components/tabs/settings-tab.tsx) | Agent | 用于配置代理设置，支持调整可见性、运行环境等属性。 | 在代理详情页切换到“设置”标签页进行配置。 |
| [`技能管理页`](packages/views/agents/components/tabs/skills-tab.tsx) | Agent | 用于管理代理技能，支持添加、删除和编辑技能。 | 在代理详情页切换到“技能”标签页进行管理。 |
| [`状态配置`](packages/views/agents/config.ts) | Agent | 用于配置代理状态显示，定义状态标签和颜色。 | 在代理管理相关页面自动应用，无需手动调用。 |

---

*此文件由 [repos-ai-tools-maintain](https://github.com/knewbeing/repos-ai-tools-maintain) workflow 自动生成。*
