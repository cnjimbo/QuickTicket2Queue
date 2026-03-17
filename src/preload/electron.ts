import { ipcRenderer } from 'electron'
import { ipcInvoke } from './auto-gen/electron.ipc-auto'

export default {
  ipcRenderer,
  ...ipcInvoke,
  readCredential: ipcInvoke.readCredential,
  getUpdatePreferences: () =>
    ipcRenderer.invoke("get-update-preferences") as Promise<{
      includeBeta: boolean;
    }>,
  setUpdatePreferences: (preferences: { includeBeta: boolean }) =>
    ipcRenderer.invoke("set-update-preferences", preferences) as Promise<{
      includeBeta: boolean;
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
      };
    }>,
  installDownloadedAppUpdate: () =>
    ipcRenderer.invoke("install-downloaded-app-update") as Promise<boolean>,
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
