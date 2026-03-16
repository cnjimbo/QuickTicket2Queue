<template>
<div class="histories-container">
  <Teleport to="body">
    <div v-if="successVisible" class="global-toast">
      <el-alert title="历史记录已清空" type="success" show-icon :closable="false" />
    </div>
  </Teleport>

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
import { refAutoReset, useAsyncState } from '@vueuse/core'
import { useRouter } from 'vue-router'
import { useTicketStore } from '@render/stores/ticket'
import { TicketHistoryItem } from '@/types/orm_types';
import { getEnvTagType } from '@render/utils/env-tag'
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

const getType = (ticket: TicketHistoryItem) => getEnvTagType(getTxt(ticket))
const router = useRouter()
const ticketStore = useTicketStore()
const { state: histories, isLoading: loading, execute: executeLoadHistories } = useAsyncState(
  () => window.electron.getTicketHistory(),
  [] as TicketHistoryItem[],
  { immediate: true, resetOnExecute: false },
)
const { execute: executeClearHistories } = useAsyncState(
  () => window.electron.clearTicketHistory(),
  undefined,
  { immediate: false, resetOnExecute: false },
)
const successVisible = refAutoReset(false, 2500)

const getRowKey = (row: TicketHistoryItem) => {
  return `${row.result.sys_id}-${row.result.createTime ?? ''}`
}

const loadHistories = async () => {
  await executeLoadHistories(0)
}

const showSuccess = () => {
  successVisible.value = true
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

    await executeClearHistories(0)
    await loadHistories()
    showSuccess()
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

.global-toast {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  min-width: 300px;
}
</style>