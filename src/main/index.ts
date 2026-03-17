import type { MicroserviceOptions } from "@nestjs/microservices";
import { ElectronIpcTransport } from "@doubleshot/nest-electron";
import { NestFactory } from "@nestjs/core";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow, ipcMain, Menu } from "electron";
import Store from "electron-store";
import { autoUpdater, type UpdateInfo } from "electron-updater";
import { AppModule } from "./app.module";
import { buildMenuTemplate } from "./buildMenuTemplate";
import 'reflect-metadata';
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

const DEFAULT_GITHUB_REPOSITORY = "cnjimbo/QuickTicket2Queue";
const TOP_TOOLBAR_VISIBILITY_CHANNEL = "top-toolbar-visibility-changed";
const ENABLE_DEV_UPDATER = process.env.ELECTRON_ENABLE_DEV_UPDATER === "true";
const CHECK_FOR_APP_UPDATES_CHANNEL = "check-for-app-updates";
const DOWNLOAD_APP_UPDATE_CHANNEL = "download-app-update";
const INSTALL_DOWNLOADED_APP_UPDATE_CHANNEL = "install-downloaded-app-update";
const GET_UPDATE_PREFERENCES_CHANNEL = "get-update-preferences";
const SET_UPDATE_PREFERENCES_CHANNEL = "set-update-preferences";
let showTopToolbar = false;

type UpdatePreferences = {
  includeBeta: boolean;
};

type ManualUpdateResult = {
  status: "disabled" | "up-to-date" | "update-available" | "downloaded" | "portable" | "error";
  version?: string;
  releaseUrl?: string;
  message?: string;
  preferences?: UpdatePreferences;
};

let availableUpdateInfo: UpdateInfo | null = null;
let downloadedUpdateInfo: UpdateInfo | null = null;
const updatePreferencesStore = new Store<UpdatePreferences>({
  name: "update-preferences",
  defaults: {
    includeBeta: false,
  },
});

function broadcastTopToolbarVisibility(visible: boolean): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(TOP_TOOLBAR_VISIBILITY_CHANNEL, visible);
  }
}

function isPortableWindowsBuild(): boolean {
  return process.platform === "win32" && Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
}

function getUpdatePreferences(): UpdatePreferences {
  return {
    includeBeta: updatePreferencesStore.get("includeBeta", false),
  };
}

function applyUpdatePreferences(preferences = getUpdatePreferences()): UpdatePreferences {
  autoUpdater.allowPrerelease = preferences.includeBeta;
  autoUpdater.channel = preferences.includeBeta ? "beta" : "latest";
  return preferences;
}

function updateReleaseStateForPreferenceChange(): void {
  availableUpdateInfo = null;
  downloadedUpdateInfo = null;
}

function getGitHubReleasesUrl(includeBeta = getUpdatePreferences().includeBeta): string {
  const repository = process.env.GITHUB_REPOSITORY || DEFAULT_GITHUB_REPOSITORY;
  return includeBeta
    ? `https://github.com/${repository}/releases`
    : `https://github.com/${repository}/releases/latest`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

async function handleCheckForAppUpdates(): Promise<ManualUpdateResult> {
  const preferences = applyUpdatePreferences();

  if (!app.isPackaged && !ENABLE_DEV_UPDATER) {
    return {
      status: "disabled",
      message: "自动更新仅在打包环境或开发调试开关启用时可用。",
      releaseUrl: getGitHubReleasesUrl(preferences.includeBeta),
      preferences,
    };
  }

  try {
    const result = await autoUpdater.checkForUpdates();
    const updateInfo = result?.updateInfo ?? availableUpdateInfo;
    const currentVersion = app.getVersion();

    if (!updateInfo || updateInfo.version === currentVersion) {
      availableUpdateInfo = null;
      downloadedUpdateInfo = null;
      return {
        status: "up-to-date",
        version: currentVersion,
        releaseUrl: getGitHubReleasesUrl(preferences.includeBeta),
        preferences,
      };
    }

    availableUpdateInfo = updateInfo;

    if (isPortableWindowsBuild()) {
      return {
        status: "portable",
        version: updateInfo.version,
        releaseUrl: getGitHubReleasesUrl(preferences.includeBeta),
        preferences,
      };
    }

    if (downloadedUpdateInfo?.version === updateInfo.version) {
      return {
        status: "downloaded",
        version: updateInfo.version,
        releaseUrl: getGitHubReleasesUrl(preferences.includeBeta),
        preferences,
      };
    }

    return {
      status: "update-available",
      version: updateInfo.version,
      releaseUrl: getGitHubReleasesUrl(preferences.includeBeta),
      preferences,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Failed to check for updates:", error);
    return {
      status: "error",
      message,
      releaseUrl: getGitHubReleasesUrl(preferences.includeBeta),
      preferences,
    };
  }
}

async function handleDownloadAppUpdate(): Promise<ManualUpdateResult> {
  const preferences = applyUpdatePreferences();

  if (isPortableWindowsBuild()) {
    return {
      status: "portable",
      version: availableUpdateInfo?.version,
      releaseUrl: getGitHubReleasesUrl(preferences.includeBeta),
      preferences,
    };
  }

  try {
    if (!availableUpdateInfo) {
      const checkResult = await handleCheckForAppUpdates();
      if (checkResult.status !== "update-available" && checkResult.status !== "downloaded") {
        return checkResult;
      }
    }

    if (!availableUpdateInfo) {
      return {
        status: "up-to-date",
        version: app.getVersion(),
        releaseUrl: getGitHubReleasesUrl(preferences.includeBeta),
        preferences,
      };
    }

    await autoUpdater.downloadUpdate();
    downloadedUpdateInfo = availableUpdateInfo;

    return {
      status: "downloaded",
      version: downloadedUpdateInfo.version,
      releaseUrl: getGitHubReleasesUrl(preferences.includeBeta),
      preferences,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("Failed to download update:", error);
    return {
      status: "error",
      message,
      version: availableUpdateInfo?.version,
      releaseUrl: getGitHubReleasesUrl(preferences.includeBeta),
      preferences,
    };
  }
}

async function handleGetUpdatePreferences(): Promise<UpdatePreferences> {
  return getUpdatePreferences();
}

async function handleSetUpdatePreferences(
  _event: Electron.IpcMainInvokeEvent,
  partialPreferences: Partial<UpdatePreferences> | undefined,
): Promise<UpdatePreferences> {
  const nextPreferences: UpdatePreferences = {
    includeBeta: Boolean(partialPreferences?.includeBeta),
  };

  updatePreferencesStore.set(nextPreferences);
  applyUpdatePreferences(nextPreferences);
  updateReleaseStateForPreferenceChange();
  return nextPreferences;
}

async function handleInstallDownloadedAppUpdate(): Promise<boolean> {
  if (!downloadedUpdateInfo || isPortableWindowsBuild()) {
    return false;
  }

  setImmediate(() => {
    autoUpdater.quitAndInstall();
  });

  return true;
}

function setupAutoUpdater() {
  // Configure dev-app-update.yml path for development if available
  if (!app.isPackaged && ENABLE_DEV_UPDATER) {
    const devUpdateConfigPath = join(process.cwd(), "dev-app-update.yml");
    if (!existsSync(devUpdateConfigPath)) {
      console.warn(
        `[Update] Dev updater config not found: ${devUpdateConfigPath}. ` +
        "Create dev-app-update.yml in project root to enable update debugging.",
      );
    } else {
      // Required by electron-updater to load dev-app-update.yml in development.
      autoUpdater.updateConfigPath = devUpdateConfigPath;
      autoUpdater.forceDevUpdateConfig = true;
      console.log(
        `[Update] Dev updater mode enabled (ELECTRON_ENABLE_DEV_UPDATER=true), config=${devUpdateConfigPath}`,
      );
    }
  }

  // Always apply preferences and set autoUpdater options
  applyUpdatePreferences();
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  autoUpdater.on("error", (error) => {
    console.error("Auto update error:", error);
  });

  autoUpdater.on("update-available", (info) => {
    availableUpdateInfo = info;
    downloadedUpdateInfo = null;
    console.log("Update available:", info.version);
  });

  autoUpdater.on("update-not-available", () => {
    availableUpdateInfo = null;
    downloadedUpdateInfo = null;
    console.log("No updates available");
  });

  autoUpdater.on("update-downloaded", (info) => {
    downloadedUpdateInfo = info;
    availableUpdateInfo = info;
    console.log("Update downloaded:", info.version);
  });

  // Always register IPC handlers, even in development mode
  ipcMain.handle(CHECK_FOR_APP_UPDATES_CHANNEL, handleCheckForAppUpdates);
  ipcMain.handle(DOWNLOAD_APP_UPDATE_CHANNEL, handleDownloadAppUpdate);
  ipcMain.handle(INSTALL_DOWNLOADED_APP_UPDATE_CHANNEL, handleInstallDownloadedAppUpdate);
  ipcMain.handle(GET_UPDATE_PREFERENCES_CHANNEL, handleGetUpdatePreferences);
  ipcMain.handle(SET_UPDATE_PREFERENCES_CHANNEL, handleSetUpdatePreferences);
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
  setupAutoUpdater();
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
