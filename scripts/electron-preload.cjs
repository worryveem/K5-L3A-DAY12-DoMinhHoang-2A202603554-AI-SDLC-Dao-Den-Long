const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("lanternHost", {
  config: () => ipcRenderer.invoke("config"),
  firstFrame: () => ipcRenderer.invoke("first-frame"),
  complete: (data) => ipcRenderer.invoke("complete", data),
  capture: (label) =>
    new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    ).then(() => ipcRenderer.invoke("capture", label)),
});
