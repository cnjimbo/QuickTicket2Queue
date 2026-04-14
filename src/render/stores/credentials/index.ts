import { defineStore } from 'pinia'
import { useAsyncState } from '@vueuse/core'
import { toRaw } from 'vue'
import type { CredentialItem } from '@/types/orm_types'


export const useCredentialStore = defineStore('credential', {
    state(): { tableData: CredentialItem[] } {

        return {
            tableData: [
            ]
        }
    },


    getters: {
        currentKey(): CredentialItem['env'] | undefined {
            return (
                this.tableData.find((r) => r.isCurrent)?.env
                ?? this.tableData.find((r) => r.env === 'pfeprod')?.env
                ?? this.tableData[0]?.env
                ?? undefined
            )
        }
    },

    actions: {
        setCurrent(env: CredentialItem['env']) {
            this.tableData.forEach((r) => {
                r.isCurrent = r.env === env
            })
        },

        handleEdit(row: CredentialItem) {
            row.editing = true
        },

        async handleSaveAll() {
            this.tableData.forEach((r) => {
                r.editing = false
            })
            // Use toRaw to unwrap reactive proxy for IPC serialization
            const data = toRaw(this.tableData)
            const { execute } = useAsyncState(
                (payload: CredentialItem[]) => window.electron.saveCredential(payload),
                undefined,
                { immediate: false, resetOnExecute: false },
            )
            return await execute(0, data)
        },
        async loadCredential() {
            const { execute } = useAsyncState(
                () => window.electron.readCredential(),
                [] as CredentialItem[],
                { immediate: false, resetOnExecute: false },
            )
            const state = await execute(0) ?? []
            this.setTableData(state)
        },
        async clearCredential() {
            const { execute } = useAsyncState(
                () => window.electron.clearCredential(),
                undefined,
                { immediate: false, resetOnExecute: false },
            )
            await execute(0)
        },
        setTableData(state: CredentialItem[]) {
            this.tableData = state
        }
    }
})
