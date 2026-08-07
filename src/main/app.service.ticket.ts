import { Injectable } from "@nestjs/common";

import type {
  ClientCredential,
  TicketResponse,
  TicketType,
} from "@/types/orm_types";
import { AppServiceStore } from "./app.service.store";
import { AppServiceHttp } from "./app.service.http";

export type WebSessionAuth = {
  cookieHeader: string;
  userToken: string;
  referer: string;
};

type ServiceNowTableIncidentResponse = {
  result?: {
    sys_id?: unknown;
    number?: unknown;
    short_description?: string;
    assignment_group?: {
      display_value?: string;
      value?: string;
    } | string;
    link?: string;
  };
};

type ServiceNowIncidentLookupResponse = {
  result?: {
    sys_id?: unknown;
    number?: unknown;
  };
};

function readServiceNowFieldAsString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const maybeRecord = value as { value?: unknown; display_value?: unknown };
    if (typeof maybeRecord.value === "string") {
      return maybeRecord.value;
    }
    if (typeof maybeRecord.display_value === "string") {
      return maybeRecord.display_value;
    }
  }

  return "";
}

function readIncidentSysIdFromResult(result: TicketResponse["result"][number]) {
  const recordLinkMatch = result.record_link?.match(/\/incident\/([^/?#]+)/i);
  if (recordLinkMatch?.[1]) {
    return recordLinkMatch[1];
  }

  if (result.sys_id) {
    return result.sys_id;
  }

  return "";
}

@Injectable()
export class AppServiceTicket {
  public constructor(
    private readonly store: AppServiceStore,
    private readonly http: AppServiceHttp,
  ) { }

  public async getCurrent() {
    const current = await this.store.getCurrent();
    return current;
  }
  public async getToken() {
    const current = await this.getCurrent();
    const token = await this.http.httpPostForm<ClientCredential>(
      "获取 OAuth Token",
      `${current.sn_host}/oauth_token.do`,
      {
        grant_type: "client_credentials",
        client_secret: current.client_secret ?? "",
        client_id: current.client_id ?? "",
      },
      current.sn_host,
    );
    console.log(JSON.stringify(token));
    return token;
  }

  private resolveRequestBy(userInput: TicketType) {
    return userInput.userName?.trim() ?? "";
  }

  private resolveRequestFor(userInput: TicketType) {
    const requestFor = userInput.requestFor?.trim();
    return requestFor || this.resolveRequestBy(userInput);
  }

  private buildTicketPayload(userInput: TicketType) {
    return {
      u_caller_id: this.resolveRequestFor(userInput),
      u_pfe_requested_by: this.resolveRequestBy(userInput),
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
  }

  private buildIncidentTablePayload(userInput: TicketType) {
    return {
      caller_id: this.resolveRequestFor(userInput),
      u_pfe_requested_by: this.resolveRequestBy(userInput),
      short_description: userInput.title,
      assignment_group: userInput.queue_val,
      description: userInput.content,
      impact: "2",
      urgency: "2",
      contact_type: "internal",
      comments: "Ticket raised",
      u_use_ci_alert_assignment: true,
    };
  }

  private buildWebSessionHeaders(auth: WebSessionAuth, host: string) {
    return {
      Cookie: auth.cookieHeader,
      Origin: host,
      Referer: auth.referer,
      "X-UserToken": auth.userToken,
      "X-Requested-With": "XMLHttpRequest",
    };
  }

  private shouldFallbackToIncidentTable(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return /ACL Exception Insert Failed due to security constraints/i.test(error.message)
      || /403 Forbidden/i.test(error.message);
  }

  private normalizeIncidentTableResponse(response: ServiceNowTableIncidentResponse): TicketResponse {
    const incident = response.result ?? {};
    const sysId = readServiceNowFieldAsString(incident.sys_id);
    const number = readServiceNowFieldAsString(incident.number) || sysId;

    return {
      import_set: "",
      staging_table: "incident",
      result: [
        {
          transform_map: "incident",
          table: "incident",
          display_name: "number",
          display_value: number,
          record_link: incident.link ?? "",
          status: "inserted",
          sys_id: sysId,
          ticket_link: "",
        },
      ],
    };
  }

  private async submitTicketViaIncidentTable(userInput: TicketType, auth: WebSessionAuth, host: string) {
    const response = await this.http.httpPostWithHeaders<ServiceNowTableIncidentResponse>(
      "通过网页登录态直接创建 Incident",
      `${host}/api/now/table/incident?sysparm_display_value=all&sysparm_input_display_value=true`,
      this.buildIncidentTablePayload(userInput),
      this.buildWebSessionHeaders(auth, host),
      host,
    );

    return this.normalizeIncidentTableResponse(response);
  }

  private async persistTicketHistory(userInput: TicketType, res: TicketResponse, host: string) {
    if (!res?.result) {
      return;
    }

    for (const result of res.result) {
      result.ticket_link = `${host}/now/sow/record/incident/${result.sys_id}`;
      result.createTime = new Date().toLocaleString();
      await this.store.saveTicketHistory({
        result,
        ticket: {
          ...userInput,
        },
      });
    }
  }

  private async enrichTicketResponseWithIncidentNumber(res: TicketResponse, token: string, host: string) {
    if (!res?.result?.length) {
      return res;
    }

    for (const result of res.result) {
      const sysId = readIncidentSysIdFromResult(result);
      if (!sysId) continue;

      try {
        const incident = await this.http.httpGetWithHeaders<ServiceNowIncidentLookupResponse>(
          "查询新建工单编号",
          `${host}/api/now/table/incident/${encodeURIComponent(sysId)}?sysparm_fields=sys_id,number&sysparm_display_value=all`,
          { Authorization: `Bearer ${token}` },
          host,
          { suppressErrorLog: true },
        );
        const incidentNumber = readServiceNowFieldAsString(incident.result?.number);
        const incidentSysId = readServiceNowFieldAsString(incident.result?.sys_id);

        if (incidentNumber) {
          result.display_name = "number";
          result.display_value = incidentNumber;
        }
        if (incidentSysId) {
          result.sys_id = incidentSysId;
        }
      } catch (error) {
        console.warn("Failed to refresh incident number after import submit.", error);
      }
    }

    return res;
  }

  public async submitTicket(userInput: TicketType) {
    console.log("🚀 ~ AppServiceTicket ~ submitTicket ~ userInput:", userInput);
    const client_credentials = await this.getToken();
    const current = await this.getCurrent();

    const res = await this.http.httpPost<TicketResponse>(
      "提交工单",
      `${current.sn_host}/api/now/import/u_create_incident_inbound`,
      this.buildTicketPayload(userInput),
      client_credentials.access_token,
      current.sn_host,
    );

    const normalizedRes = await this.enrichTicketResponseWithIncidentNumber(
      res,
      client_credentials.access_token,
      current.sn_host!,
    );

    console.log("AppServiceTicket.submitTicket response:", normalizedRes);

    await this.persistTicketHistory(userInput, normalizedRes, current.sn_host!);

    return normalizedRes;
  }

  public async submitTicketViaWebSession(userInput: TicketType, auth: WebSessionAuth) {
    console.log("🚀 ~ AppServiceTicket ~ submitTicketViaWebSession ~ userInput:", userInput);
    const current = await this.getCurrent();
    const normalizedHost = `${current.sn_host}`.replace(/\/$/, "");

    let res: TicketResponse;
    try {
      res = await this.http.httpPostWithHeaders<TicketResponse>(
        "通过网页登录态提交工单",
        `${normalizedHost}/api/now/import/u_create_incident_inbound`,
        this.buildTicketPayload(userInput),
        this.buildWebSessionHeaders(auth, normalizedHost),
        normalizedHost,
        { suppressErrorLog: true },
      );
    } catch (error) {
      if (!this.shouldFallbackToIncidentTable(error)) {
        throw error;
      }

      console.warn("Import API blocked by ACL, retrying with incident table API.");
      res = await this.submitTicketViaIncidentTable(userInput, auth, normalizedHost);
    }

    console.log("AppServiceTicket.submitTicketViaWebSession response:", res);
    await this.persistTicketHistory(userInput, res, normalizedHost);

    return res;
  }
}
