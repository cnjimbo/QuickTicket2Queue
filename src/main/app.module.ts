import { join } from "node:path";
import { ElectronModule } from "@doubleshot/nest-electron";
import { Module } from "@nestjs/common";
import { app, BrowserWindow, ipcMain } from "electron";
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

const APP_CLOSE_REQUESTED_CHANNEL = "app-close-requested";
const CONFIRM_APP_CLOSE_CHANNEL = "confirm-app-close";

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

        ipcMain.handle(CONFIRM_APP_CLOSE_CHANNEL, handleConfirmAppClose);

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
  providers: [AppService, AppServiceOS, AppServiceTicket, AppServiceCredential, AppServiceTicketHistory, AppServiceTicketOptions, AppServiceStore],
})
export class AppModule { }
