import { Injectable } from "@nestjs/common";
import axios from "axios";
import * as qs from "qs";

import type { AxiosInstance, AxiosRequestConfig } from "axios";
import {
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

function formatAxiosFailure(
  context: string,
  error: unknown,
  host?: string,
): string {
  if (!axios.isAxiosError(error)) {
    return `${context}失败: ${error instanceof Error ? error.message : String(error)}`;
  }

  const status = error.response?.status;
  const statusText = error.response?.statusText ?? "";
  const details = stringifyErrorPayload(error.response?.data);
  const hostText = host ? ` (${host})` : "";

  if (status === 401) {
    return `${context}失败: 401 Unauthorized${hostText}。请检查当前环境的 client_id/client_secret/sn_host 是否正确，并确认账号接口权限可用。${details ? ` 响应: ${details}` : ""}`;
  }

  if (status === 403) {
    return `${context}失败: 403 Forbidden${hostText}。当前账号缺少接口权限。${details ? ` 响应: ${details}` : ""}`;
  }

  return `${context}失败: ${status ?? "unknown"} ${statusText}${hostText}${details ? `，响应: ${details}` : ""}`;
}

@Injectable()
export class AppServiceTicket {
  private readonly snClient: AxiosInstance;

  public constructor(
    private readonly appServiceOS: AppServiceOS,
    private readonly store: AppServiceStore,
  ) {
    this.snClient = axios.create({
      timeout: 60000,
      headers: {
        Accept: "*/*",
        Connection: "keep-alive",
      },
    });
  }

  private async requestWithFormattedError<T>(
    context: string,
    config: AxiosRequestConfig,
    host?: string,
  ): Promise<T> {
    try {
      const response = await this.snClient.request<T>(config);
      return response.data;
    } catch (error) {
      console.error(`${context} request failed`, error);
      throw new Error(formatAxiosFailure(context, error, host), {
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
    const data = qs.stringify({
      grant_type: "client_credentials",
      client_secret: current.client_secret,
      client_id: current.client_id,
    });
    const config = {
      method: "post",
      url: `${current.sn_host}/oauth_token.do`,
      headers: {
        "User-Agent": "Apifox/1.0.0 (https://apifox.com)",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: data,
    } satisfies AxiosRequestConfig;

    const token = await this.requestWithFormattedError<ClientCredential>(
      "获取 OAuth Token",
      config,
      current.sn_host,
    );
    console.log(JSON.stringify(token));
    return token;
  }

  public async submitTicket(userInput: TicketType) {
    console.log("🚀 ~ AppServiceTicket ~ submitTicket ~ userInput:", userInput);
    const client_credentials = await this.getToken();
    const data = {
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
    // console.log("🚀 ~ AppServiceTicket ~ submitTicket ~ data:", data);
    const current = await this.getCurrent();
    const config = {
      method: "post",
      url: `${current.sn_host}/api/now/import/u_create_incident_inbound`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${client_credentials.access_token}`,
      },
      data: data,
    } satisfies AxiosRequestConfig;

    const res = await this.requestWithFormattedError<TicketResponse>(
      "提交工单",
      config,
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
