import type electron from '@/src/preload/electron'
type ElectronBridge = typeof electron

declare global {
  interface Window {
    /**
     * 通过 `window.electron` 访问预加载脚本暴露的 API。
     *
     * @type {ElectronBridge}
     * @memberof Window
     */
    electron: ElectronBridge
    /**
     * 通过 `window.ipcRenderer` 直接访问预加载脚本中封装的 ipcRenderer 方法。
     *
     * @type {ElectronBridge['ipcRenderer']}
     * @memberof Window
     */
    ipcRenderer: ElectronBridge['ipcRenderer']
  }
}

export { }
