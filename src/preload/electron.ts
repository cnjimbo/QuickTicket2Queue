import { ipcRenderer } from 'electron'
import { ipcInvoke } from './auto-gen/electron.ipc-auto'

export default {
  ipcRenderer,
  ...ipcInvoke,
  sendMsg: ipcInvoke.msg,
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
  onTopToolbarVisibilityChanged: (cb: (visible: boolean) => void) => {
    const listener = (...args: [unknown, boolean]) => {
      cb(args[1]);
    };
    ipcRenderer.on("top-toolbar-visibility-changed", listener);
    return () => {
      ipcRenderer.off("top-toolbar-visibility-changed", listener);
    };
  },
  onReplyMsg: (cb: (msg: string) => void) => ipcRenderer.on('reply-msg', (...args: [unknown, string]) => {
    cb(args[1])
  }),
}
