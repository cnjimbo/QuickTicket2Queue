<script setup lang="ts">
definePage({
  meta: {
    label: '帮助',
    description: '了解应用的核心功能与使用方式',
    order: 900,
  },
})

const workflowSteps = [
  { icon: '🔑', title: '配置凭据', description: '填写各环境凭据与主机地址。' },
  { icon: '📁', title: '维护队列', description: '维护常用队列映射。' },
  { icon: '📝', title: '填写工单', description: '补充标题、内容并选择队列。' },
  { icon: '🚀', title: '提交工单', description: '一键提交到 ServiceNow。' },
  { icon: '✅', title: '查看结果', description: '获取工单链接并可跳转。' },
  { icon: '🕒', title: '查看历史', description: '查看已提交记录。' },
  { icon: '♻️', title: '复制为新工单', description: '复制历史记录快速复用。' },
]

const GITHUB_FEEDBACK_URL = 'https://github.com/cnjimbo/QuickTicket2Queue/issues/new/choose'
const GITHUB_FEATURE_URL = 'https://github.com/cnjimbo/QuickTicket2Queue/issues/new?template=feature_request.yml'
const GITHUB_BUG_URL = 'https://github.com/cnjimbo/QuickTicket2Queue/issues/new?template=bug_report.yml'

const openLink = (url: string) => window.electron.openLink(url)

const feedbackItems = [
  {
    icon: '💡',
    title: '提出功能建议',
    description: '有新想法或希望改进某个功能？欢迎在 GitHub 提交 feature request，描述你期望的场景和效果。',
    buttonText: '提交建议',
    url: GITHUB_FEATURE_URL,
    buttonType: 'primary' as const,
  },
  {
    icon: '🐛',
    title: '报告问题',
    description: '遇到异常行为或 bug？请在 GitHub 提交 issue，附上复现步骤或截图，帮助我们快速定位和修复。',
    buttonText: '报告 Bug',
    url: GITHUB_BUG_URL,
    buttonType: 'danger' as const,
  },
]

const features = [
  {
    title: '快速提交工单',
    icon: '📋',
    description:
      '通过桌面表单直接向 ServiceNow 提交 incident，无需打开浏览器手动填写，填好标题、内容、队列后一键提交。',
  },
  {
    title: '多环境凭据管理',
    icon: '🔑',
    description:
      '内置 pfetst、pfestg、pfeprod 三个环境的凭据配置入口，可随时切换当前生效环境，OAuth client_id / client_secret 本地加密存储。',
  },
  {
    title: '队列配置维护',
    icon: '📁',
    description:
      '内置常用 queue 列表，支持新增自定义队列与描述映射，支持删除单条记录，并可随时一键恢复默认列表。',
  },
]
</script>

<template>
<div class="help-container">
  <div class="help-header">
    <h2>你能做什么？</h2>
    <p class="help-subtitle">Quick Ticket to Queue 的核心功能一览</p>
  </div>

  <div class="feedback-section">
    <h3>反馈与建议</h3>
    <p class="feedback-subtitle">你的反馈是项目持续改进的动力</p>
    <div class="feedback-grid">
      <el-card v-for="item in feedbackItems" :key="item.title" class="feedback-card" shadow="never">
        <div class="feedback-icon">{{ item.icon }}</div>
        <h4 class="feedback-title">{{ item.title }}</h4>
        <p class="feedback-desc">{{ item.description }}</p>
        <el-button :type="item.buttonType" @click="openLink(item.url)">
          {{ item.buttonText }}
        </el-button>
      </el-card>
    </div>
    <p class="feedback-alt">
      或直接前往
      <el-link type="primary" @click.prevent="openLink(GITHUB_FEEDBACK_URL)">GitHub Issues</el-link>
      选择反馈类型。
    </p>
  </div>

  <el-divider />

  <div class="feature-grid">
    <el-card v-for="feature in features" :key="feature.title" class="feature-card" shadow="never">
      <div class="feature-icon">{{ feature.icon }}</div>
      <h3 class="feature-title">{{ feature.title }}</h3>
      <p class="feature-desc">{{ feature.description }}</p>
    </el-card>
  </div>

  <el-divider />

  <div class="workflow-section">
    <h3>典型使用流程</h3>
    <div class="workflow-diagram">
      <el-steps :active="workflowSteps.length" finish-status="success" align-center class="workflow-steps">
        <el-step v-for="step in workflowSteps" :key="step.title" :title="step.title" :description="step.description">
          <template #icon>
            <span class="workflow-step-icon">{{ step.icon }}</span>
          </template>
        </el-step>
      </el-steps>
      <div class="workflow-loop-note">♻️ 复制后回到“填写工单”，编辑并再次提交，形成闭环。</div>
    </div>
  </div>

</div>
</template>

<style scoped>
.help-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.help-header {
  text-align: center;
  padding: 0;
}

.help-header h2 {
  font-size: 18px;
  color: #0f172a;
  margin: 0 0 2px;
  line-height: 1.25;
}

.help-subtitle {
  color: #64748b;
  font-size: 12px;
  line-height: 1.35;
  margin: 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.feature-card {
  display: flex;
  flex-direction: column;
}

.feature-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feature-icon {
  font-size: 28px;
}

.feature-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.feature-desc {
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
  margin: 0;
}

.workflow-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workflow-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.workflow-pipeline {
  display: none;
}

.workflow-diagram {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 10px 10px;
  width: 100%;
}

.workflow-steps {
  margin-bottom: 8px;
}

.workflow-step-icon {
  font-size: 16px;
  line-height: 1;
}

.workflow-loop-note {
  font-size: 12px;
  color: #0369a1;
  background: #e0f2fe;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 6px 10px;
}

.feedback-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feedback-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.feedback-subtitle {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

.feedback-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.feedback-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.feedback-icon {
  font-size: 28px;
}

.feedback-title {
  font-size: 15px;
  font-weight: 600;
  color: #0f172a;
  margin: 0;
}

.feedback-desc {
  font-size: 13px;
  color: #475569;
  line-height: 1.6;
  margin: 0;
  flex: 1;
}

.feedback-alt {
  font-size: 13px;
  color: #64748b;
  margin: 0;
}

/* Keep the flow diagram animation, disable other control animations in this page. */
.help-container :deep(.el-card),
.help-container :deep(.el-card__body),
.help-container :deep(.el-button),
.help-container :deep(.el-link),
.help-container :deep(.el-divider),
.help-container :deep(.el-step),
.help-container :deep(.el-step__head),
.help-container :deep(.el-step__line),
.help-container :deep(.el-step__main),
.help-container :deep(.el-step__description) {
  transition: none !important;
  animation: none !important;
}

.feedback-section,
.feedback-section *,
.feature-grid,
.feature-grid * {
  transition: none !important;
  animation: none !important;
}
</style>
