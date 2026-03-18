import { BrowserWindow } from "electron";
import { IpcHandle, Window } from "@doubleshot/nest-electron";
import { Controller } from "@nestjs/common";
import { Payload } from "@nestjs/microservices";
import type {
  CredentialItem,
  TicketHistoryItem,
  TicketQueueOption,
  TicketResponse,
  TicketType,
} from "@/types/orm_types";
import { AppServiceTicket } from "./app.service.ticket";
import { AppServiceOS } from "./app.service.os";
import { AppServiceStore } from "./app.service.store";

@Controller()
export class AppControllerTicket {
  private readonly mainWin: BrowserWindow;

  constructor(
    private readonly ticketService: AppServiceTicket,
    private readonly osservice: AppServiceOS,
    @Window() mainWin: BrowserWindow,
    private readonly store: AppServiceStore,
  ) {
    this.mainWin = mainWin;
  }

  private isIgnorableNavigationError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    return /ERR_ABORTED/i.test(error.message) || /\(-3\)/.test(error.message);
  }

  private async openLoginWindowAndExtractSession(current: CredentialItem): Promise<{
    cookieHeader: string;
    userToken: string;
    referer: string;
  }> {
    const host = current?.sn_host?.trim() ?? "";
    if (!host) {
      throw new Error("当前环境未配置 sn_host，无法打开网页登录窗口。");
    }

    const normalizedHost = host.replace(/\/$/, "");
    const loginWindow = new BrowserWindow({
      width: 1280,
      height: 900,
      parent: this.mainWin,
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

    return await new Promise((resolve, reject) => {
      let settled = false;
      let pollingTimer: NodeJS.Timeout | undefined;
      let timeoutTimer: NodeJS.Timeout | undefined;

      const cleanup = () => {
        if (pollingTimer) {
          clearInterval(pollingTimer);
          pollingTimer = undefined;
        }

        if (timeoutTimer) {
          clearTimeout(timeoutTimer);
          timeoutTimer = undefined;
        }
      };

      const settleResolve = (result: { cookieHeader: string; userToken: string; referer: string }) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(result);
      };

      const settleReject = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };

      const closeLoginWindow = () => {
        if (!loginWindow.isDestroyed()) {
          loginWindow.close();
        }
      };

      const tryExtractSession = async () => {
        if (settled || loginWindow.isDestroyed() || loginWindow.webContents.isDestroyed()) {
          return;
        }

        try {
          const pageResult = await loginWindow.webContents.executeJavaScript(
            `(() => {
              const readValue = (raw) => typeof raw === "string" ? raw.trim() : "";
              const tokenCandidates = [];
              const push = (source, raw) => {
                const value = readValue(raw);
                if (!value || value.length < 12) return;
                tokenCandidates.push({ source, token: value });
              };

              push("window.g_ck", window?.g_ck);
              push("window.NOW.g_ck", window?.NOW?.g_ck);

              const meta = document.querySelector('meta[name="sysparm_ck"], meta[name="csrf-token"]');
              push("meta.csrf", meta?.content);

              const input = document.querySelector('input[name="sysparm_ck"]');
              push("input.sysparm_ck", input?.value);

              const href = window.location.href;
              const hasToken = tokenCandidates.length > 0;
              return {
                hasToken,
                token: hasToken ? tokenCandidates[0].token : "",
                href,
              };
            })()`,
            true,
          ) as { hasToken: boolean; token: string; href: string };

          if (!pageResult?.hasToken || !pageResult.token) {
            return;
          }

          const cookies = await loginWindow.webContents.session.cookies.get({ url: normalizedHost });
          if (!cookies.length) {
            return;
          }

          const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
          settleResolve({
            cookieHeader,
            userToken: pageResult.token,
            referer: pageResult.href || normalizedHost,
          });
          closeLoginWindow();
        } catch {
          // Ignore transient extraction failures while the page is still logging in.
        }
      };

      loginWindow.once("ready-to-show", () => {
        if (!settled) {
          loginWindow.show();
        }
      });

      loginWindow.on("closed", () => {
        if (settled) return;
        settleReject(new Error("登录窗口已关闭，未获取到当前环境的登录 session。"));
      });

      loginWindow.webContents.on("did-finish-load", () => {
        void tryExtractSession();
      });
      loginWindow.webContents.on("did-navigate", () => {
        void tryExtractSession();
      });
      loginWindow.webContents.on("did-navigate-in-page", () => {
        void tryExtractSession();
      });
      loginWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        if (!isMainFrame || settled) {
          return;
        }

        // ServiceNow SSO jumps can transiently abort the previous navigation while the next page loads.
        if (errorCode === -3 || /ERR_ABORTED/i.test(errorDescription)) {
          return;
        }

        settleReject(new Error(`加载登录页失败: ${errorDescription} (${errorCode}) ${validatedURL}`));
        closeLoginWindow();
      });

      pollingTimer = setInterval(() => {
        void tryExtractSession();
      }, 1500);

      timeoutTimer = setTimeout(() => {
        settleReject(new Error("登录后等待 session 提取超时，请重试。"));
        closeLoginWindow();
      }, 180000);

      loginWindow.loadURL(`${normalizedHost}/`).catch((error: unknown) => {
        if (this.isIgnorableNavigationError(error)) {
          return;
        }

        settleReject(new Error(error instanceof Error ? error.message : String(error)));
        closeLoginWindow();
      });
    });
  }

  @IpcHandle("ticket")
  public async onTicketSubmit(
    @Payload() data: TicketType,
  ): Promise<TicketResponse> {
    console.log("🚀 ~ AppControllerTicket ~ onTicketSubmit ~ data:", data);
    return await this.ticketService.submitTicket(data);
  }

  @IpcHandle("ticket-via-web-session")
  public async onTicketSubmitViaWebSession(
    @Payload() data: TicketType,
  ): Promise<TicketResponse> {
    console.log("🚀 ~ AppControllerTicket ~ onTicketSubmitViaWebSession ~ data:", data);
    const current = await this.store.getCurrent();
    const sessionAuth = await this.openLoginWindowAndExtractSession(current);
    return await this.ticketService.submitTicketViaWebSession(data, sessionAuth);
  }

  @IpcHandle("get-domain-user")
  public async getUserName(): Promise<string> {
    return this.osservice.getUserName();
  }

  @IpcHandle("get-ticket-history")
  public async getTicketHistory(): Promise<TicketHistoryItem[]> {
    return await this.store.getTicketHistory();
  }

  @IpcHandle("clear-ticket-history")
  public async clearTicketHistory(): Promise<void> {
    await this.store.clearTicketHistory();
  }

  @IpcHandle("save-ticket-history")
  public async saveTicketHistory(item: TicketHistoryItem): Promise<void> {
    await this.store.saveTicketHistory(item);
  }

  @IpcHandle("get-ticket-options")
  public async getTicketOptions(): Promise<TicketQueueOption[]> {
    return await this.store.getTicketOptions();
  }

  @IpcHandle("add-ticket-option")
  public async addTicketOption(@Payload() item: TicketQueueOption): Promise<void> {
    await this.store.addTicketOption(item);
  }

  @IpcHandle("delete-ticket-option")
  public async deleteTicketOption(@Payload() queue: string): Promise<void> {
    await this.store.deleteTicketOption(queue);
  }

  @IpcHandle("reset-ticket-options")
  public async resetTicketOptions(): Promise<TicketQueueOption[]> {
    return await this.store.resetTicketOptions();
  }

  @IpcHandle("sync-ticket-options-from-github")
  public async syncTicketOptionsFromGithub(@Payload() mode: "merge" | "overwrite"): Promise<TicketQueueOption[]> {
    return await this.store.syncTicketOptionsFromGithub(mode);
  }
}
