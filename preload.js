const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  closeApp: () => ipcRenderer.send("close-app"),
  startDrag: (cursor) => ipcRenderer.send("pet-drag-start", cursor),
  endDrag: () => ipcRenderer.send("pet-drag-end"),
  getPointer: () => ipcRenderer.invoke("get-pointer")
});
