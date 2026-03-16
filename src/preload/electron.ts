import { ipcRenderer } from 'electron'
import { ipcInvoke } from './auto-gen/electron.ipc-auto'

export default {
  ipcRenderer,
  ...ipcInvoke,
  readCredential: ipcInvoke.readCredential,
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
