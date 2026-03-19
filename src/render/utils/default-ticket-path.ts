import { memo } from 'radash'

export const resolveDefaultTicketPath = memo(async () => {
    try {
        const isDomainEnvironment = await window.electron.isDomainEnvironment()
        return isDomainEnvironment ? '/ticket/internal' : '/ticket/external'
    } catch {
        return '/ticket/external'
    }
})
