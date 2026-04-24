import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../types/index'

contextBridge.exposeInMainWorld('electronAPI', {
  saveWav: (buffer: ArrayBuffer, filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_WAV, buffer, filePath),
  selectOutputDir: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SELECT_OUTPUT_DIR),
  saveJson: (data: string, filePath: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_JSON, data, filePath),
  loadJson: () =>
    ipcRenderer.invoke(IPC_CHANNELS.LOAD_JSON)
})
