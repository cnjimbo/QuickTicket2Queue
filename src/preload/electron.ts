import { ipcRenderer } from 'electron'
import { ipcInvoke } from './auto-gen/electron.ipc-auto'

export default {
  ipcRenderer,
  ...ipcInvoke,
  readCredential: ipcInvoke.readCredential,
  getUpdatePreferences: () =>
    ipcRenderer.invoke("get-update-preferences") as Promise<{
      includeBeta: boolean;
      allowDowngrade: boolean;
      allowAllVersions: boolean;
    }>,
  setUpdatePreferences: (preferences: { includeBeta?: boolean; allowDowngrade?: boolean; allowAllVersions?: boolean }) =>
    ipcRenderer.invoke("set-update-preferences", preferences) as Promise<{
      includeBeta: boolean;
      allowDowngrade: boolean;
      allowAllVersions: boolean;
    }>,
  getAppVersion: () =>
    ipcRenderer.invoke("get-app-version") as Promise<string>,
  checkForAppUpdates: () =>
    ipcRenderer.invoke("check-for-app-updates") as Promise<{
      status: "disabled" | "up-to-date" | "update-available" | "downloaded" | "portable" | "error";
      version?: string;
      releaseUrl?: string;
      message?: string;
      preferences?: {
        includeBeta: boolean;
        allowDowngrade: boolean;
        allowAllVersions: boolean;
      };
    }>,
  downloadAppUpdate: () =>
    ipcRenderer.invoke("download-app-update") as Promise<{
      status: "disabled" | "up-to-date" | "update-available" | "downloaded" | "portable" | "error";
      version?: string;
      releaseUrl?: string;
      message?: string;
      preferences?: {
        includeBeta: boolean;
        allowDowngrade: boolean;
        allowAllVersions: boolean;
      };
    }>,
  getDowngradeVersionOptions: () =>
    ipcRenderer.invoke("get-downgrade-version-options") as Promise<{
      currentVersion: string;
      versions: Array<{
        version: string;
        releaseUrl: string;
        channel: "stable" | "alpha" | "beta" | "rc";
      }>;
      message?: string;
    }>,
  prepareUpdateToVersion: (targetVersion: string) =>
    ipcRenderer.invoke("prepare-update-to-version", targetVersion) as Promise<{
      status: "ready" | "blocked" | "not-found" | "error";
      currentVersion: string;
      targetVersion?: string;
      releaseUrl?: string;
      message?: string;
      preferences?: {
        includeBeta: boolean;
        allowDowngrade: boolean;
        allowAllVersions: boolean;
      };
    }>,
  installDownloadedAppUpdate: () =>
    ipcRenderer.invoke("install-downloaded-app-update") as Promise<boolean>,
  onAppUpdateDownloadProgress: (cb: (progress: {
    percent: number;
    transferred: number;
    total: number;
    bytesPerSecond: number;
  }) => void) => {
    const listener = (...args: [unknown, {
      percent: number;
      transferred: number;
      total: number;
      bytesPerSecond: number;
    }]) => {
      cb(args[1]);
    };
    ipcRenderer.on("app-update-download-progress", listener);
    return () => {
      ipcRenderer.off("app-update-download-progress", listener);
    };
  },
  onAppCloseRequested: (cb: () => void | Promise<void>) => {
    const listener = () => {
      void cb();
    };
    ipcRenderer.on("app-close-requested", listener);
    return () => {
      ipcRenderer.off("app-close-requested", listener);
    };
  },
  respondToAppCloseRequest: (shouldClose: boolean) =>
    ipcRenderer.invoke("confirm-app-close", shouldClose) as Promise<boolean>,
  showNativeDialog: (options: {
    title: string;
    message: string;
    buttons: string[];
    type?: "none" | "info" | "error" | "question" | "warning";
    defaultId?: number;
    cancelId?: number;
    noLink?: boolean;
  }) => ipcRenderer.invoke("show-native-dialog", options) as Promise<number>,
  showNativeConfirmDialog: (options: {
    title: string;
    message: string;
    confirmButtonText: string;
    cancelButtonText: string;
  }) => ipcRenderer.invoke("show-native-confirm-dialog", options) as Promise<boolean>,
  onTopToolbarVisibilityChanged: (cb: (visible: boolean) => void) => {
    const listener = (...args: [unknown, boolean]) => {
      cb(args[1]);
    };
    ipcRenderer.on("top-toolbar-visibility-changed", listener);
    return () => {
      ipcRenderer.off("top-toolbar-visibility-changed", listener);
    };
  },
}
