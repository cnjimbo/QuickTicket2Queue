<script setup lang="ts">
import { computed } from 'vue'

import { fieldLabels } from '@render/stores/ticket'
import type { CredentialItem, TicketQueueOption, TicketType } from '@/types/orm_types'

type TicketFieldKey = keyof Pick<TicketType, 'userName' | 'title' | 'content' | 'queue_val'>
type ValidationMessages = Record<'userName' | 'title' | 'content' | 'queue_val', string>

const props = defineProps<{
    current: CredentialItem
    options: TicketQueueOption[]
    ticket: TicketType
    validationMessages: ValidationMessages
    submitButtonLabel: string
    submitButtonDisabled: boolean
    submitButtonLoading: boolean
    submitErrorMessage: string
    resultLink: {
        txt: string
        href: string
    }
    pageTitle: string
    pageDescription: string
    pageTag: string
    showSettingsAlert: boolean
    settingsAlertTitle: string
}>()

const emit = defineEmits<{
    submit: []
    goCredentialSetting: []
    openResultLink: [href: string]
    updateTicketField: [field: TicketFieldKey, value: string]
}>()

const queueOptions = computed(() => props.options ?? [])

function querySearch(query: string, cb: (results: TicketQueueOption[]) => void) {
    const normalizedQuery = query.toLowerCase()
    cb(
        queueOptions.value.filter(
            (item) =>
                item.des.toLowerCase().includes(normalizedQuery)
                || item.queue.toLowerCase().includes(normalizedQuery),
        ),
    )
}

function updateTicketField(field: TicketFieldKey, value: string) {
    emit('updateTicketField', field, value)
}

function normalizeInputValue(value: string | number | undefined | null) {
    return typeof value === 'string' ? value : `${value ?? ''}`
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
            <el-tag>{{ current.env }}</el-tag>
            <el-text type="primary">Host: {{ current.sn_host }}</el-text>
        </div>

        <el-alert v-if="showSettingsAlert" class="settings-alert" type="warning" show-icon :closable="false">
            <template #title>
                <span class="settings-alert__title">{{ settingsAlertTitle }}</span>
            </template>
            <template #default>
                <div class="settings-alert__content">
                    <el-link class="settings-alert__action" type="warning" @click.prevent="emit('goCredentialSetting')">
                        前往凭据管理
                    </el-link>
                </div>
            </template>
        </el-alert>

        <el-input :model-value="ticket.userName" :placeholder="`请输入${fieldLabels.userName}`" clearable show-word-limit
            maxlength="100" @update:model-value="updateTicketField('userName', normalizeInputValue($event))" />
        <p v-if="validationMessages.userName" class="field-error">{{ validationMessages.userName }}</p>

        <el-input :model-value="ticket.title" :placeholder="`请输入${fieldLabels.title}`" clearable show-word-limit
            maxlength="100" @update:model-value="updateTicketField('title', normalizeInputValue($event))" />
        <p v-if="validationMessages.title" class="field-error">{{ validationMessages.title }}</p>

        <el-input :model-value="ticket.content" type="textarea" :rows="4"
            :placeholder="`请输入${fieldLabels.content}（支持换行）`" clearable show-word-limit maxlength="1000"
            @update:model-value="updateTicketField('content', normalizeInputValue($event))" />
        <p v-if="validationMessages.content" class="field-error">{{ validationMessages.content }}</p>

        <el-autocomplete :model-value="ticket.queue_val" :fetch-suggestions="querySearch"
            :placeholder="`请输入以筛选${fieldLabels.queue_val}`" value-key="queue" clearable
            @update:model-value="updateTicketField('queue_val', normalizeInputValue($event))">
            <template #default="scope">
                <div v-if="scope?.item" class="auto-item">{{ scope.item.des }}（{{ scope.item.queue }}）</div>
            </template>
        </el-autocomplete>
        <p v-if="validationMessages.queue_val" class="field-error">{{ validationMessages.queue_val }}</p>

        <div class="submit-actions">
            <el-button type="primary" :disabled="submitButtonDisabled" :loading="submitButtonLoading"
                @click="emit('submit')">
                {{ submitButtonLabel }}
            </el-button>
        </div>

        <el-link :href="resultLink.href" target="_blank" @click.prevent="emit('openResultLink', resultLink.href)">
            {{ resultLink.txt }}
        </el-link>
    </el-card>
</div>
</template>

<style scoped>
.ticket-page-root {
    display: flex;
    flex-direction: column;
    gap: 18px;
}

.page-intro {
    padding: 4px 4px 0;
}

.page-intro__copy {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.page-intro__copy h2 {
    margin: 0;
    font-size: 26px;
    color: #f8fafc;
}

.page-intro__copy p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: rgba(226, 232, 240, 0.72);
}

.page-intro__tag {
    width: fit-content;
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

.host-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
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

.settings-alert {
    border-radius: 14px;
    border: 1px solid rgba(230, 162, 60, 0.26);
}

.settings-alert :deep(.el-alert__title) {
    display: block;
    margin-bottom: 2px;
}

.settings-alert :deep(.el-alert__content) {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.settings-alert__title {
    font-size: 14px;
    font-weight: 700;
    color: #8a5a12;
    line-height: 1.5;
}

.settings-alert__content {
    display: flex;
    align-items: flex-start;
}

.settings-alert__action {
    font-weight: 700;
}

.settings-alert__action :deep(.el-link__inner) {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(230, 162, 60, 0.12);
    text-decoration: none;
}

.settings-alert__action:hover :deep(.el-link__inner) {
    background: rgba(230, 162, 60, 0.18);
}

@media (max-width: 768px) {
    .form-card :deep(.el-card__body) {
        padding: 24px 18px;
    }

    .page-intro__copy h2 {
        font-size: 22px;
    }
}
</style>