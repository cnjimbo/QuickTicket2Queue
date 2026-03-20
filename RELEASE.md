## 26.3.6

### Summary
- 同步发布到 26.3.6 正式版本。
- 发布流程与文档对齐当前 CI 策略（支持手动指定分支、提交、强制发布）。
- 新增发布引用清理工作流，支持清理与 Release 关联且 30 天未更新的分支与标签。

### Changed
- CI 增加清理过期发布引用流程，支持手动触发和定时执行。
- 清理逻辑覆盖 Release 关联的 branch 与 tag，并明确保护 `main`/`master`。
- 保持发布流程参数与工作流一致：`publish_branch`、`publish_commit`、`force_release`。

### Notes
- 当前版本号：`26.3.6`。
- 当前仓库已存在标签：`v26.3.6`。
- 如果需要重新触发 stable/rc 发布，请使用 `workflow_dispatch` 并设置 `force_release=true`。

### Manual Release Checklist
1. 确认 `package.json` 中版本号为目标版本（当前为 `26.3.6`）。
2. 确认目标分支代码已合并并通过检查（至少执行 `pnpm run check`）。
3. 打开 GitHub Actions 的 `CI` 工作流，选择 `Run workflow`。
4. 填写参数：
	- `publish_branch`: 目标分支（如 `main`）
	- `publish_commit`: 可选，指定提交 SHA（不填则使用分支最新提交）
	- `force_release`: 稳定版/RC 发布时设为 `true`
5. 触发后检查执行结果：
	- tag 创建是否成功
	- Release 是否生成并上传构建产物
6. 发布后验证：
	- Release 页面版本与产物命名是否正确
	- 应用内更新检测与下载链路是否正常

### Rollback
1. 若发布异常，先在 Release 页面标记问题版本并暂停推广。
2. 必要时回退到上一个稳定标签重新发布。
3. 修复后使用 `workflow_dispatch` 指定 commit 重新发布。

---

## 26.3.5-rc.1

### Added
- 新增按版本选择更新功能
- 新增降级版本列表展示与选择入口
- 新增全版本更新模式支持

### Changed
- 自动更新预发布策略调整为 RC 通道
- 优化版本号解析、比较与更新筛选逻辑
- 仅在启用“允许向下更新”后显示降级版本列表
- 优化降级版本列表获取链路，增加 GitHub API、HTML 解析与网络回退处理

### Fixed
- 修复向下更新场景下的版本识别与判定问题
- 修复降级版本列表获取失败问题
- 修复企业网络、代理、自签证书环境下版本列表加载异常问题
- 修复降级版本加载失败时重复提示影响体验的问题

### Notes
- 当前版本为 RC 预发布版本，建议先进行验证后再大范围使用
- 如自动更新不可用，可通过 Release 页面手动下载对应版本
