import { Injectable } from "@nestjs/common";
import Store from "electron-store";
import { promises as fs } from "node:fs";
import path from "node:path";
import { TicketQueueOption } from "@/types/orm_types";

const TICKET_OPTIONS_CONFIG_PATH = path.resolve(process.cwd(), "config", "ticket-options.default.json");

function cloneOptions(options: TicketQueueOption[]): TicketQueueOption[] {
    return options.map((item) => ({ ...item }));
}

function normalizeTicketOptions(input: unknown): TicketQueueOption[] {
    if (!Array.isArray(input)) {
        throw new Error("ticket-options.default.json 的 items 必须是数组");
    }

    const options = input
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const des = String((item as Record<string, unknown>).des ?? "").trim();
            const queue = String((item as Record<string, unknown>).queue ?? "").trim();
            if (!des || !queue) return null;
            return { des, queue } satisfies TicketQueueOption;
        })
        .filter((item): item is TicketQueueOption => item !== null);

    if (!options.length) {
        throw new Error("ticket-options.default.json 未包含有效 des/queue 数据");
    }

    return options;
}

async function loadDefaultOptionsFromConfig(): Promise<TicketQueueOption[]> {
    const raw = await fs.readFile(TICKET_OPTIONS_CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    // Backward compatible: accept both legacy array and new object+items format.
    if (Array.isArray(parsed)) {
        return normalizeTicketOptions(parsed);
    }

    if (!parsed || typeof parsed !== "object") {
        throw new Error("ticket-options.default.json 必须是对象，且包含 items 字段");
    }

    const items = (parsed as Record<string, unknown>).items;
    return normalizeTicketOptions(items);
}

@Injectable()
export class AppServiceTicketOptions {
    private store!: Store<{ "ticketOptions": TicketQueueOption[] }>;

    constructor() {
        this.initializeStore();
    }

    private initializeStore(): void {
        try {
            this.store = new Store({
                name: "ticketOptions",
            });
        } catch (error) {
            console.error("Failed to initialize ticket options store:", error);
            // Create a dummy store that won't fail on access
            this.store = new Store({ name: "ticketOptions_backup" });
        }
    }

    public async get(): Promise<TicketQueueOption[]> {
        try {
            const defaults = await loadDefaultOptionsFromConfig();
            const options =
                this.store.get("ticketOptions", cloneOptions(defaults));
            return options;
        } catch (error) {
            console.error("Failed to read ticket options from store:", error);
            try {
                return await loadDefaultOptionsFromConfig();
            } catch (configError) {
                console.error("Failed to load default options from config:", configError);
                return [];
            }
        }
    }

    public async add(item: TicketQueueOption): Promise<void> {
        try {
            const des = item.des?.trim();
            const queue = item.queue?.trim();
            if (!des || !queue) return;

            const options = await this.get();
            if (options.some((v) => v.queue === queue)) return;

            options.unshift({ des, queue });
            this.store.set("ticketOptions", options);
        } catch (error) {
            console.error("Failed to add ticket option to store:", error);
        }
    }

    public async delete(queue: string): Promise<void> {
        try {
            const queueValue = queue?.trim();
            if (!queueValue) return;

            const options = await this.get();
            const next = options.filter((item) => item.queue !== queueValue);
            this.store.set("ticketOptions", next);
        } catch (error) {
            console.error("Failed to delete ticket option from store:", error);
        }
    }

    public async reset(): Promise<TicketQueueOption[]> {
        try {
            const options = await loadDefaultOptionsFromConfig();
            this.store.set("ticketOptions", options);
            return options;
        } catch (error) {
            console.error("Failed to reset ticket options in store:", error);
            return [];
        }
    }
}
