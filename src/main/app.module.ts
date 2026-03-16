import { join } from "node:path";
import { ElectronModule } from "@doubleshot/nest-electron";
import { Module } from "@nestjs/common";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AppControllerCredential } from "./app.controller.credential";
import { AppControllerTicket } from "./app.controller.ticket";
import { AppServiceTicket } from "./app.service.ticket";
import { AppServiceOS } from "./app.service.os";
import { AppServiceStore } from "./app.service.store";
import { AppServiceCredential } from "./app.service.credential";
import { AppServiceTicketHistory } from "./app.service.ticket-history";
import { AppServiceTicketOptions } from "./app.service.ticket-options";
import { AppServiceHttp } from "./app.service.http";

const APP_CLOSE_REQUESTED_CHANNEL = "app-close-requested";
const CONFIRM_APP_CLOSE_CHANNEL = "confirm-app-close";
const SHOW_NATIVE_CONFIRM_DIALOG_CHANNEL = "show-native-confirm-dialog";
const SHOW_NATIVE_DIALOG_CHANNEL = "show-native-dialog";

@Module({
  imports: [
    ElectronModule.registerAsync({
      useFactory: async () => {
        const isPackaged = app.isPackaged;
        const devIconPath = join(process.cwd(), "logo.png");
        let allowWindowClose = false;
        let closeRequestPending = false;
        const win = new BrowserWindow({
          width: 1280,
          height: 1024,
          autoHideMenuBar: isPackaged,
          icon: !isPackaged ? devIconPath : undefined,
          webPreferences: {
            contextIsolation: true,
            preload: join(__dirname, "../preload/index.js"),
          },
        });

        if (isPackaged) {
          win.removeMenu();
        }

        const handleConfirmAppClose = async (
          event: Electron.IpcMainInvokeEvent,
          shouldClose: boolean,
        ) => {
          if (event.sender !== win.webContents) {
            return false;
          }

          closeRequestPending = false;

          if (!shouldClose || win.isDestroyed()) {
            return false;
          }

          allowWindowClose = true;
          win.close();
          return true;
        };

        const handleShowNativeConfirmDialog = async (
          event: Electron.IpcMainInvokeEvent,
          options: {
            title: string;
            message: string;
            confirmButtonText: string;
            cancelButtonText: string;
          },
        ) => {
          if (event.sender !== win.webContents || win.isDestroyed()) {
            return false;
          }

          const { response } = await dialog.showMessageBox(win, {
            type: "warning",
            title: options.title,
            message: options.message,
            buttons: [options.confirmButtonText, options.cancelButtonText],
            defaultId: 0,
            cancelId: 1,
            noLink: true,
          });

          return response === 0;
        };

        const handleShowNativeDialog = async (
          event: Electron.IpcMainInvokeEvent,
          options: {
            title: string;
            message: string;
            buttons: string[];
            type?: "none" | "info" | "error" | "question" | "warning";
            defaultId?: number;
            cancelId?: number;
            noLink?: boolean;
          },
        ) => {
          if (event.sender !== win.webContents || win.isDestroyed()) {
            return 0;
          }

          const { response } = await dialog.showMessageBox(win, {
            type: options.type ?? "question",
            title: options.title,
            message: options.message,
            buttons: options.buttons,
            defaultId: options.defaultId,
            cancelId: options.cancelId,
            noLink: options.noLink ?? true,
          });

          return response;
        };

        ipcMain.handle(CONFIRM_APP_CLOSE_CHANNEL, handleConfirmAppClose);
        ipcMain.handle(SHOW_NATIVE_CONFIRM_DIALOG_CHANNEL, handleShowNativeConfirmDialog);
        ipcMain.handle(SHOW_NATIVE_DIALOG_CHANNEL, handleShowNativeDialog);

        win.on("close", (event) => {
          if (allowWindowClose || win.isDestroyed()) {
            return;
          }

          if (win.webContents.isLoadingMainFrame()) {
            return;
          }

          event.preventDefault();

          if (closeRequestPending) {
            return;
          }

          closeRequestPending = true;
          win.webContents.send(APP_CLOSE_REQUESTED_CHANNEL);
        });

        win.on("closed", () => {
          closeRequestPending = false;
          ipcMain.removeHandler(CONFIRM_APP_CLOSE_CHANNEL);
          ipcMain.removeHandler(SHOW_NATIVE_CONFIRM_DIALOG_CHANNEL);
          ipcMain.removeHandler(SHOW_NATIVE_DIALOG_CHANNEL);

          if (!win.isDestroyed()) {
            win.destroy();
          }
        });

        const URL = !isPackaged
          ? process.env.DS_RENDERER_URL
          : `file://${join(app.getAppPath(), "dist/render/index.html#/")}`;

        win.loadURL(URL!);

        return { win };
      },
    }),
  ],
  controllers: [AppController, AppControllerCredential, AppControllerTicket],
  providers: [AppService, AppServiceOS, AppServiceHttp, AppServiceTicket, AppServiceCredential, AppServiceTicketHistory, AppServiceTicketOptions, AppServiceStore],
})
export class AppModule { }
