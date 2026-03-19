<p align="center">
  <img width="320" src="./logo.png" alt="Quick Ticket to Queue logo">
</p>

# Quick Ticket to Queue

Quick Ticket to Queue 是一个面向内部支持场景的桌面工具，用于快速创建并提交 ServiceNow 工单。应用提供凭据管理、常用队列维护、历史记录查看和一键打开工单链接等能力，目标是减少重复填写和页面跳转成本。

## 近期更新

- 工单页环境标签与凭据页保持一致，统一使用 `pfeprod` / `pfestg` / `pfetst` 的颜色语义，降低误提交流程风险
- CI 并发控制由版本号切换为分支维度，不同分支可并行构建，同分支串行执行
- CI 增加版本与分支规则的硬校验，`current_version` 不符合分支规范时会直接失败并阻断后续构建

## 核心能力

- 通过桌面表单快速提交 ServiceNow incident
- 使用 OAuth client credentials 获取 token 后发起工单导入请求
- 自动读取当前域账号，减少手动输入 requested by / caller 信息
- 内置常用 queue 列表，并支持新增、删除、恢复默认值
- 保存最近提交成功的工单历史，支持一键跳转到 ServiceNow 记录页
- 支持多环境凭据切换，目前内置 `pfetst`、`pfestg`、`pfeprod`
- 提供 Windows 安装包（NSIS）打包流程，便于分发与安装

## 适用场景

- 经常为固定队列创建工单，希望减少重复录入
- 需要在测试、预发、生产等不同 ServiceNow 环境间切换
- 希望把工单提交动作从浏览器流程收敛到单一桌面工具

## 应用流程

1. 在凭据管理中维护各环境的 `client_id`、`client_secret` 和 `sn_host`
2. 选择当前生效环境
3. 在队列配置中维护常用 queue 和描述映射
4. 在工单页填写用户名、标题、内容并选择目标 queue
5. 提交成功后直接打开生成的工单链接，历史记录也会同步保存

## 内网 / 外网提单说明

### 内网提单（网页登录态）

适用场景：可通过网页登录 ServiceNow 并使用会话态提交，建议作为默认首选方案。

前置条件：

- 当前环境至少配置 `sn_host`
- 可正常打开并登录目标 ServiceNow 页面
- 登录态在有效期内

操作方式：

1. 进入内网工单页
2. 填写标题、内容、队列
3. 点击“网页登录并提交”，按提示完成登录并提交

### 外网提单（OAuth API）

适用场景：已配置凭据并可访问 ServiceNow OAuth 与提单接口，适用于自动化提交。

前置条件：

- 当前环境已配置 `client_id`、`client_secret`、`sn_host`
- 对应环境 token 接口和提单接口可访问
- 当前账号具备目标队列提单权限

操作方式：

1. 进入外网工单页
2. 填写标题、内容、队列
3. 点击“提交工单”并等待返回结果

### 选择建议

- 优先使用内网提单（网页登录态），作为默认提交流程
- 内网提单失败时，先检查 host 配置与登录态是否有效
- 需要批量或自动化处理时，可切换外网提单（OAuth API）

## 技术栈

- Electron 作为桌面运行时
- Vue 3 + Element Plus 构建渲染层界面
- NestJS 运行在 Electron main 进程中承载业务逻辑
- `@doubleshot/nest-electron` 负责 IPC 通信和窗口集成
- `electron-store` 用于本地保存凭据、队列配置和工单历史
- `electron-builder` 用于打包 Windows 安装程序（NSIS）

## 本地开发

### 环境要求

- Node.js 22 或兼容版本
- pnpm 10
- Windows 环境下打包和图标验证体验最佳

### 安装依赖

```bash
pnpm install
```

### 启动开发模式

```bash
pnpm dev
```

执行前会先自动运行 `pnpm install`。

### 调试模式

```bash
pnpm debug
```

执行前会先自动运行 `pnpm install`。

### 构建

```bash
pnpm build
```

构建前会自动生成 IPC 类型。

### 代码检查

```bash
pnpm lint
```

如需同时做 ESLint 和 TypeScript 类型检查：

```bash
pnpm check
```

## 打包

生成 Windows 安装包（NSIS）：

```bash
pnpm dist:win
```

打包输出目录默认在 `build/`。

## CI 发布约束

- 并发分组基于分支名：`github.head_ref || github.ref_name`
- 同一分支的新流水线会取消进行中的同分组任务（`cancel-in-progress: true`）
- 版本号需与分支发布策略匹配（如 `main` 对应稳定版，`develop` 对应 beta，`release/*` 对应 rc，`feature/*` 对应 alpha）
- 当版本号不匹配时，流水线会输出明确错误并失败，后续 build/release 不会继续执行

## 数据与配置说明

- 凭据和当前环境会保存在本地 `electron-store` 中
- 工单历史和 queue 配置也保存在本地，重启应用后仍可保留
- 如果设置了 `ELECTRON_STORE_ENCRYPTION_KEY`，凭据存储会优先使用该密钥
- 未设置时会回退到项目内默认加密 key，仅适合本地和受控环境使用

## 默认环境

应用首次启动时会预置以下 ServiceNow 环境：

- `pfetst`
- `pfestg`
- `pfeprod`

默认 queue 列表也会初始化为一组常用项，并可在应用内自行维护。

## 仓库脚本

```bash
pnpm gen:ipc            # 生成 IPC 类型与方法映射
pnpm gen:favicon        # 生成打包图标资源
pnpm clean              # 清理 dist 目录
pnpm dev                # 启动开发环境
pnpm debug              # 启动调试模式
pnpm build              # 构建应用
pnpm lint               # 运行 ESLint
pnpm lint:fix           # 自动修复部分 ESLint 问题
pnpm typecheck          # 运行 TypeScript 类型检查
pnpm check              # 运行 lint + typecheck
```

## 注意事项

- 提交工单依赖目标 ServiceNow 环境的 OAuth 和导入接口可用
- 当前工单创建流程使用固定字段映射，如果目标接口字段变更，需要同步调整 main 进程中的提交逻辑
- 如果打包后图标没有立即变化，通常是 Windows 图标缓存所致，可尝试删除旧产物后重新打包验证

## 项目定位

一个围绕 Quick Ticket to Queue 业务场景定制的 Electron 桌面应用。
