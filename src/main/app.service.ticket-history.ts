import { Injectable } from "@nestjs/common";
import Store from "electron-store";
import { TicketHistoryItem, TicketResult } from "@/types/orm_types";

function normalizeHistoryItem(item: unknown): TicketHistoryItem | null {
    if (!item || typeof item !== "object") return null;

    const candidate = item as Record<string, unknown>;
    if (candidate.result && candidate.ticket) {
        return candidate as unknown as TicketHistoryItem;
    }

    // Backward compatible: previous versions stored plain TicketResult entries.
    const legacy = item as TicketResult;
    if (!legacy.sys_id || !legacy.display_value) return null;

    return {
        result: legacy,
        ticket: {
            title: "",
            content: "",
            queue_val: "",
            userName: "",
        },
    };
}

@Injectable()
export class AppServiceTicketHistory {
    private store!: Store<{ "ticketHistory": TicketHistoryItem[] }>;

    constructor() {
        this.initializeStore();
    }

    private initializeStore(): void {
        try {
            this.store = new Store({
                name: "ticketHistory",
            });
        } catch (error) {
            console.error("Failed to initialize ticket history store:", error);
            // Create a dummy store that won't fail on access
            this.store = new Store({ name: "ticketHistory_backup" });
        }
    }

    public async save(item: TicketHistoryItem): Promise<void> {
        try {

            this.store.appendToArray("ticketHistory", item);
        } catch (error) {
            console.error("Failed to save ticket history to store:", error);
        }
    }

    public async get(): Promise<TicketHistoryItem[]> {
        try {
            const history = this.store.get("ticketHistory", []);
            const normalized = history
                .map((item) => normalizeHistoryItem(item))
                .filter((item): item is TicketHistoryItem => item !== null);

            if (normalized.length !== history.length) {
                this.store.set("ticketHistory", normalized);
            }

            return normalized;
        } catch (error) {
            console.error("Failed to read ticket history from store:", error);
            return [];
        }
    }

    public async clear(): Promise<void> {
        try {
            this.store.clear();
        } catch (error) {
            console.error("Failed to clear ticket history from store:", error);
        }
    }
}
