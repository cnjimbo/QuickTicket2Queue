<template>
<div class="options-container">
    <Teleport to="body">
        <div v-if="noticeText" class="global-toast">
            <el-alert :title="noticeText" :type="noticeType" show-icon :closable="false" />
        </div>
    </Teleport>

    <div class="toolbar">
        <el-text>共 {{ options.length }} 条队列配置</el-text>
        <div class="toolbar-actions">
            <el-button :loading="loading" @click="loadOptions">刷新</el-button>

            <el-button :disabled="loading || adding || syncing" @click="handleSuggestDefaultQueue">
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"
                    style="margin-right: 6px; vertical-align: -2px;">
                    <path fill="currentColor"
                        d="M12 .5A12 12 0 0 0 8.2 23.9c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.7-2.7-.3-5.6-1.4-5.6-6.1 0-1.3.5-2.4 1.2-3.3-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.6 3.3-1.2 3.3-1.2.7 1.6.3 2.8.1 3.1.8.9 1.2 2 1.2 3.3 0 4.7-2.9 5.8-5.7 6.1.5.4.9 1.2.9 2.4v3.6c0 .4.2.7.8.6A12 12 0 0 0 12 .5Z" />
                </svg>
                Edit Queues
            </el-button>
            <el-button type="primary" :loading="syncing" :disabled="loading || adding"
                @click="handleSyncFromGithub">Pull GitHub Queues</el-button>
            <el-button type="danger" :loading="resetting" :disabled="loading || adding || syncing || resetting"
                @click="handleReset">恢复默认</el-button>
        </div>
    </div>

    <el-card>
        <div class="add-form">
            <el-input v-model="newOption.des" placeholder="描述 (des)" />
            <el-input v-model="newOption.queue" placeholder="队列 (queue)" />
            <el-button type="primary" :loading="adding" @click="handleAdd">新增</el-button>
        </div>
    </el-card>

    <el-table :data="options" border row-key="queue" v-loading="loading" empty-text="暂无队列配置">
        <el-table-column prop="des" label="描述" min-width="220" show-overflow-tooltip />
        <el-table-column label="队列" min-width="220" show-overflow-tooltip>
            <template #default="{ row }">
                <el-link type="primary" @click.prevent="jumpToTicket(row.queue)">{{ row.queue }}</el-link>
            </template>
        </el-table-column>
        <el-table-column label="操作" width="90">
            <template #default="{ row }">
                <el-button type="danger" @click="handleDelete(row.queue)">删除</el-button>
            </template>
        </el-table-column>
    </el-table>
</div>
</template>

<script setup lang="ts">
import { refAutoReset, useAsyncState } from '@vueuse/core'
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { TicketQueueOption } from '@/types/orm_types'
import { showNativeDialog } from '@render/utils/native-dialog'

definePage({
    meta: {
        label: '队列',
        description: '维护 ticket queue 与描述映射',
        parent: '/settings',
        parentLabel: '设置',
        parentOrder: 3,
        order: 300,
    }
})

const router = useRouter()
const { state: options, isLoading: loading, execute: executeLoadOptions } = useAsyncState(
    () => window.electron.getTicketOptions(),
    [] as TicketQueueOption[],
    { immediate: true, resetOnExecute: false, throwError: true },
)
const { isLoading: adding, execute: executeAddOption } = useAsyncState(
    ({ des, queue }: { des: string, queue: string }) => window.electron.addTicketOption({ des, queue }),
    undefined,
    { immediate: false, resetOnExecute: false, throwError: true },
)
const { isLoading: syncing, execute: executeSyncOptions } = useAsyncState(
    (mode: SyncMode) => window.electron.syncTicketOptionsFromGithub(mode),
    undefined,
    { immediate: false, resetOnExecute: false, throwError: true },
)
const { isLoading: resetting, execute: executeResetOptions } = useAsyncState(
    () => window.electron.resetTicketOptions(),
    undefined,
    { immediate: false, resetOnExecute: false, throwError: true },
)
const { execute: executeDeleteOption } = useAsyncState(
    (queue: string) => window.electron.deleteTicketOption(queue),
    undefined,
    { immediate: false, resetOnExecute: false, throwError: true },
)
const newOption = reactive<TicketQueueOption>({
    des: '',
    queue: '',
})

const noticeText = refAutoReset('', 2500)
const noticeType = ref<'success' | 'error'>('success')

function showNotice(type: 'success' | 'error', text: string) {
    noticeType.value = type
    noticeText.value = text
}

const loadOptions = async () => {
    try {
        await executeLoadOptions(0)
    } catch (error) {
        const message = error instanceof Error ? error.message : '加载队列配置失败，请稍后重试'
        showNotice('error', message)
    }
}

const handleAdd = async () => {
    const des = newOption.des.trim()
    const queue = newOption.queue.trim()
    if (!des || !queue) {
        showNotice('error', '请先填写 des 和 queue')
        return
    }

    try {
        await executeAddOption(0, { des, queue })
        newOption.des = ''
        newOption.queue = ''
        await loadOptions()
        showNotice('success', '新增成功')
    } catch (error) {
        const message = error instanceof Error ? error.message : '新增失败，请稍后重试'
        showNotice('error', message)
    }
}

const handleDelete = async (queue: string) => {
    try {
        await executeDeleteOption(0, queue)
        await loadOptions()
        showNotice('success', '删除成功')
    } catch (error) {
        const message = error instanceof Error ? error.message : '删除失败，请稍后重试'
        showNotice('error', message)
    }
}

const handleReset = async () => {
    const shouldReset = await showNativeDialog({
        title: '危险操作确认',
        message: '恢复默认会覆盖当前本地队列配置，未同步到 GitHub 的改动将丢失。是否继续？',
        buttons: ['恢复默认', '取消'],
        type: 'warning',
        defaultId: 1,
        cancelId: 1,
        noLink: true,
    })

    if (shouldReset !== 0) {
        return
    }

    try {
        await executeResetOptions(0)
        await loadOptions()
        showNotice('success', '已恢复默认列表')
    } catch (error) {
        const message = error instanceof Error ? error.message : '恢复默认失败，请稍后重试'
        showNotice('error', message)
    }
}

type SyncMode = 'merge' | 'overwrite'
const GITHUB_TICKET_OPTIONS_EDIT_URL = 'https://github.dev/cnjimbo/QuickTicket2Queue/blob/main/config/ticket-options.default.json'

const syncFromGithub = async (mode: SyncMode) => {
    try {
        await executeSyncOptions(0, mode)
        await loadOptions()
        showNotice('success', mode === 'overwrite' ? '已使用 GitHub 配置覆盖当前列表' : '已将 GitHub 配置合并到当前列表')
    } catch (error) {
        const message = error instanceof Error ? error.message : '同步失败，请稍后重试'
        showNotice('error', message)
    }
}

const handleSyncFromGithub = () => {
    void (async () => {
        const response = await showNativeDialog({
            title: '同步 GitHub 默认配置',
            message: '请选择同步策略：覆盖当前会完全替换本地列表；合并到当前只会补充缺失队列。',
            buttons: ['合并到当前', '覆盖当前', '取消'],
            type: 'question',
            defaultId: 0,
            cancelId: 2,
            noLink: true,
        })

        if (response === 0) {
            await syncFromGithub('merge')
            return
        }

        if (response === 1) {
            await syncFromGithub('overwrite')
        }
    })()
}

const handleSuggestDefaultQueue = () => {
    window.electron.openLink(GITHUB_TICKET_OPTIONS_EDIT_URL)
}

const jumpToTicket = async (queue: string) => {
    await router.push({
        path: '/ticket/ticket',
        query: {
            queue,
        },
    })
}

</script>

<style scoped>
.options-container {
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

.add-form {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
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
