const { app, BrowserWindow } = require("electron");
const path = require("path");

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    backgroundColor: "#121212", // 👈 prevents black flash
    webPreferences: {
      contextIsolation: true
    }
  });

  // 🔥 FORCE DEVTOOLS (so we SEE errors)
  win.webContents.openDevTools();

  // ✅ LOAD VITE DEV SERVER
  win.loadURL("http://127.0.0.1:5173");

  win.on("closed", () => {
    win = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

