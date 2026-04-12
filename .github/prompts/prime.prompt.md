---
description: "Prime agent with codebase understanding"
agent: "plan"
tools:
  - codebase
  - readFile
  - textSearch
  - fileSearch
  - listDirectory
  - usages
---

<!--
🏗️ 【中文注释】
  工具名称: 项目架构加载
  功能分类: 架构设计
  功能说明: 用于加载项目整体代码结构，辅助理解客户端和服务端架构。
  使用方式: 在 VS Code Copilot 工具栏中选择 prime，进行项目架构分析和上下文加载。
  关键标签: 架构设计、项目分析、上下文加载
-->

# Prime: Load Project Context

## Objective

Build comprehensive understanding of this codebase by analyzing structure and key files.

## Process

1. Study the client source (`client/src/`)
2. Study the server source (`server/src/`)
3. Study the shared types (`shared/types.ts`)
4. Check recent commits with `git log --oneline -5`

## Output

Produce a scannable summary of what you learned:

- **Project Purpose**: One sentence
- **Tech Stack**
  - Frontend: framework, UI library, state management
  - Backend: framework, database, validation
- **Data Model**: Core entities
- **Key Patterns**: Database, API, state management patterns
- **Current State**: Recent commits, current branch

Use bullet points. Keep it concise.
