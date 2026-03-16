import { Injectable } from "@nestjs/common";

import type {
  ClientCredential,
  TicketResponse,
  TicketType,
} from "@/types/orm_types";
import { AppServiceOS } from "./app.service.os";
import { AppServiceStore } from "./app.service.store";
import { AppServiceHttp } from "./app.service.http";

@Injectable()
export class AppServiceTicket {
  public constructor(
    private readonly appServiceOS: AppServiceOS,
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

  public async submitTicket(userInput: TicketType) {
    console.log("🚀 ~ AppServiceTicket ~ submitTicket ~ userInput:", userInput);
    const client_credentials = await this.getToken();
    const current = await this.getCurrent();

    const res = await this.http.httpPost<TicketResponse>(
      "提交工单",
      `${current.sn_host}/api/now/import/u_create_incident_inbound`,
      {
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
      },
      client_credentials.access_token,
      current.sn_host,
    );

    console.log("AppServiceTicket.submitTicket response:", res);

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
