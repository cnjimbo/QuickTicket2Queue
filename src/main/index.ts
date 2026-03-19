import type { MicroserviceOptions } from "@nestjs/microservices";
import { ElectronIpcTransport } from "@doubleshot/nest-electron";
import { NestFactory } from "@nestjs/core";
import { app, BrowserWindow, Menu } from "electron";
import { AppModule } from "./app.module";
import { buildMenuTemplate } from "./buildMenuTemplate";
import 'reflect-metadata';
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

const TOP_TOOLBAR_VISIBILITY_CHANNEL = "top-toolbar-visibility-changed";
let showTopToolbar = false;

function broadcastTopToolbarVisibility(visible: boolean): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(TOP_TOOLBAR_VISIBILITY_CHANNEL, visible);
  }
}

async function electronAppInit() {
  const isPackaged = app.isPackaged;
  showTopToolbar = !isPackaged;
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  if (!isPackaged) {
    if (process.platform === "win32") {
      process.on("message", (data) => {
        if (data === "graceful-exit") app.quit();
      });
    } else {
      process.on("SIGTERM", () => {
        app.quit();
      });
    }
  }

  if (!isPackaged) {
    // Build application menu with configurable labels
    const menuTemplate = buildMenuTemplate({
      showTopToolbar,
      onToggleTopToolbar: (visible) => {
        showTopToolbar = visible;
        broadcastTopToolbarVisibility(visible);
      },
    });
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
  } else {
    Menu.setApplicationMenu(null);
  }

  await app.whenReady();
  app.on("browser-window-created", (_, window) => {
    window.webContents.on("did-finish-load", () => {
      window.webContents.send(TOP_TOOLBAR_VISIBILITY_CHANNEL, showTopToolbar);
    });
  });
}

async function bootstrap() {
  try {
    await electronAppInit();

    const nestApp = await NestFactory.createMicroservice<MicroserviceOptions>(
      AppModule,
      {
        strategy: new ElectronIpcTransport("IpcTransport"),
      },
    );

    await nestApp.listen();
  } catch (error) {
    console.log(error);
    app.quit();
  }
}

bootstrap();
