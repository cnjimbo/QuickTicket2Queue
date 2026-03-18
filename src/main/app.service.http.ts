import { Injectable } from "@nestjs/common";

export interface HttpErrorDetails {
    status?: number;
    statusText?: string;
    data?: unknown;
}

export interface HttpResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    status: number;
    statusText: string;
}

interface RequestBehaviorOptions {
    suppressErrorLog?: boolean;
}

interface HttpTextResponse {
    success: boolean;
    text: string;
    error?: string;
    status: number;
    statusText: string;
}

const DEFAULT_TIMEOUT_MS = 60000;

function stringifyPayload(payload: unknown): string {
    if (payload == null) return "";
    if (typeof payload === "string") return payload;
    try {
        return JSON.stringify(payload);
    } catch {
        return String(payload);
    }
}

function formatHttpFailure(
    context: string,
    error: unknown,
    details?: HttpErrorDetails,
    host?: string,
): string {
    if (!details?.status) {
        return `${context}失败: ${error instanceof Error ? error.message : String(error)}`;
    }

    const status = details.status;
    const statusText = details.statusText ?? "";
    const responseDetails = stringifyPayload(details.data);
    const hostText = host ? ` (${host})` : "";

    if (status === 401) {
        return `${context}失败: 401 Unauthorized${hostText}。请检查当前环境的 client_id/client_secret/sn_host 是否正确，并确认账号接口权限可用。${responseDetails ? ` 响应: ${responseDetails}` : ""}`;
    }

    if (status === 403) {
        return `${context}失败: 403 Forbidden${hostText}。当前账号缺少接口权限。${responseDetails ? ` 响应: ${responseDetails}` : ""}`;
    }

    return `${context}失败: ${status ?? "unknown"} ${statusText}${hostText}${responseDetails ? `，响应: ${responseDetails}` : ""}`;
}

@Injectable()
export class AppServiceHttp {
    private async fetchTextWithTimeout(
        url: string,
        options: RequestInit,
        timeoutMs: number = DEFAULT_TIMEOUT_MS,
    ): Promise<HttpTextResponse> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            const text = await response.text();

            return {
                success: response.status >= 200 && response.status < 300,
                text,
                status: response.status,
                statusText: response.statusText,
            };
        } catch (error) {
            const isTimeout = error instanceof Error && error.name === "AbortError";
            return {
                success: false,
                text: "",
                status: isTimeout ? 408 : 0,
                statusText: isTimeout ? "Request Timeout" : "Network Error",
                error: error instanceof Error ? error.message : String(error),
            };
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * 发送 HTTP 请求，返回统一的响应格式
     */
    protected async fetchWithTimeout<T>(
        url: string,
        options: RequestInit,
        timeoutMs: number = DEFAULT_TIMEOUT_MS,
    ): Promise<HttpResponse<T>> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            const text = await response.text();
            let data: T;
            try {
                data = text ? (JSON.parse(text) as T) : ({} as T);
            } catch {
                return {
                    success: false,
                    status: response.status,
                    statusText: response.statusText,
                    error: `响应 JSON 解析失败: ${text.slice(0, 100)}`,
                };
            }

            return {
                success: response.status >= 200 && response.status < 300,
                data,
                status: response.status,
                statusText: response.statusText,
            };
        } catch (error) {
            const isTimeout = error instanceof Error && error.name === "AbortError";
            return {
                success: false,
                status: isTimeout ? 408 : 0,
                statusText: isTimeout ? "Request Timeout" : "Network Error",
                error: error instanceof Error ? error.message : String(error),
            };
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * 构建格式化的错误消息
     */
    protected buildErrorMessage(
        context: string,
        response: HttpResponse<unknown>,
        host?: string,
    ): string {
        return formatHttpFailure(context, new Error(), {
            status: response.status,
            statusText: response.statusText,
            data: response.error || response.data,
        }, host);
    }

    /**
     * 发送请求并返回数据，失败时抛出异常
     */
    protected async request<T>(
        context: string,
        url: string,
        options: RequestInit,
        host?: string,
        behaviorOptions?: RequestBehaviorOptions,
    ): Promise<T> {
        const response = await this.fetchWithTimeout<T>(url, options);

        if (!response.success) {
            const errorMessage = this.buildErrorMessage(context, response, host);
            if (!behaviorOptions?.suppressErrorLog) {
                console.error(`${context} request failed:`, errorMessage);
            }
            throw new Error(errorMessage);
        }

        return response.data as T;
    }

    /**
     * 发送 GET 请求
     */
    public async httpGet<T>(
        context: string,
        url: string,
        host?: string,
    ): Promise<T> {
        const options: RequestInit = {
            method: "GET",
            headers: {
                Accept: "*/*",
                Connection: "keep-alive",
            },
        };
        return this.request<T>(context, url, options, host);
    }

    /**
     * 发送 POST JSON 请求
     */
    public async httpPost<T>(
        context: string,
        url: string,
        payload: unknown,
        token?: string,
        host?: string,
    ): Promise<T> {
        const options: RequestInit = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "*/*",
                Connection: "keep-alive",
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify(payload),
        };
        return this.request<T>(context, url, options, host);
    }

    public async httpPostWithHeaders<T>(
        context: string,
        url: string,
        payload: unknown,
        headers: Record<string, string>,
        host?: string,
        behaviorOptions?: RequestBehaviorOptions,
    ): Promise<T> {
        const options: RequestInit = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json,text/plain,*/*",
                Connection: "keep-alive",
                ...headers,
            },
            body: JSON.stringify(payload),
        };

        return this.request<T>(context, url, options, host, behaviorOptions);
    }

    /**
     * 发送 POST form-urlencoded 请求
     */
    public async httpPostForm<T>(
        context: string,
        url: string,
        formData: Record<string, string>,
        host?: string,
    ): Promise<T> {
        const params = new URLSearchParams();
        Object.entries(formData).forEach(([key, value]) => {
            params.set(key, value ?? "");
        });

        const options: RequestInit = {
            method: "POST",
            headers: {
                "User-Agent": "Apifox/1.0.0 (https://apifox.com)",
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "*/*",
                Connection: "keep-alive",
            },
            body: params.toString(),
        };
        return this.request<T>(context, url, options, host);
    }

    /**
     * 发送 POST 请求并获取纯文本响应
     */
    public async httpPostText(
        context: string,
        url: string,
        payload: unknown,
        timeoutMs: number = DEFAULT_TIMEOUT_MS,
    ): Promise<string> {
        const options: RequestInit = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json,text/plain,*/*",
            },
            body: JSON.stringify(payload),
        };

        const response = await this.fetchTextWithTimeout(url, options, timeoutMs);

        if (!response.success) {
            const errorMessage = this.buildErrorMessage(context, response);
            console.error(`${context} request failed:`, errorMessage);
            throw new Error(errorMessage);
        }

        return response.text;
    }

    /**
     * 发送 GET 请求并获取纯文本响应
     */
    public async httpGetText(
        context: string,
        url: string,
        timeoutMs: number = DEFAULT_TIMEOUT_MS,
    ): Promise<string> {
        const options: RequestInit = {
            method: "GET",
            headers: {
                Accept: "application/json,text/plain,*/*",
            },
        };

        const response = await this.fetchTextWithTimeout(url, options, timeoutMs);

        if (!response.success) {
            const errorMessage = this.buildErrorMessage(context, response);
            console.error(`${context} request failed:`, errorMessage);
            throw new Error(errorMessage);
        }

        return response.text;
    }

    /**
     * 尝试从多个 URL 获取纯文本，直到成功
     */
    public async httpGetTextWithFallback(
        context: string,
        urls: string[],
        timeoutMs: number = DEFAULT_TIMEOUT_MS,
    ): Promise<string> {
        const attempts: string[] = [];

        for (const url of urls) {
            try {
                return await this.httpGetText(context, url, timeoutMs);
            } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                attempts.push(`${url} -> ${reason}`);
            }
        }

        throw new Error(`${context}失败，已尝试以下地址: ${attempts.join(" | ")}`);
    }
}
