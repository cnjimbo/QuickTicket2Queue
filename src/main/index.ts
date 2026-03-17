import type { MicroserviceOptions } from "@nestjs/microservices";
import { ElectronIpcTransport } from "@doubleshot/nest-electron";
import { NestFactory } from "@nestjs/core";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { app, BrowserWindow, dialog, Menu, shell } from "electron";
import { autoUpdater } from "electron-updater";
import { AppModule } from "./app.module";
import { buildMenuTemplate } from "./buildMenuTemplate";
import 'reflect-metadata';
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

const DEFAULT_GITHUB_REPOSITORY = "cnjimbo/QuickTicket2Queue";
const TOP_TOOLBAR_VISIBILITY_CHANNEL = "top-toolbar-visibility-changed";
const ENABLE_DEV_UPDATER = process.env.ELECTRON_ENABLE_DEV_UPDATER === "true";
let showTopToolbar = false;

function broadcastTopToolbarVisibility(visible: boolean): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(TOP_TOOLBAR_VISIBILITY_CHANNEL, visible);
  }
}

function isPortableWindowsBuild(): boolean {
  return process.platform === "win32" && Boolean(process.env.PORTABLE_EXECUTABLE_FILE);
}

type UpdateStrategy = "installer-auto" | "portable-manual";

function resolveUpdateStrategy(): UpdateStrategy {
  if (isPortableWindowsBuild()) {
    return "portable-manual";
  }

  return "installer-auto";
}

function getGitHubReleasesUrl(): string {
  const repository = process.env.GITHUB_REPOSITORY || DEFAULT_GITHUB_REPOSITORY;
  return `https://github.com/${repository}/releases/latest`;
}

function getReleaseMirrorUrls(): string[] {
  const primary = getGitHubReleasesUrl();
  const customMirror = process.env.UPDATE_RELEASE_MIRROR_URL?.trim();

  const mirrors = [
    primary,
    primary.replace("github.com", "cdn.jsdelivr.net/gh"),
    // Common GitHub proxy/mirror endpoints for regions with restricted access.
    `https://ghproxy.com/${primary}`,
    `https://gh.llkk.cc/${primary}`,
  ];

  if (customMirror) {
    mirrors.unshift(customMirror);
  }

  return [...new Set(mirrors)];
}

async function resolveReachableReleaseUrl(): Promise<string> {
  const candidates = getReleaseMirrorUrls();
  const TIMEOUT_MS = 5000;

  // Helper: Execute promise with timeout using Promise.race()
  const withTimeout = <T>(promise: Promise<T>, ms: number): Promise<T> =>
    Promise.race<T>([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
      ),
    ]);

  const fetchTasks = candidates.map((url) =>
    withTimeout(
      fetch(url, { method: "HEAD", redirect: "follow" })
        .then((response) => ({ url, reachable: response.ok })),
      TIMEOUT_MS
    ).catch(() => ({ url, reachable: false }))
  );

  const results = await Promise.allSettled(fetchTasks);

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.reachable) {
      console.log(`[Update] Release URL resolved: ${result.value.url}`);
      return result.value.url;
    }
  }

  console.warn(`[Update] All mirrors unreachable, using primary: ${candidates[0]}`);
  return candidates[0];
}

function setupAutoUpdater() {
  if (!app.isPackaged && !ENABLE_DEV_UPDATER) return;

  if (!app.isPackaged && ENABLE_DEV_UPDATER) {
    const devUpdateConfigPath = join(process.cwd(), "dev-app-update.yml");
    if (!existsSync(devUpdateConfigPath)) {
      console.warn(
        `[Update] Dev updater config not found: ${devUpdateConfigPath}. ` +
        "Create dev-app-update.yml in project root to enable update debugging.",
      );
      return;
    }

    // Required by electron-updater to load dev-app-update.yml in development.
    autoUpdater.updateConfigPath = devUpdateConfigPath;
    autoUpdater.forceDevUpdateConfig = true;
    console.log(
      `[Update] Dev updater mode enabled (ELECTRON_ENABLE_DEV_UPDATER=true), config=${devUpdateConfigPath}`,
    );
  }

  const strategy = resolveUpdateStrategy();
  const isPortableManual = strategy === "portable-manual";
  let releaseUrlPromise: Promise<string> | null = null;
  const getReleaseUrl = () => {
    if (!releaseUrlPromise) {
      releaseUrlPromise = resolveReachableReleaseUrl();
    }
    return releaseUrlPromise;
  };

  autoUpdater.autoDownload = !isPortableManual;
  autoUpdater.autoInstallOnAppQuit = !isPortableManual;

  autoUpdater.on("error", (error) => {
    console.error("Auto update error:", error);
  });

  autoUpdater.on("update-available", async (info) => {
    console.log("Update available:", info.version);

    if (!isPortableManual) return;

    const releasesUrl = await getReleaseUrl();
    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update Available",
      message: `A new version (${info.version}) is available.`,
      detail: "Portable builds do not support in-place auto install. Open release page to download the latest portable package (GitHub/CDN fallback).",
    });

    if (response === 0) {
      await shell.openExternal(releasesUrl);
    }
  });

  autoUpdater.on("update-not-available", () => {
    console.log("No updates available");
  });

  autoUpdater.on("update-downloaded", async () => {
    if (isPortableManual) return;

    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Restart and Install", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update Ready",
      message: "A new version has been downloaded. Restart now to install it?",
    });

    if (response === 0) {
      autoUpdater.quitAndInstall();
    }
  });

  const checkForUpdates = isPortableManual
    ? autoUpdater.checkForUpdates()
    : autoUpdater.checkForUpdatesAndNotify();

  checkForUpdates.catch(async (error) => {
    console.error("Failed to check for updates:", error);

    const releasesUrl = await getReleaseUrl();
    const { response } = await dialog.showMessageBox({
      type: "warning",
      buttons: ["Open Release Page", "Dismiss"],
      defaultId: 0,
      cancelId: 1,
      title: "Update Check Failed",
      message: "Unable to check updates via the default channel.",
      detail: "You can open the release page. If GitHub is unavailable, a CDN mirror will be used automatically.",
    });

    if (response === 0) {
      await shell.openExternal(releasesUrl);
    }
  });
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
