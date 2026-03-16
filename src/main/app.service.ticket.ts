import { Injectable } from "@nestjs/common";
import axios from "axios";
import * as qs from "qs";

import type { AxiosRequestConfig } from "axios";
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
  public constructor(
    private readonly appServiceOS: AppServiceOS,
    private readonly store: AppServiceStore,
  ) {
    axios.defaults.timeout = 60000;
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
        Accept: "*/*",
        Connection: "keep-alive",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      data: data,
    } satisfies AxiosRequestConfig;

    try {
      const response = await axios(config);
      console.log(JSON.stringify(response.data));
      return response.data as ClientCredential;
    } catch (error) {
      console.error("getToken request failed", error);
      throw new Error(formatAxiosFailure("获取 OAuth Token", error, current.sn_host), {
        cause: error,
      });
    }
  }

  public async submitTicket(userInput: TicketType) {
    console.log("🚀 ~ AppServiceTicket ~ submitTicket ~ userInput:", userInput);
    const client_credentials = await this.getToken();
    const data = JSON.stringify({
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
    });
    // console.log("🚀 ~ AppServiceTicket ~ submitTicket ~ data:", data);
    const current = await this.getCurrent();
    const config = {
      method: "post",
      url: `${current.sn_host}/api/now/import/u_create_incident_inbound`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${client_credentials.access_token}`,
        Accept: "*/*",
        Connection: "keep-alive",
      },
      data: data,
    };

    try {
      const response = await axios(config);
      console.log(
        "AppServiceTicket.submitTicket response:",
        response.data,
      );
      const res = response.data as TicketResponse;
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
    } catch (error) {
      console.error("submitTicket request failed", error);
      throw new Error(formatAxiosFailure("提交工单", error, current.sn_host), {
        cause: error,
      });
    }
  }
}
