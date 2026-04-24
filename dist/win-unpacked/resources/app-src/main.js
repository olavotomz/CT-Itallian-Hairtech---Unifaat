const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let expressServer;
let server;

function createWindow() {
  const dataDir = path.join(process.resourcesPath, 'data');
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch {}
  const dbPath = path.join(dataDir, 'data.db');
  process.env.SQLITE_DB_PATH = dbPath;

  server = require('./src/server'); 

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    fullscreen: true,
    fullscreenable: true,
    icon: path.join(__dirname, 'public', 'itallian.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  try { mainWindow.setFullScreenable(true); } catch (e) {}
  mainWindow.once('ready-to-show', () => {
    try {
      mainWindow.show();
      mainWindow.maximize();
      mainWindow.setFullScreen(true);
    } catch (e) {}
  });
  mainWindow.webContents.on('did-finish-load', () => {
    try { mainWindow.setFullScreen(true); } catch (e) {}
  });

  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);

  const serverPort = 3000; 
  const serverUrl = `http://localhost:${serverPort}`;

  expressServer = server.listen(serverPort, () => {
    console.log(`Servidor Express rodando em ${serverUrl}`);
    mainWindow.loadURL(serverUrl);
    try { mainWindow.setFullScreen(true); } catch (e) {}
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (expressServer) {
      expressServer.close(() => {
        console.log('Servidor Express fechado.');
      });
    }
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
