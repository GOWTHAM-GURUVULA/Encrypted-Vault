const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  apiBaseUrl: ipcRenderer.sendSync("config:getApiBaseUrl"),
  selectFile: () => ipcRenderer.invoke("dialog:openFile"),
  openFile: (fileName) => ipcRenderer.invoke("file:openNative", fileName),
  getPathForFile: (file) => webUtils.getPathForFile(file),
  copyText: (text) => ipcRenderer.invoke("clipboard:writeText", text),
});
