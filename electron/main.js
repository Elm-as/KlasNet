const { app, BrowserWindow } = require('electron');
const path = require('path');


function createWindow() {
  // Use app.isPackaged to reliably detect production build
  const isDev = !app.isPackaged && (process.env.NODE_ENV !== 'production');
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // will show when ready
    autoHideMenuBar: true,
    // use a relative icon path bundled with the app (falls back gracefully if missing)
    icon: path.join(__dirname, '..', 'assets', 'icon_chatgpt.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: isDev
    }
  });

  // Masquer la barre de menu
  win.setMenuBarVisibility(false);

  // Create a small splash window
  const splash = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    show: false
  });

  // Load splash content (dev vs prod)
  if (isDev) {
    const splashUrl = 'http://localhost:5173/splash.html';
    splash.loadURL(splashUrl).catch(() => {});
  } else {
    const splashPath = path.join(__dirname, 'splash.html');
    splash.loadFile(splashPath).catch(() => {});
  }

  splash.once('ready-to-show', () => splash.show());

  const whenReadyToShowMain = () => {
    // show main window and close splash
    win.show();
    if (!splash.isDestroyed()) splash.close();
  };

  if (isDev) {
    // In dev point to vite dev server
    win.loadURL('http://localhost:5173').then(() => {
      whenReadyToShowMain();
      win.webContents.openDevTools();
    }).catch(err => {
      console.error('Erreur lors du chargement dev URL:', err);
      whenReadyToShowMain();
    });
  } else {
    // In production, load the built index.html
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexPath).then(() => {
      whenReadyToShowMain();
    }).catch(err => {
      console.error('Erreur lors du chargement du fichier index:', err);
      try {
        const fallback = path.join(__dirname, '..', 'dist', 'index.html');
        win.loadFile(fallback).then(() => whenReadyToShowMain()).catch(() => whenReadyToShowMain());
      } catch (e) {
        console.error('Fallback load failed:', e);
        whenReadyToShowMain();
      }
    });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
