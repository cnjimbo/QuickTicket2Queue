<script setup lang="ts">
import { computed } from 'vue'

import TicketFormPanel from '@render/components/ticket-form-panel.vue'
import { useTicketPage } from '@render/composables/use-ticket-page'

definePage({
    meta: {
        label: '[外网]',
        description: '使用 OAuth 凭据创建并提交新的 ServiceNow 工单',
        order: 500,
    },
})

const page = useTicketPage()
const {
    ticketStore,
    ticket,
    validationMessages,
    isFormValid,
    isSubmitting,
    isAnySubmitting,
    current,
    options,
    credentialReady,
    resultLink,
    submitErrorMessage,
    submitWith,
    goCredentialSetting,
    openResultLink,
} = page

const submitButtonLabel = computed(() => isSubmitting.value ? '提交工单中...' : '提交工单')
const submitButtonDisabled = computed(() =>
    !credentialReady.value || !isFormValid.value || isAnySubmitting.value,
)

async function handleSubmit() {
    await submitWith(() => ticketStore.submitTicket())
}

function handleTicketFieldUpdate(field: 'userName' | 'title' | 'content' | 'queue_val', value: string) {
    ticketStore.setTicketField(field, value)
}
</script>

<template>
<TicketFormPanel :current="current" :options="options" :ticket="ticket" :validation-messages="validationMessages"
    :submit-button-label="submitButtonLabel" :submit-button-disabled="submitButtonDisabled"
    :submit-button-loading="isSubmitting" :submit-error-message="submitErrorMessage" :result-link="resultLink"
    page-title="API 凭据提交工单"
    page-description="[外网]使用当前环境已配置的 OAuth Client 凭据直接调用 ServiceNow 接口创建工单。适用于批量或自动化提交流程，也可作为内网方式异常时的备选方案。"
    page-tag="OAUTH API" :show-settings-alert="!credentialReady" settings-alert-title="当前环境凭据未配置，请先前往凭据管理完成设置"
    @submit="handleSubmit" @go-credential-setting="goCredentialSetting" @open-result-link="openResultLink"
    @update-ticket-field="handleTicketFieldUpdate" />
</template>