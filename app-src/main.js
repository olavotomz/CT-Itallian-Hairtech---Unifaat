// Arquivo principal do Electron - ponto de entrada do aplicativo desktop
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

// Variáveis globais para manter referências
let mainWindow; // Janela principal do aplicativo
let httpServer; // Servidor Express local

// Função que cria e configura a janela do aplicativo
function createWindow() {
  // Define os caminhos necessários
  const projetoRaiz = path.resolve(__dirname, '..');
  const dataDir = path.join(projetoRaiz, 'data');
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch {} // Cria pasta de dados se não existir
  const dbPath = path.join(dataDir, 'data.db');
  process.env.SQLITE_DB_PATH = dbPath; // Define variável de ambiente para o banco de dados

  // Importa e inicializa o servidor Express
  const expressApp = require('./src/server');

  // Cria a janela principal do Electron
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
    show: false, // Não mostra a janela até que esteja pronta
    backgroundColor: '#0f172a',
    fullscreen: false,
    fullscreenable: true,
    icon: path.join(__dirname, 'public', 'itallian.ico'), // Ícone do aplicativo
    webPreferences: {
      nodeIntegration: false, // Segurança: não permite acesso direto ao Node.js no frontend
      contextIsolation: true,
      webSecurity: false
    }
  });

  // Quando a janela estiver pronta, mostra e maximiza
  mainWindow.once('ready-to-show', () => {
    try {
      mainWindow.show();
      mainWindow.maximize();
      mainWindow.setFullScreen(true);
    } catch (e) {}
  });


  // Remove o menu padrão do sistema
  Menu.setApplicationMenu(null);
  mainWindow.setMenuBarVisibility(false);

  // Configura e inicia o servidor Express na porta 3000
  const serverPort = 3000;
  const serverUrl = `http://localhost:${serverPort}`;

  httpServer = expressApp.listen(serverPort, () => {
    console.log(`Servidor Express rodando em ${serverUrl}`);
    mainWindow.loadURL(serverUrl); // Carrega o servidor na janela do Electron
  });

  // Quando a janela for fechada, limpa as referências
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (httpServer) {
      httpServer.close(() => {
        console.log('Servidor Express fechado.');
      });
    }
  });
}

// Evento: Electron está pronto para criar janelas
app.on('ready', createWindow);

// Evento: Todas as janelas foram fechadas
app.on('window-all-closed', () => {
  // No macOS, é comum manter o app aberto até que o usuário feche explicitamente
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Evento: Aplicativo foi ativado (macOS)
app.on('activate', () => {
  // Recria a janela se não houver nenhuma aberta
  if (mainWindow === null) {
    createWindow();
  }
});
