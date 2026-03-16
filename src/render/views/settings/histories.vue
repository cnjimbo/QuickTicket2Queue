<template>
<div class="histories-container">
  <div class="toolbar">
    <el-text>共 {{ histories.length }} 条历史记录</el-text>
    <div class="toolbar-actions">
      <el-button :loading="loading" @click="loadHistories">刷新</el-button>
      <el-button type="danger" :disabled="histories.length === 0" @click="handleClear">清空历史</el-button>
    </div>
  </div>

  <el-table :data="histories" border stripe v-loading="loading" :row-key="getRowKey" empty-text="暂无历史记录">
    <el-table-column label="#" width="60">
      <template #default="{ $index }">
        {{ $index + 1 }}
      </template>
    </el-table-column>
    <el-table-column label="环境" width="120">
      <template #default="{ row }">
        <el-tag :type="getType(row)">{{ getTxt(row) }}</el-tag>
      </template>
    </el-table-column>
    <el-table-column label="单号" min-width="140" show-overflow-tooltip>
      <template #default="{ row }">
        <el-link type="primary" @click.prevent="openRecord(row.result.ticket_link)">{{ row.result.display_value
        }}</el-link>
      </template>
    </el-table-column>
    <el-table-column label="订单标题" min-width="220" show-overflow-tooltip>
      <template #default="{ row }">
        {{ row.ticket.title || '-' }}
      </template>
    </el-table-column>
    <el-table-column label="时间" min-width="140">
      <template #default="{ row }">
        {{ row.result.createTime }}
      </template>
    </el-table-column>
    <el-table-column label="操作" width="150" fixed="right">
      <template #default="{ row }">
        <el-button type="primary" text @click="copyTicket(row)">copy ticket</el-button>
      </template>
    </el-table-column>


  </el-table>
</div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { useTicketStore } from '@render/stores/ticket'
import { TicketHistoryItem } from '@/types/orm_types';
import { showNativeConfirmDialog } from '@render/utils/native-dialog'

definePage({
  meta: {
    label: '历史',
    description: '查看单据历史记录',
    parent: '/settings',
    parentLabel: '设置',
    parentOrder: 3,
    order: 200
  }
})

const getType = (ticket: TicketHistoryItem): "primary" | "success" | "info" | "warning" | "danger" => {

  const txt = getTxt(ticket)

  if (txt == "pfeprod")
    return 'info'
  if (txt == "pfestg")
    return 'warning'
  if (txt == "pfetst")
    return 'warning'
  return 'warning'
}
const getTxt = (ticket: TicketHistoryItem): "pfetst" | "pfestg" | "pfeprod" => {

  if (ticket.result.record_link?.includes("pfetst")) {
    return "pfetst"
  }
  if (ticket.result.record_link?.includes("pfestg")) {
    return "pfestg"
  }
  if (ticket.result.record_link?.includes("pfeprod")) {
    return "pfeprod"
  }
  return 'pfetst'
}
const histories = ref<TicketHistoryItem[]>([])
const loading = ref(false)
const router = useRouter()
const ticketStore = useTicketStore()

const getRowKey = (row: TicketHistoryItem) => {
  return `${row.result.sys_id}-${row.result.createTime ?? ''}`
}

const loadHistories = async () => {
  loading.value = true
  try {
    histories.value = await window.electron.getTicketHistory()
  } finally {
    loading.value = false
  }
}

const handleClear = () => {
  void (async () => {
    const shouldClear = await showNativeConfirmDialog({
      title: '清空确认',
      message: '确定要清空所有历史记录吗？',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })

    if (!shouldClear) return

    await window.electron.clearTicketHistory()
    await loadHistories()
    ElMessage.success('历史记录已清空')
  })()
}

const openRecord = (url: string) => {
  window.electron.openLink(url)
}

const copyTicket = async (history: TicketHistoryItem) => {
  ticketStore.setHistoryCopyPayload({
    userName: history.ticket.userName ?? '',
    title: history.ticket.title ?? '',
    content: history.ticket.content ?? '',
    queue_val: history.ticket.queue_val ?? '',
  })

  await router.push({
    path: '/ticket/ticket',
    query: {
      fromHistoryCopy: '1',
      copyUserName: history.ticket.userName ?? '',
      copyTitle: history.ticket.title ?? '',
      copyContent: history.ticket.content ?? '',
      copyQueueVal: history.ticket.queue_val ?? '',
    },
  })
}

onMounted(loadHistories)
</script>

<style scoped>
.histories-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}
</style>