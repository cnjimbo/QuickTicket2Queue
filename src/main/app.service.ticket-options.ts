import { Injectable } from "@nestjs/common";
import Store from "electron-store";
import { promises as fs } from "node:fs";
import path from "node:path";
import ticketOptionsDefaultConfig from "@/config/ticket-options.default.json";
import { TicketQueueOption } from "@/types/orm_types";
import { AppServiceHttp } from "./app.service.http";
const GITHUB_TICKET_OPTIONS_RAW_URL = process.env.TICKET_OPTIONS_REMOTE_URL
    || "https://raw.githubusercontent.com/cnjimbo/QuickTicket2Queue/main/config/ticket-options.default.json";
const GITHUB_TICKET_OPTIONS_FALLBACK_URLS = [
    GITHUB_TICKET_OPTIONS_RAW_URL,
    "https://cdn.jsdelivr.net/gh/cnjimbo/QuickTicket2Queue@main/config/ticket-options.default.json",
];
const FETCH_TIMEOUT_MS = 15000;

export type TicketOptionsSyncMode = "merge" | "overwrite";

function cloneOptions(options: TicketQueueOption[]): TicketQueueOption[] {
    return options.map((item) => ({ ...item }));
}

function normalizeTicketOptions(input: TicketQueueOption[]): TicketQueueOption[] {
    if (!Array.isArray(input)) {
        throw new Error("ticket-options.default.json 的 items 必须是数组");
    }

    const options = input
        .map((item) => {
            const des = String(item?.des ?? "").trim();
            const queue = String(item?.queue ?? "").trim();
            if (!des || !queue) return null;
            return { des, queue } satisfies TicketQueueOption;
        })
        .filter((item): item is TicketQueueOption => item !== null);

    if (!options.length) {
        throw new Error("ticket-options.default.json 未包含有效 des/queue 数据");
    }

    return options;
}

const DEFAULT_TICKET_OPTIONS = ticketOptionsDefaultConfig.items;

function loadOptionsFromRawJson(rawJson: string): TicketQueueOption[] {
    const parsed = JSON.parse(rawJson) as typeof ticketOptionsDefaultConfig;
    return normalizeTicketOptions(parsed.items);
}

function mergeByQueue(current: TicketQueueOption[], incoming: TicketQueueOption[]): TicketQueueOption[] {
    const existingQueues = new Set(current.map((item) => item.queue));
    const toAppend = incoming.filter((item) => !existingQueues.has(item.queue));
    return [...current, ...toAppend];
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
    return typeof error === "object" && error !== null && "code" in error;
}

async function fetchRemoteTicketOptionsRawJson(http: AppServiceHttp): Promise<string> {
    return http.httpGetTextWithFallback("同步 GitHub 配置", GITHUB_TICKET_OPTIONS_FALLBACK_URLS, FETCH_TIMEOUT_MS);
}

@Injectable()
export class AppServiceTicketOptions {
    private store!: Store<{ "ticketOptions": TicketQueueOption[] }>;

    constructor(private readonly http: AppServiceHttp) {
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

    private async ensureStoreFileExists(): Promise<void> {
        const storePath = this.store.path;

        try {
            await fs.access(storePath);
        } catch {
            await fs.mkdir(path.dirname(storePath), { recursive: true });
            await fs.writeFile(storePath, "{}", "utf8");
        }
    }

    private async setTicketOptions(options: TicketQueueOption[]): Promise<void> {
        try {
            this.store.set("ticketOptions", options);
        } catch (error) {
            if (isErrnoException(error) && error.code === "ENOENT") {
                await this.ensureStoreFileExists();
                this.store.set("ticketOptions", options);
                return;
            }

            throw error;
        }
    }

    public async get(): Promise<TicketQueueOption[]> {
        try {
            const options =
                this.store.get("ticketOptions", cloneOptions(DEFAULT_TICKET_OPTIONS));
            return options;
        } catch (error) {
            console.error("Failed to read ticket options from store:", error);
            try {
                return cloneOptions(DEFAULT_TICKET_OPTIONS);
            } catch (configError) {
                console.error("Failed to load default options from imported config:", configError);
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
            await this.setTicketOptions(options);
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
            await this.setTicketOptions(next);
        } catch (error) {
            console.error("Failed to delete ticket option from store:", error);
        }
    }

    public async reset(): Promise<TicketQueueOption[]> {
        try {
            const options = cloneOptions(DEFAULT_TICKET_OPTIONS);
            await this.setTicketOptions(options);
            return options;
        } catch (error) {
            console.error("Failed to reset ticket options in store:", error);
            return [];
        }
    }

    public async syncFromGithub(mode: TicketOptionsSyncMode): Promise<TicketQueueOption[]> {
        const rawText = await fetchRemoteTicketOptionsRawJson(this.http);
        const remoteOptions = loadOptionsFromRawJson(rawText);

        const nextOptions = mode === "overwrite"
            ? remoteOptions
            : mergeByQueue(await this.get(), remoteOptions);

        await this.setTicketOptions(nextOptions);
        return nextOptions;
    }
}
