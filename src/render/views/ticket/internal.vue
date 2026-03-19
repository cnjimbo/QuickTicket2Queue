<script setup lang="ts">
import { computed } from 'vue'

import TicketFormPanel from '@render/components/ticket-form-panel.vue'
import { useTicketPage } from '@render/composables/use-ticket-page'

definePage({
    meta: {
        label: '工单(内网)',
        description: '通过网页登录态提交内部工单',
        order: 110,
    },
})

const page = useTicketPage()
const {
    ticketStore,
    ticket,
    validationMessages,
    isFormValid,
    isSubmittingInternalTicket,
    isAnySubmitting,
    current,
    options,
    hostReady,
    resultLink,
    submitErrorMessage,
    submitWith,
    goCredentialSetting,
    openResultLink,
} = page

const submitButtonLabel = computed(() =>
    isSubmittingInternalTicket.value ? '网页登录并提交中...' : '网页登录并提交',
)
const submitButtonDisabled = computed(() =>
    !hostReady.value || !isFormValid.value || isAnySubmitting.value,
)

async function handleSubmit() {
    await submitWith(() => ticketStore.submitInternalTicket())
}

function handleTicketFieldUpdate(field: 'userName' | 'title' | 'content' | 'queue_val', value: string) {
    ticketStore.setTicketField(field, value)
}
</script>

<template>
<TicketFormPanel :current="current" :options="options" :ticket="ticket" :validation-messages="validationMessages"
    :submit-button-label="submitButtonLabel" :submit-button-disabled="submitButtonDisabled"
    :submit-button-loading="isSubmittingInternalTicket" :submit-error-message="submitErrorMessage"
    :result-link="resultLink" page-title="网页登录并提交"
    page-description="打开当前环境的 ServiceNow 登录页，获取登录态后直接提交内部工单。适用于未配置 OAuth 凭据，但已能通过网页登录的场景。" page-tag="WEB SESSION"
    :show-settings-alert="!hostReady" settings-alert-title="当前环境未配置 Host，请先前往凭据管理完成设置" @submit="handleSubmit"
    @go-credential-setting="goCredentialSetting" @open-result-link="openResultLink"
    @update-ticket-field="handleTicketFieldUpdate" />
</template>