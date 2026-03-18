import { Injectable } from "@nestjs/common";
import Store from "electron-store";
import Ajv2020 from "ajv/dist/2020";
import type { ErrorObject } from "ajv";
import { promises as fs } from "node:fs";
import path from "node:path";
import { TicketQueueOption } from "@/types/orm_types";
import { AppServiceHttp } from "./app.service.http";

const TICKET_OPTIONS_CONFIG_PATH = path.resolve(process.cwd(), "config", "ticket-options.default.json");
const DEFAULT_TICKET_OPTIONS_SCHEMA_PATH = path.resolve(process.cwd(), "config", "ticket-options.schema.json");
const GITHUB_TICKET_OPTIONS_RAW_URL = process.env.TICKET_OPTIONS_REMOTE_URL
    || "https://raw.githubusercontent.com/cnjimbo/QuickTicket2Queue/main/config/ticket-options.default.json";
const GITHUB_TICKET_OPTIONS_FALLBACK_URLS = [
    GITHUB_TICKET_OPTIONS_RAW_URL,
    "https://cdn.jsdelivr.net/gh/cnjimbo/QuickTicket2Queue@main/config/ticket-options.default.json",
];
const FETCH_TIMEOUT_MS = 15000;
const ajv = new Ajv2020({ allErrors: true, strict: false });

export type TicketOptionsSyncMode = "merge" | "overwrite";

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

function formatSchemaErrors(errors?: ErrorObject[] | null): string {
    if (!errors || errors.length === 0) {
        return "unknown schema validation error";
    }

    return errors
        .map((error) => {
            const location = error.instancePath || "/";
            return `${location} ${error.message ?? "is invalid"}`;
        })
        .join("; ");
}

async function loadSchemaByConfigPath(schemaPathValue?: string, http?: AppServiceHttp): Promise<unknown> {
    if (schemaPathValue && /^https?:\/\//i.test(schemaPathValue)) {
        if (!http) throw new Error("HTTP service not available");
        const text = await http.httpGetText("加载远程 schema", schemaPathValue, 15000);
        return JSON.parse(text) as unknown;
    }

    const schemaPath = schemaPathValue
        ? path.resolve(path.dirname(TICKET_OPTIONS_CONFIG_PATH), schemaPathValue)
        : DEFAULT_TICKET_OPTIONS_SCHEMA_PATH;

    const rawSchema = await fs.readFile(schemaPath, "utf8");
    return JSON.parse(rawSchema) as unknown;
}

async function validateConfigWithSchema(config: unknown, schemaPathValue?: string, http?: AppServiceHttp): Promise<Record<string, unknown>> {
    const schema = await loadSchemaByConfigPath(schemaPathValue, http);
    const schemaForCompile = typeof schema === "object" && schema
        ? { ...(schema as Record<string, unknown>) }
        : schema;

    if (schemaForCompile && typeof schemaForCompile === "object") {
        delete (schemaForCompile as Record<string, unknown>).$id;
    }

    const validate = ajv.compile<Record<string, unknown>>(schemaForCompile as object);
    const valid = validate(config);
    if (!valid) {
        throw new Error(`ticket-options.default.json schema 校验失败: ${formatSchemaErrors(validate.errors)}`);
    }

    return config as Record<string, unknown>;
}

async function loadDefaultOptionsFromConfig(http?: AppServiceHttp): Promise<TicketQueueOption[]> {
    const raw = await fs.readFile(TICKET_OPTIONS_CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;

    // Backward compatible: treat legacy array format as { items } before schema validation.
    const configCandidate = Array.isArray(parsed)
        ? ({ items: parsed } as Record<string, unknown>)
        : parsed;

    if (!configCandidate || typeof configCandidate !== "object") {
        throw new Error("ticket-options.default.json 必须是对象，且包含 items 字段");
    }

    const schemaPathValue = typeof (configCandidate as Record<string, unknown>).$schema === "string"
        ? (configCandidate as Record<string, unknown>).$schema as string
        : undefined;
    const configRoot = await validateConfigWithSchema(configCandidate, schemaPathValue, http);

    const items = configRoot.items;
    return normalizeTicketOptions(items);
}

async function loadOptionsFromRawJson(rawJson: string, http?: AppServiceHttp): Promise<TicketQueueOption[]> {
    const parsed = JSON.parse(rawJson) as unknown;

    const configCandidate = Array.isArray(parsed)
        ? ({ items: parsed } as Record<string, unknown>)
        : parsed;

    if (!configCandidate || typeof configCandidate !== "object") {
        throw new Error("远程配置必须是对象，且包含 items 字段");
    }

    const schemaPathValue = typeof (configCandidate as Record<string, unknown>).$schema === "string"
        ? (configCandidate as Record<string, unknown>).$schema as string
        : undefined;
    const configRoot = await validateConfigWithSchema(configCandidate, schemaPathValue, http);

    return normalizeTicketOptions(configRoot.items);
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
            const defaults = await loadDefaultOptionsFromConfig(this.http);
            const options =
                this.store.get("ticketOptions", cloneOptions(defaults));
            return options;
        } catch (error) {
            console.error("Failed to read ticket options from store:", error);
            try {
                return await loadDefaultOptionsFromConfig(this.http);
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
            const options = await loadDefaultOptionsFromConfig(this.http);
            this.store.set("ticketOptions", options);
            return options;
        } catch (error) {
            console.error("Failed to reset ticket options in store:", error);
            return [];
        }
    }

    public async syncFromGithub(mode: TicketOptionsSyncMode): Promise<TicketQueueOption[]> {
        const rawText = await fetchRemoteTicketOptionsRawJson(this.http);
        const remoteOptions = await loadOptionsFromRawJson(rawText, this.http);

        const nextOptions = mode === "overwrite"
            ? remoteOptions
            : mergeByQueue(await this.get(), remoteOptions);

        await this.setTicketOptions(nextOptions);
        return nextOptions;
    }
}
