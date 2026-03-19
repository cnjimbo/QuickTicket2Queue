校验输入

    branchName：当前 Git 分支名
    appVersion：package.json 的 version 字段
分支与版本规则

main 分支
    只允许稳定版：x.y.z
    不允许 alpha、beta、rc  其他版本
develop 分支
    允许 beta和 alpha 预发布版：x.y.z-beta.N后者x.y.z-alpha.N
feature/ 开头分支
    允许 beta和 alpha 预发布版：x.y.z-beta.N后者x.y.z-alpha.N
release/ 开头分支
    只允许 rc 预发布版：x.y.z-rc.N
其他分支，不限制，但是ci中不执行发布


版本格式约束

稳定版格式：数字.数字.数字
预发布格式：数字.数字.数字-渠道.序号
渠道仅允许：alpha、beta、rc
例如：26.3.6、26.3.6-alpha.1、26.3.6-beta.2、26.3.6-rc.3
特殊限制

如果当前为 detached HEAD（无法识别有效分支名），直接失败
如果版本格式不在支持范围内，直接失败
如果分支与版本渠道不匹配，直接失败
输出要求

通过时输出：校验通过，分支与版本匹配
失败时输出：明确失败原因，包括
当前分支
期望版本格式
实际版本
支持的分支范围：main、develop、feature/、release/
可选错误文案模板

分支不支持：unsupported branch
版本格式非法：invalid package version format
分支与版本不匹配：branch requires expected version pattern but got current version
detached head：detached HEAD is not supported for versioned commit/push flow