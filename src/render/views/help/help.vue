<script setup lang="ts">
definePage({
  meta: {
    label: '使用帮助',
    description: '了解应用的核心功能与使用方式',
    order: 900,
  },
})

const workflowSteps = [
  {
    icon: '🔑',
    title: '配置凭据',
    description: '填写各环境的 client_id / secret / host，设置当前生效环境。',
  },
  {
    icon: '📁',
    title: '维护队列',
    description: '添加或管理常用队列与描述映射，方便快速筛选。',
  },
  {
    icon: '📝',
    title: '填写工单',
    description: '系统自动填入域账号，补充标题、描述并选择目标队列。',
  },
  {
    icon: '🚀',
    title: '提交工单',
    description: '一键提交，自动获取 OAuth token 并发送至 ServiceNow。',
  },
  {
    icon: '✅',
    title: '查看结果',
    description: '获得工单链接，一键跳转至 ServiceNow 记录页。',
  },
  {
    icon: '🕒',
    title: '查看历史',
    description: '在历史记录页查看所有已提交工单的单号、环境和时间。',
  },
  {
    icon: '♻️',
    title: '复制为新工单',
    description: '从历史记录一键复制内容，快速发起相同或相似的新工单。',
  },
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
      <el-card v-for="item in feedbackItems" :key="item.title" class="feedback-card" shadow="hover">
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
    <el-card v-for="feature in features" :key="feature.title" class="feature-card" shadow="hover">
      <div class="feature-icon">{{ feature.icon }}</div>
      <h3 class="feature-title">{{ feature.title }}</h3>
      <p class="feature-desc">{{ feature.description }}</p>
    </el-card>
  </div>

  <el-divider />

  <div class="workflow-section">
    <h3>典型使用流程</h3>
    <div class="workflow-pipeline">
      <template v-for="(step, index) in workflowSteps" :key="step.title">
        <div class="pipeline-step">
          <div class="pipeline-icon">{{ step.icon }}</div>
          <div class="pipeline-body">
            <div class="pipeline-title">{{ step.title }}</div>
            <div class="pipeline-desc">{{ step.description }}</div>
          </div>
        </div>
        <div v-if="index < workflowSteps.length - 1" class="pipeline-arrow">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="#93c5fd" stroke-width="1.5" stroke-linecap="round"
              stroke-linejoin="round" />
          </svg>
        </div>
      </template>
    </div>
  </div>

</div>
</template>

<style scoped>
.help-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.help-header {
  text-align: center;
  padding: 4px 0 2px;
}

.help-header h2 {
  font-size: 22px;
  color: #0f172a;
  margin-bottom: 3px;
}

.help-subtitle {
  color: #64748b;
  font-size: 14px;
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
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 4px;
}

.pipeline-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 8px 10px;
  min-width: 140px;
  max-width: 185px;
  flex: 1;
}

.pipeline-icon {
  font-size: 18px;
  flex-shrink: 0;
  line-height: 1;
  margin-top: 1px;
}

.pipeline-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.pipeline-title {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
}

.pipeline-desc {
  font-size: 11px;
  color: #64748b;
  line-height: 1.5;
}

.pipeline-arrow {
  display: flex;
  align-items: center;
  padding-top: 14px;
  flex-shrink: 0;
  color: #93c5fd;
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
</style>
