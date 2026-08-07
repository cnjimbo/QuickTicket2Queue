# 分支版本校验

## 目标

- `scripts/branch-version/validate-branch-version-policy.ts` 为 GitHub Actions 提供分支和版本校验。
- `vite.config.mts` 和 `electron-builder.config.ts` 使用同目录的版本格式校验。

## 输入

- `branchName`：当前 Git 分支名
- `appVersion`：`package.json` 的 `version` 字段

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

## GitHub Actions 发布说明

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