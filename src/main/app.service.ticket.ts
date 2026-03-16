import { Injectable } from "@nestjs/common";

import type {
  ClientCredential,
  TicketResponse,
  TicketType,
} from "@/types/orm_types";
import { AppServiceOS } from "./app.service.os";
import { AppServiceStore } from "./app.service.store";

function stringifyErrorPayload(payload: unknown): string {
  if (payload == null) return "";
  if (typeof payload === "string") return payload;
  try {
    return JSON.stringify(payload);
  } catch {
    return String(payload);
  }
}

interface HttpErrorDetails {
  status?: number;
  statusText?: string;
  data?: unknown;
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
  const responseDetails = stringifyErrorPayload(details.data);
  const hostText = host ? ` (${host})` : "";

  if (status === 401) {
    return `${context}失败: 401 Unauthorized${hostText}。请检查当前环境的 client_id/client_secret/sn_host 是否正确，并确认账号接口权限可用。${responseDetails ? ` 响应: ${responseDetails}` : ""}`;
  }

  if (status === 403) {
    return `${context}失败: 403 Forbidden${hostText}。当前账号缺少接口权限。${responseDetails ? ` 响应: ${responseDetails}` : ""}`;
  }

  return `${context}失败: ${status ?? "unknown"} ${statusText}${hostText}${responseDetails ? `，响应: ${responseDetails}` : ""}`;
}

const REQUEST_TIMEOUT_MS = 60000;

@Injectable()
export class AppServiceTicket {
  public constructor(
    private readonly appServiceOS: AppServiceOS,
    private readonly store: AppServiceStore,
  ) { }

  private async fetchWithTimeout<T>(
    url: string,
    options: RequestInit,
    timeoutMs: number = REQUEST_TIMEOUT_MS,
  ): Promise<{ data: T; status: number; statusText: string }> {
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
        data = text ? JSON.parse(text) as T : ({} as T);
      } catch (e) {
        throw new Error(`响应 JSON 解析失败: ${text.slice(0, 100)}`, {
          cause: e,
        });
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  private async requestWithFormattedError<T>(
    context: string,
    url: string,
    options: RequestInit,
    host?: string,
  ): Promise<T> {
    try {
      const response = await this.fetchWithTimeout<T>(url, options);
      if (response.status < 200 || response.status >= 300) {
        throw new Error(formatHttpFailure(context, new Error(), {
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        }, host));
      }
      return response.data;
    } catch (error) {
      console.error(`${context} request failed`, error);
      throw new Error(formatHttpFailure(context, error, {
        status: error instanceof Error && error.message.includes("Abort") ? 408 : undefined,
      }, host), {
        cause: error,
      });
    }
  }

  public async getCurrent() {
    const current = await this.store.getCurrent();
    return current;
  }
  public async getToken() {
    const current = await this.getCurrent();
    const params = new URLSearchParams();
    params.set("grant_type", "client_credentials");
    params.set("client_secret", current.client_secret ?? "");
    params.set("client_id", current.client_id ?? "");
    const body = params.toString();
    const url = `${current.sn_host}/oauth_token.do`;
    const options: RequestInit = {
      method: "POST",
      headers: {
        "User-Agent": "Apifox/1.0.0 (https://apifox.com)",
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "*/*",
        Connection: "keep-alive",
      },
      body,
    };

    const token = await this.requestWithFormattedError<ClientCredential>(
      "获取 OAuth Token",
      url,
      options,
      current.sn_host,
    );
    console.log(JSON.stringify(token));
    return token;
  }

  public async submitTicket(userInput: TicketType) {
    console.log("🚀 ~ AppServiceTicket ~ submitTicket ~ userInput:", userInput);
    const client_credentials = await this.getToken();
    const payload = {
      u_caller_id: this.appServiceOS.getUserName(),
      u_pfe_requested_by: userInput.userName,
      u_short_description: userInput.title,
      u_assignment_group: userInput.queue_val,
      u_description: userInput.content,
      u_impact: "2",
      u_urgency: "2",
      u_contact_type: "internal",
      u_comments: "Ticket raised",
      u_correlation_id: "",
      u_correlation_display: "",
      u_use_ci_alert_assignment: 1,
    };
    const current = await this.getCurrent();
    const url = `${current.sn_host}/api/now/import/u_create_incident_inbound`;
    const options: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${client_credentials.access_token}`,
        Accept: "*/*",
        Connection: "keep-alive",
      },
      body: JSON.stringify(payload),
    };

    const res = await this.requestWithFormattedError<TicketResponse>(
      "提交工单",
      url,
      options,
      current.sn_host,
    );
    console.log(
      "AppServiceTicket.submitTicket response:",
      res,
    );
    if (res?.result) {
      for (const result of res.result) {
        result.ticket_link = `${current.sn_host}/now/sow/record/incident/${result.sys_id}`;
        result.createTime = new Date().toLocaleString();
        await this.store.saveTicketHistory({
          result,
          ticket: {
            ...userInput,
          },
        });
      }
    }

    return res;
  }
}
