import { refAutoReset, useAsyncState } from '@vueuse/core'
import { useRouteQuery } from '@vueuse/router'
import { storeToRefs } from 'pinia'
import { computed, onMounted, watch } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'

import { useTicketStore } from '@render/stores/ticket'
import type { CredentialItem, TicketQueueOption } from '@/types/orm_types'
import { getDraftLeaveDecision } from '@render/utils/draft-leave-confirm'

const defaultCurrent: CredentialItem = {
    env: 'pfeprod',
}

function applyQueueFromRouteParam(ticketStore: ReturnType<typeof useTicketStore>, rawQueue: string | null) {
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

function getErrorMessage(error: unknown, fallback: string) {
    if (!(error instanceof Error)) {
        return fallback
    }

    return error.message
        .replace(/^Error invoking remote method '[^']+':\s*/i, '')
        .replace(/^Error:\s*/i, '')
        .trim() || fallback
}

export function useTicketPage() {
    const electron = window.electron
    const router = useRouter()
    const queueQuery = useRouteQuery<string | null>('queue', null)
    const fromHistoryCopyQuery = useRouteQuery<string | null>('fromHistoryCopy', null)
    const copyUserNameQuery = useRouteQuery<string | null>('copyUserName', null)
    const copyRequestForQuery = useRouteQuery<string | null>('copyRequestFor', null)
    const copyTitleQuery = useRouteQuery<string | null>('copyTitle', null)
    const copyContentQuery = useRouteQuery<string | null>('copyContent', null)
    const copyQueueValQuery = useRouteQuery<string | null>('copyQueueVal', null)

    const ticketStore = useTicketStore()
    const {
        ticket,
        validationMessages,
        isFormValid,
        result,
        hasUnsavedDraftChanges,
        isSubmitting,
        isSubmittingInternalTicket,
    } = storeToRefs(ticketStore)

    const { state: ticketBootstrap, execute: executeLoadTicketBootstrap } = useAsyncState(
        async () => {
            const [curr, userName, queueOptions] = await Promise.all([
                electron.getCurrent(),
                electron.getDomainUser(),
                electron.getTicketOptions(),
            ])
            return { curr, userName, queueOptions }
        },
        null as { curr: CredentialItem, userName: string, queueOptions: TicketQueueOption[] } | null,
        { immediate: false, resetOnExecute: false },
    )

    const current = computed(() => ticketBootstrap.value?.curr ?? defaultCurrent)
    const options = computed(() => ticketBootstrap.value?.queueOptions ?? [])
    const hostReady = computed(() => Boolean(current.value.sn_host?.trim()))
    const credentialReady = computed(() => Boolean(
        hostReady.value
        && current.value.client_id?.trim()
        && current.value.client_secret?.trim(),
    ))
    const shouldPromptDraftSave = computed(() => hasUnsavedDraftChanges.value)
    const isAnySubmitting = computed(() => isSubmitting.value || isSubmittingInternalTicket.value)
    const resultLink = computed(() =>
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
    const submitErrorMessage = refAutoReset('', 10000)

    function readQueueFromRoute() {
        const queryQueue = queueQuery.value
        if (typeof queryQueue === 'string' && queryQueue.trim()) {
            return queryQueue
        }

        return null
    }

    function showSubmitError(message: string) {
        submitErrorMessage.value = message
    }

    async function submitWith(submitAction: () => Promise<string | undefined>) {
        let errorMessage: string | undefined
        try {
            errorMessage = await submitAction()
        } catch (error) {
            errorMessage = getErrorMessage(error, '提交失败，请稍后重试')
        }

        if (errorMessage) {
            showSubmitError(errorMessage)
            return
        }

        ticketStore.refreshDraftBaseline()
    }

    const goCredentialSetting = async () => {
        await router.push('/settings/credentials')
    }

    const openResultLink = async (href: string) => {
        await electron.openLink(href)
    }

    onMounted(async () => {
        ticketStore.hydrateTicketDraft()

        const bootstrap = await executeLoadTicketBootstrap(0)
        if (!bootstrap) return
        const { userName } = bootstrap
        ticketStore.setTicketField('userName', userName)

        applyQueueFromRouteParam(ticketStore, readQueueFromRoute())

        const isHistoryCopy = fromHistoryCopyQuery.value === '1'

        if (isHistoryCopy) {
            const copyPayload = ticketStore.consumeHistoryCopyPayload()
            if (copyPayload) {
                ticketStore.setTicketFieldsWithoutDraft(copyPayload)
                return
            }

            const copyUserName = copyUserNameQuery.value?.trim() ?? ''
            const copyRequestFor = copyRequestForQuery.value?.trim() ?? ''
            const copyTitle = copyTitleQuery.value?.trim() ?? ''
            const copyContent = copyContentQuery.value ?? ''
            const copyQueueVal = copyQueueValQuery.value?.trim() ?? ''

            ticketStore.setTicketFieldsWithoutDraft({
                userName: copyUserName,
                requestFor: copyRequestFor,
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
            applyQueueFromRouteParam(ticketStore, readQueueFromRoute())
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

    return {
        ticketStore,
        ticket,
        validationMessages,
        isFormValid,
        isSubmitting,
        isSubmittingInternalTicket,
        isAnySubmitting,
        current,
        options,
        hostReady,
        credentialReady,
        resultLink,
        submitErrorMessage,
        submitWith,
        goCredentialSetting,
        openResultLink,
    }
}
