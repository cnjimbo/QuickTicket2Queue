<script setup lang="ts">
import { refAutoReset, useAsyncState } from '@vueuse/core'
import { computed, onMounted, watch } from 'vue'
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useRouteQuery } from '@vueuse/router'

import { storeToRefs } from 'pinia'
import { useTicketStore, fieldLabels } from '@render/stores/ticket'
import type { CredentialItem, TicketQueueOption } from '@/types/orm_types'
import { getEnvTagType } from '@render/utils/env-tag'
import { getDraftLeaveDecision } from '@render/utils/draft-leave-confirm'

const electron = window.electron;
const router = useRouter()
const queueQuery = useRouteQuery<string | null>('queue', null)
const fromHistoryCopyQuery = useRouteQuery<string | null>('fromHistoryCopy', null)
const copyUserNameQuery = useRouteQuery<string | null>('copyUserName', null)
const copyTitleQuery = useRouteQuery<string | null>('copyTitle', null)
const copyContentQuery = useRouteQuery<string | null>('copyContent', null)
const copyQueueValQuery = useRouteQuery<string | null>('copyQueueVal', null)

function applyQueueFromRouteParam(rawQueue: string | null) {
    if (typeof rawQueue !== 'string' || !rawQueue.trim()) {
        return
    }

    const normalizedQueue = (() => {
        try {
            return decodeURIComponent(rawQueue).trim()
        } catch {
            return rawQueue.trim()
        }
    })()

    if (!normalizedQueue) return
    ticketStore.setTicketField('queue_val', normalizedQueue)
}

function readQueueFromRoute(): string | null {
    const queryQueue = queueQuery.value
    if (typeof queryQueue === 'string' && queryQueue.trim()) {
        return queryQueue
    }

    return null
}

definePage({
    meta: {
        label: '工单',
        description: '创建并提交新的 ServiceNow 工单',
        order: 100 // top‑level first item
    }
})

const ticketStore = useTicketStore()
const { ticket, validationMessages, isFormValid, result, hasUnsavedDraftChanges, isSubmitting, isSubmittingViaWebSession } = storeToRefs(ticketStore)
const defaultCurrent: CredentialItem = {
    env: 'pfetst',
}
const { state: ticketBootstrap, execute: executeLoadTicketBootstrap } = useAsyncState(
    async () => {
        const [curr, userName, queueOptions] = await Promise.all([
            window.electron.getCurrent(),
            window.electron.getDomainUser(),
            window.electron.getTicketOptions(),
        ])
        return { curr, userName, queueOptions }
    },
    null as { curr: CredentialItem, userName: string, queueOptions: TicketQueueOption[] } | null,
    { immediate: false, resetOnExecute: false },
)
const current = computed(() => ticketBootstrap.value?.curr ?? defaultCurrent)
const options = computed(() => ticketBootstrap.value?.queueOptions ?? [])
const credentialReady = computed(() => Boolean(
    current.value.client_id?.trim() &&
    current.value.client_secret?.trim() &&
    current.value.sn_host?.trim(),
))
const shouldPromptDraftSave = computed(() => hasUnsavedDraftChanges.value)
const link = computed(() =>
    result.value
        ? {
            txt: result.value.result[0].display_value,
            href: `${current.value.sn_host}/now/sow/record/incident/${result.value.result[0].sys_id}`,
        }
        : {
            txt: 'Composing...',
            href: `${current.value.sn_host}/now/sow/home`,
        },
)
const enableSubmitBtn = computed(() => credentialReady.value && isFormValid.value && !isSubmitting.value)
const enableWebLoginSubmitBtn = computed(() => isFormValid.value && !isSubmitting.value && !isSubmittingViaWebSession.value)

onMounted(async () => {
    ticketStore.hydrateTicketDraft()

    const bootstrap = await executeLoadTicketBootstrap(0)
    if (!bootstrap) return
    const { userName } = bootstrap
    ticketStore.setTicketField('userName', userName)

    applyQueueFromRouteParam(readQueueFromRoute())

    const isHistoryCopy = fromHistoryCopyQuery.value === '1'

    if (isHistoryCopy) {
        const copyPayload = ticketStore.consumeHistoryCopyPayload()
        if (copyPayload) {
            ticketStore.setTicketFieldsWithoutDraft(copyPayload)
            return
        }

        const copyUserName = copyUserNameQuery.value?.trim() ?? ''
        const copyTitle = copyTitleQuery.value?.trim() ?? ''
        const copyContent = copyContentQuery.value ?? ''
        const copyQueueVal = copyQueueValQuery.value?.trim() ?? ''

        ticketStore.setTicketFieldsWithoutDraft({
            userName: copyUserName,
            title: copyTitle,
            content: copyContent,
            queue_val: copyQueueVal,
        })
    }

    ticketStore.refreshDraftBaseline()
})

watch(
    queueQuery,
    () => {
        applyQueueFromRouteParam(readQueueFromRoute())
    },
)

onBeforeRouteLeave(async () => {
    const decision = await getDraftLeaveDecision({
        actionLabel: '离开',
        shouldPrompt: shouldPromptDraftSave.value,
        onSave: async () => {
            ticketStore.saveTicketDraft()
            ticketStore.refreshDraftBaseline()
        },
    })
    if (decision === 'allow') {
        return true
    }

    return !shouldPromptDraftSave.value
})

const querySearch = (query: string, cb: (results: TicketQueueOption[]) => void) =>
    cb(
        options.value.filter(
            (item) =>
                item.des.toLowerCase().includes(query.toLowerCase()) ||
                item.queue.toLowerCase().includes(query.toLowerCase()),
        ),
    )

const submitErrorMessage = refAutoReset('', 2500)

function showSubmitError(message: string) {
    submitErrorMessage.value = message
}

async function submitTicket() {
    const errorMessage = await ticketStore.submitTicket()
    if (errorMessage) {
        showSubmitError(errorMessage)
        return
    }

    ticketStore.refreshDraftBaseline()
}

async function submitTicketViaWebSession() {
    const errorMessage = await ticketStore.submitTicketViaWebSession()
    if (errorMessage) {
        showSubmitError(errorMessage)
        return
    }

    ticketStore.refreshDraftBaseline()
}

const goCredentialSetting = async () => {
    await router.push('/settings/credentials')
}

</script>
<template>
<div class="ticket-page-root">
    <Teleport to="body">
        <div v-if="submitErrorMessage" class="global-toast">
            <el-alert :title="submitErrorMessage" type="error" show-icon :closable="false" />
        </div>
    </Teleport>

    <el-card class="form-card">
        <div class="host-row">
            <el-text type="primary">Env:</el-text>
            <el-tag :type="getEnvTagType(current.env)">{{ current.env }}</el-tag>
            <el-text type="primary">Host: {{ current.sn_host }}</el-text>
        </div>

        <el-alert v-if="!credentialReady" type="warning" show-icon :closable="false">
            <template #title>当前环境凭据未配置，请先前往凭据管理完成设置</template>
            <template #default>
                <el-link type="warning" @click.prevent="goCredentialSetting">前往凭据管理</el-link>
            </template>
        </el-alert>
        <el-input v-model="ticket.userName" :placeholder="`请输入${fieldLabels.userName}`" clearable show-word-limit
            maxlength="100" />
        <p class="field-error" v-if="validationMessages.userName">{{ validationMessages.userName }}</p>

        <el-input v-model="ticket.title" :placeholder="`请输入${fieldLabels.title}`" clearable show-word-limit
            maxlength="100" />
        <p class="field-error" v-if="validationMessages.title">{{ validationMessages.title }}</p>

        <el-input v-model="ticket.content" type="textarea" :rows="4" :placeholder="`请输入${fieldLabels.content}（支持换行）`"
            clearable show-word-limit maxlength="1000" />
        <p class="field-error" v-if="validationMessages.content">{{ validationMessages.content }}</p>

        <el-autocomplete v-model="ticket.queue_val" :fetch-suggestions="querySearch"
            :placeholder="`请输入以筛选${fieldLabels.queue_val}`" value-key="queue" clearable>
            <template #default="scope">
                <div v-if="scope?.item" class="auto-item">{{ scope.item.des }}（{{ scope.item.queue }}）</div>
            </template>
        </el-autocomplete>
        <p class="field-error" v-if="validationMessages.queue_val">{{ validationMessages.queue_val }}</p>

        <div class="submit-actions">
            <el-button type="primary" :disabled="!enableSubmitBtn" :loading="isSubmitting" @click="submitTicket">
                提交工单
            </el-button>
            <el-button type="success" plain :disabled="!enableWebLoginSubmitBtn" :loading="isSubmittingViaWebSession"
                @click="submitTicketViaWebSession">
                {{ isSubmittingViaWebSession ? '网页登录并提交中...' : '网页登录并提交' }}
            </el-button>
        </div>

        <div style="margin-bottom: 8px; font-weight: 600;"></div>

        <el-link :href="link.href" target="_blank" @click.prevent="electron.openLink(link.href)">{{ link.txt
            }}</el-link>
    </el-card>
</div>
</template>

<style scoped>
a {
    text-decoration: none;
    color: #333;
    padding: 10px;
}

a:hover {
    color: #007bff;
    cursor: pointer;
}

.form-card :deep(.el-card__body) {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 32px 40px;
}

.form-card :deep(.el-input),
.form-card :deep(.el-autocomplete),
.form-card :deep(.el-textarea) {
    width: 100%;
}

.form-card :deep(.el-input__wrapper),
.form-card :deep(.el-autocomplete .el-input__wrapper) {
    height: 48px;
    font-size: 16px;
    padding: 0 16px;
}

.form-card :deep(.el-textarea__inner) {
    min-height: 220px !important;
    font-size: 16px;
    line-height: 1.5;
}

.link-card :deep(.el-card__body) {
    padding: 24px;
}

.submit-row {
    display: flex;
    justify-content: flex-end;
}

.host-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.submit-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.global-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    min-width: 300px;
}

.field-error {
    color: #f56c6c;
    font-size: 12px;
    margin: -6px 0 4px;
}
</style>