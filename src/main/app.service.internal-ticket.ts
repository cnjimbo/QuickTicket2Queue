import { Injectable } from "@nestjs/common";
import { BrowserWindow } from "electron";

import type { CredentialItem, TicketResponse, TicketType } from "@/types/orm_types";
import { AppServiceStore } from "./app.service.store";
import { AppServiceTicket } from "./app.service.ticket";
import type { WebSessionAuth } from "./app.service.ticket";

@Injectable()
export class AppServiceInternalTicket {
    public constructor(
        private readonly store: AppServiceStore,
        private readonly ticketService: AppServiceTicket,
    ) { }

    private isIgnorableNavigationError(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        return /ERR_ABORTED/i.test(error.message) || /\(-3\)/.test(error.message);
    }

    private async openLoginWindowAndExtractSession(
        mainWin: BrowserWindow,
        current: CredentialItem,
    ): Promise<WebSessionAuth> {
        const host = current?.sn_host?.trim() ?? "";
        if (!host) {
            throw new Error("当前环境未配置 sn_host，无法打开网页登录窗口。");
        }

        const normalizedHost = host.replace(/\/$/, "");
        const loginWindow = new BrowserWindow({
            width: 1280,
            height: 900,
            parent: mainWin,
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

            const settleResolve = (result: WebSessionAuth) => {
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

    public async submitInternalTicket(userInput: TicketType, mainWin: BrowserWindow): Promise<TicketResponse> {
        const current = await this.store.getCurrent();
        const sessionAuth = await this.openLoginWindowAndExtractSession(mainWin, current);
        return await this.ticketService.submitTicketViaWebSession(userInput, sessionAuth);
    }
}