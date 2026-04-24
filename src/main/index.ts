import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import path from 'path'
import fs from 'fs'
import { IPC_CHANNELS } from '../types/index'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    title: 'ToneForge / 音锻',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    show: false
  })

  Menu.setApplicationMenu(null)

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers
ipcMain.handle(IPC_CHANNELS.SAVE_WAV, async (_event, buffer: ArrayBuffer, filePath: string) => {
  try {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(filePath, Buffer.from(buffer))
    return { success: true, filePath }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle(IPC_CHANNELS.SELECT_OUTPUT_DIR, async () => {
  const win = mainWindow ?? BrowserWindow.getFocusedWindow()
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  })
  if (result.canceled || result.filePaths.length === 0) {
    return null
  }
  return result.filePaths[0]
})

ipcMain.handle(IPC_CHANNELS.SAVE_JSON, async (_event, data: string, filePath: string) => {
  try {
    fs.writeFileSync(filePath, data, 'utf-8')
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})

ipcMain.handle(IPC_CHANNELS.LOAD_JSON, async () => {
  try {
    const win = mainWindow ?? BrowserWindow.getFocusedWindow()
    if (!win) return { success: false, error: 'No window available' }
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, error: 'Cancelled' }
    }
    const data = fs.readFileSync(result.filePaths[0], 'utf-8')
    return { success: true, data }
  } catch (error) {
    return { success: false, error: String(error) }
  }
})
