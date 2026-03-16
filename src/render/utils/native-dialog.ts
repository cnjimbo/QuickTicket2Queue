import { useAsyncState } from '@vueuse/core'

type NativeDialogOptions = {
    title: string
    message: string
    buttons: string[]
    type?: 'none' | 'info' | 'error' | 'question' | 'warning'
    defaultId?: number
    cancelId?: number
    noLink?: boolean
}

async function normalizeWindowFocusAfterDialog() {
    window.focus()
    await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve())
    })
}

export async function showNativeDialog(options: NativeDialogOptions): Promise<number> {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) {
        activeElement.blur()
    }

    const { execute } = useAsyncState(
        () => window.electron.showNativeDialog(options),
        -1,
        { immediate: false, resetOnExecute: false },
    )
    const response = await execute(0)
    await normalizeWindowFocusAfterDialog()
    return response
}

export async function showNativeConfirmDialog(options: {
    title: string
    message: string
    confirmButtonText: string
    cancelButtonText: string
}): Promise<boolean> {
    const response = await showNativeDialog({
        title: options.title,
        message: options.message,
        buttons: [options.confirmButtonText, options.cancelButtonText],
        type: 'warning',
        defaultId: 0,
        cancelId: 1,
        noLink: true,
    })

    return response === 0
}
