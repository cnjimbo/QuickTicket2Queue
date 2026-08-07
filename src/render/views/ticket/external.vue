<script setup lang="ts">
  import { refAutoReset } from '@vueuse/core'
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
    goCredentialSetting,
    openResultLink,
  } = page

  const externalSubmitErrorMessage = refAutoReset('', 10000)
  const displaySubmitErrorMessage = computed(() => externalSubmitErrorMessage.value || submitErrorMessage.value)
  const submitButtonLabel = computed(() => (isSubmitting.value ? '提交工单中...' : '提交工单'))
  const submitButtonDisabled = computed(() => !credentialReady.value || !isFormValid.value || isAnySubmitting.value)

  function getExternalSubmitErrorMessage(error: unknown) {
    const rawMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
    return (
      rawMessage
        .replace(/^Error invoking remote method '[^']+':\s*/i, '')
        .replace(/^Error:\s*/i, '')
        .trim() || '提交失败，请稍后重试'
    )
  }

  async function handleSubmit() {
    externalSubmitErrorMessage.value = ''

    let errorMessage: string | undefined
    try {
      errorMessage = await ticketStore.submitTicket()
    } catch (error) {
      errorMessage = getExternalSubmitErrorMessage(error)
    }

    if (errorMessage) {
      externalSubmitErrorMessage.value = errorMessage
      return
    }

    ticketStore.refreshDraftBaseline()
  }

  function handleTicketFieldUpdate(
    field: 'userName' | 'requestFor' | 'title' | 'content' | 'queue_val',
    value: string,
  ) {
    ticketStore.setTicketField(field, value)
  }
</script>

<template>
  <Teleport to="body">
    <div v-if="displaySubmitErrorMessage" class="external-error-toast">
      <el-alert type="error" show-icon :closable="false">
        <template #title>
          <span>{{ displaySubmitErrorMessage }}</span>
        </template>
      </el-alert>
    </div>
  </Teleport>

  <TicketFormPanel
    :current="current"
    :options="options"
    :ticket="ticket"
    :validation-messages="validationMessages"
    :submit-button-label="submitButtonLabel"
    :submit-button-disabled="submitButtonDisabled"
    :submit-button-loading="isSubmitting"
    submit-error-message=""
    :result-link="resultLink"
    page-title="API 凭据提交工单"
    page-description="[外网]使用当前环境已配置的 OAuth Client 凭据直接调用 ServiceNow 接口创建工单。适用于批量或自动化提交流程，也可作为内网方式异常时的备选方案。"
    page-tag="OAUTH API"
    :show-settings-alert="!credentialReady"
    settings-alert-title="当前环境凭据未配置，请先前往凭据管理完成设置"
    @submit="handleSubmit"
    @go-credential-setting="goCredentialSetting"
    @open-result-link="openResultLink"
    @update-ticket-field="handleTicketFieldUpdate"
  />
</template>

<style scoped>
  .external-error-toast {
    position: fixed;
    top: 20px;
    left: 50%;
    z-index: 9999;
    width: min(760px, calc(100vw - 32px));
    transform: translateX(-50%);
  }

  .external-error-toast :deep(.el-alert__title) {
    line-height: 1.5;
    white-space: normal;
    word-break: break-word;
  }
</style>
