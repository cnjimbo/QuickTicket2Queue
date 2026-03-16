import { showNativeDialog } from './native-dialog'

export type DraftLeaveDecision = 'allow' | 'stay'

type DraftLeaveConfirmOptions = {
    actionLabel: string
    shouldPrompt: boolean
    onSave: () => void | Promise<void>
}

export async function getDraftLeaveDecision({
    actionLabel,
    shouldPrompt,
    onSave,
}: DraftLeaveConfirmOptions): Promise<DraftLeaveDecision> {
    if (!shouldPrompt) {
        return 'allow'
    }

    const response = await showNativeDialog({
        title: '未保存修改',
        message: `当前工单内容已修改，请选择${actionLabel}方式。`,
        buttons: [`保存并${actionLabel}`, `不保存直接${actionLabel}`, '留在当前页面'],
        type: 'warning',
        defaultId: 0,
        cancelId: 2,
        noLink: true,
    })

    if (response === 0) {
        await onSave()
        return 'allow'
    }

    if (response === 1) {
        return 'allow'
    }

    return 'stay'
}