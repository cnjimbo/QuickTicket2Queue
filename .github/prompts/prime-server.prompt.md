---
description: "Prime agent with server/backend codebase understanding"
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
  工具名称: 后端架构加载
  功能分类: 架构设计
  功能说明: 帮助加载并分析后端代码结构，辅助理解服务器架构和关键文件。
  使用方式: 在 VS Code Copilot 工具栏中选择 prime-server，进行后端架构分析和上下文加载。
  关键标签: 架构设计、后端、代码分析
-->

# Prime Server: Load Backend Context

## Objective

Build comprehensive understanding of the server codebase by analyzing structure and key files.

## Process

1. Study the entry point (`server/src/index.ts`)
2. Study the services (`server/src/services/`)
3. Study the middleware (`server/src/middleware/`)
4. Study the database layer (`server/src/db/`)
5. Check `server/package.json` for dependencies

## Output

Produce a scannable summary of what you learned:

- **Purpose**: What the backend does
- **Tech Stack**: Framework, database, validation
- **API Routes**: Available endpoints
- **Data Model**: Core entities from `shared/types.ts`
- **Patterns**: Database patterns, error handling, validation approach

Use bullet points. Keep it concise.
