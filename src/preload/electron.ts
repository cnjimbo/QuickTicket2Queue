import { ipcRenderer } from 'electron'
import { ipcInvoke } from './auto-gen/electron.ipc-auto'

export default {
  ipcRenderer,
  ...ipcInvoke,
  sendMsg: ipcInvoke.msg,
  readCredential: ipcInvoke.readCredential,
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
