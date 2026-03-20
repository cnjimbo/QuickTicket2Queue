# 分支版本校验 Prompt

## 目标

- 根据当前 Git 分支名校验 `package.json` 中的 `version` 是否符合约定; 如果不符合，则自动修正 `package.json` 的 `version`，并 stage.
- ci.yml 验证分支与版本规则，规则符合则发布，否则不进行发布。
- 根据当前markdown说明，检查所有钩子，vite.config.mts和electron-builder.config.ts中的配置，让其在运行时符合文档中的要求，如果不符合则修复

## 输入

- `branchName`：当前 Git 分支名
- `appVersion`：`package.json` 的 `version` 字段

## Hook 自动同步策略

- `pre-commit`：提交前按当前分支修正 `package.json` 的 `version`，并自动 stage
- `post-checkout`：切换分支或新建并切换到分支后，按当前分支修正 `package.json` 的 `version`
- `main`：同步为稳定版 `x.y.z`
- `release/*`：同步为 `rc` 预发布版 `x.y.z-rc.N`
- `develop/*`：同步为 `beta` 预发布版 `x.y.z-beta.N`
- `feature/*`：同步为 `alpha` 预发布版 `x.y.z-alpha.N`
- 其他开始的分支：同步为 `alpha` 预发布版 `x.y.z-alpha.N`

## Hook 安全原则

- 适用范围为 `.husky` 下所有 hook 入口文件与 `scripts` 子目录脚本
- Hook 只允许修改工作区和暂存区内容，例如修改 `package.json` 与执行 `git add`
- Hook 严禁主动修改 HEAD，禁止执行会变更引用或触发嵌套 Git 流程的命令，例如 `git checkout`、`git switch`、`git commit`、`git merge`、`git rebase`、`git reset`
- Hook 严禁在执行期间触发新的提交流程，避免与当前 commit/push 流程并发更新引用
- 所有 hook 执行前都必须先通过静态扫描，确认未引入危险 Git 命令
- `pre-commit` 与 `pre-push` 在结束前必须校验 HEAD 未变化，若变化则立即失败

## 分支与版本规则

### `main`

- 只允许稳定版：`x.y.z`
- 不允许其他任何版本

### `develop/*`

- 允许：`x.y.z-alpha.N`
- 允许：`x.y.z-beta.N`
- 不允许其他任何版本

### `feature/*`

- 允许：`x.y.z-alpha.N`
- 允许：`x.y.z-beta.N`
- 不允许其他任何版本

### `release/*`

- 只允许：`x.y.z-rc.N`

### 其他分支

- 不限制版本格式，但建议使用 `x.y.z-alpha.N` 或 `x.y.z-beta.N` 以便区分
- CI.yml 对没有匹配的分支不执行发布

## ci.yml 发布说明
### 版本约束
- 稳定版格式：`数字.数字.数字`
- 预发布格式：`数字.数字.数字-渠道.序号`
- 允许的渠道仅有：`alpha`、`beta`、`rc`
- 示例：`26.3.6`、`26.3.6-alpha.1`、`26.3.6-beta.2`、`26.3.6-rc.3`
### 发布规则
- 允许分支：`main`、`develop/*`、`feature/*`、`release/*`
- 不允许分支：其他分支
- 发布执行前置条件：
  - 分支名与版本格式匹配
  - 分支名与版本渠道匹配
  ### 按既有代码编译和发布程序包

## 特殊限制

- 如果当前为 detached HEAD（无法识别有效分支名），直接失败
- 如果版本格式不在支持范围内，直接失败
- 如果分支与版本渠道不匹配，直接失败
- 如果 hook 扫描到会修改 HEAD 的 Git 命令，直接失败

## 输出要求

### 校验通过

- 输出：`校验通过，分支与版本匹配`

### 校验失败

- 输出明确失败原因
- 必须包含：当前分支、期望版本格式、实际版本
- 必须包含支持的分支范围：`main`、`develop`、`feature/*`、`release/*`

## 可选错误文案模板

- 分支不支持：`unsupported branch`
- 版本格式非法：`invalid package version format`
- 分支与版本不匹配：`branch requires expected version pattern but got current version`
- detached HEAD：`detached HEAD is not supported for versioned commit/push flow`