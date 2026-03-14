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
    title: '配置凭据',
    description: '在"凭据管理"中填写各环境的 client_id、client_secret 和 sn_host，并设置当前生效环境。',
  },
  {
    title: '维护队列',
    description: '在"队列配置"中添加或管理常用队列与描述映射，方便在工单页快速筛选。',
  },
  {
    title: '填写工单',
    description: '进入"工单中心"，系统自动填入域账号；补充工单标题、详细描述，并从下拉列表选择目标队列。',
  },
  {
    title: '提交工单',
    description: '点击"提交工单"，应用自动获取 OAuth token 并将工单发送至 ServiceNow。',
  },
  {
    title: '查看结果',
    description: '提交成功后页面显示工单链接，可一键跳转；历史记录页也会同步保存本次记录。',
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
  {
    title: '工单历史记录',
    icon: '🕒',
    description:
      '每次提交成功后自动保存工单记录，可在历史页查看单号、环境、提交时间，并支持一键跳转到对应 ServiceNow 记录页。',
  },
  {
    title: '自动读取域账号',
    icon: '👤',
    description:
      '应用启动时自动读取当前 Windows 域账号并填入工单的 requested by 字段，减少重复输入。',
  },
  {
    title: 'OAuth 令牌自动管理',
    icon: '🔐',
    description:
      '提交工单前自动使用 client credentials 流程获取 access token，无需手动登录 ServiceNow，整个鉴权过程在后台完成。',
  },
]
</script>

<template>
  <div class="help-container">
    <div class="help-header">
      <h2>你能做什么？</h2>
      <p class="help-subtitle">Quick Ticket to Queue 的核心功能一览</p>
    </div>

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
      <el-steps direction="vertical" :active="5" finish-status="success">
        <el-step v-for="step in workflowSteps" :key="step.title" :title="step.title">
          <template #description>{{ step.description }}</template>
        </el-step>
      </el-steps>
    </div>
  </div>
</template>

<style scoped>
.help-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.help-header {
  text-align: center;
  padding: 8px 0 4px;
}

.help-header h2 {
  font-size: 22px;
  color: #0f172a;
  margin-bottom: 6px;
}

.help-subtitle {
  color: #64748b;
  font-size: 14px;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.feature-card {
  display: flex;
  flex-direction: column;
}

.feature-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  gap: 16px;
}

.workflow-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #0f172a;
}

.workflow-section :deep(.el-step__description) {
  font-size: 13px;
  color: #475569;
}
</style>
