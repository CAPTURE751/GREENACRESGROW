const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');

let mainWindow;

function createLoadingWindow() {
  const loading = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  loading.loadFile(path.join(__dirname, 'loading.html'));
  return loading;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'FarmOS Management',
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // In production, load from built files; in dev, load from Vite dev server
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

app.whenReady().then(() => {
  const loadingWindow = createLoadingWindow();
  const main = createMainWindow();

  main.once('ready-to-show', () => {
    loadingWindow.close();
    main.show();
  });

  // Handle load failure
  main.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    loadingWindow.close();
    dialog.showErrorBox(
      'FarmOS Management - Connection Error',
      `Failed to load the application.\n\nError: ${errorDescription} (${errorCode})\n\nPlease check your internet connection and try again.`
    );
    app.quit();
  });
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});
