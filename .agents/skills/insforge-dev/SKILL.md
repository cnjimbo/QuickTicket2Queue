---
name: insforge-dev
description: Use this skill set when contributing to the InsForge monorepo itself. This is for InsForge maintainers and contributors editing the platform, the shared dashboard package, the self-hosting shell, the UI library, shared schemas, tests, or docs.
---

<!--
📋 【中文注释】
  工具名称: InsForge开发
  功能分类: 编码规范
  功能说明: 帮助维护 InsForge 平台及相关包的编码规范和最佳实践。适用于平台、仪表盘、UI 库、共享 schema、测试和文档的开发。
  使用方式: 在 VS Code 中选择 Copilot 工具栏，应用 insforge-dev 技能进行代码编辑时自动提示。
  关键标签: 编码规范、最佳实践、平台维护
-->

# InsForge Dev

Use this skill set for work inside the InsForge repository.

Then use the narrowest package skill that matches the task:

- `backend`
- `dashboard`
- `ui`
- `shared-schemas`
- `docs`

## Core Rules

1. Identify the package boundary before editing.
   - `backend/`: API, auth, database, providers, realtime, schedules
   - `packages/dashboard/`: publishable dashboard package that supports `self-hosting` and `cloud-hosting` modes
   - `frontend/`: local React + Vite shell that mounts `packages/dashboard/` in `self-hosting` mode
   - `packages/shared-schemas/`: cross-package contracts
   - `packages/ui/`: reusable design-system primitives
   - `docs/`: product and agent-facing documentation

2. Put code in the narrowest correct layer.
   - Contract change: `packages/shared-schemas/` first, then consumers.
   - Backend behavior: route -> service -> provider/infra.
   - Shared dashboard behavior, routes, features, exports, and host contracts: `packages/dashboard/`.
   - Self-hosting-only bootstrap, env wiring, and shell styling: `frontend/`.
   - Reusable primitive: `packages/ui/` first.

3. Preserve repo conventions.
   - Backend TS source uses ESM-style `.js` import specifiers.
   - Backend success responses usually return raw JSON, not `{ data }`.
   - Backend validation commonly uses shared Zod schemas plus `AppError`.
   - Dashboard data access goes through `apiClient` and React Query.
   - Shared payloads belong in `@insforge/shared-schemas`.
   - Never use the TypeScript `any` type. Prefer precise types, schema-derived types, `unknown`, or generics.

4. Do not confuse repo development with app development on InsForge.
   - This repo contains the platform, the publishable dashboard package, and a local shell for self-hosting mode.
   - Keep guidance focused on maintaining InsForge itself.

## Finish Rules

- Run the smallest validation that gives confidence for the change.
- Use repo-level checks like `npm run lint`, `npm run build`, and `npm test` when the change crosses package boundaries.
- `npm run typecheck` does not cover `packages/dashboard/` or `packages/shared-schemas/`, so run package-specific validation when either package changes.
- Use the package-specific validation steps in the child skill when the work is isolated to one package.
- When reporting back, state what changed, what you validated, and what you could not validate.
