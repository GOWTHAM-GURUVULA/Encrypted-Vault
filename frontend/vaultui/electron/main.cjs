const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage, clipboard } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

let win;
let backendProcess;

const DEV_SERVER_URL = "http://127.0.0.1:5173";

function resolveProjectRoot() {
  return path.resolve(app.getAppPath(), "..", "..");
}

function resolveBackendDir() {
  return path.join(resolveProjectRoot(), "backend");
}

function resolveBackendExecutable() {
  return path.join(process.resourcesPath, "backend", "app.exe");
}

function resolveDistHtml() {
  return path.join(app.getAppPath(), "dist", "index.html");
}

function resolvePythonCommand() {
  return process.platform === "win32" ? "python" : "python3";
}

function directoryHasVaultData(dirPath) {
  return fs.existsSync(path.join(dirPath, "vault.enc")) || fs.existsSync(path.join(dirPath, "vault_plain"));
}

function migrateVaultDataIfNeeded(sourceDir, targetDir) {
  if (!fs.existsSync(sourceDir) || directoryHasVaultData(targetDir)) {
    return;
  }

  if (!directoryHasVaultData(sourceDir)) {
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });
  fs.cpSync(sourceDir, targetDir, {
    recursive: true,
    force: false,
  });
}

function resolveVaultDataDir() {
  const canonicalDataDir = path.join(app.getPath("appData"), "encrypted-vault", "vault-data");
  const legacyDataDir = path.join(app.getPath("appData"), "EncryptedVault");

  migrateVaultDataIfNeeded(legacyDataDir, canonicalDataDir);
  fs.mkdirSync(canonicalDataDir, { recursive: true });

  return canonicalDataDir;
}

function getApiPort() {
  return app.isPackaged ? 8000 : 8010;
}

function getApiBaseUrl() {
  return `http://127.0.0.1:${getApiPort()}/vault`;
}

function waitForUrl(url, timeoutMs = 15000) {
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const tryRequest = () => {
      const request = http.get(url, (response) => {
        response.resume();
        resolve(true);
      });

      request.on("error", () => {
        if (Date.now() - startedAt >= timeoutMs) {
          resolve(false);
          return;
        }

        setTimeout(tryRequest, 500);
      });
    };

    tryRequest();
  });
}

async function startBackend() {
  const apiHealthUrl = `${getApiBaseUrl()}/files`;
  const backendReady = await waitForUrl(apiHealthUrl, 1000);
  if (backendReady) {
    return;
  }

  const backendEnv = {
    ...process.env,
    ENCRYPTED_VAULT_DATA_DIR: resolveVaultDataDir(),
    ENCRYPTED_VAULT_PORT: String(getApiPort()),
  };

  if (app.isPackaged) {
    const backendExecutable = resolveBackendExecutable();

    if (!fs.existsSync(backendExecutable)) {
      throw new Error(`Packaged backend not found: ${backendExecutable}`);
    }

    backendProcess = spawn(backendExecutable, [], {
      stdio: "ignore",
      windowsHide: true,
      env: backendEnv,
    });
  } else {
    const backendDir = resolveBackendDir();
    backendProcess = spawn(resolvePythonCommand(), ["app.py"], {
      cwd: backendDir,
      stdio: "ignore",
      windowsHide: true,
      env: backendEnv,
    });
  }

  backendProcess.on("exit", () => {
    backendProcess = undefined;
  });

  const started = await waitForUrl(apiHealthUrl, 15000);
  if (!started) {
    throw new Error(`Backend API did not start on ${getApiBaseUrl()}.`);
  }
}

function getVaultFilePath(fileName) {
  const primaryPath = path.join(resolveVaultDataDir(), "vault_plain", fileName);

  if (fs.existsSync(primaryPath)) {
    return primaryPath;
  }

  const fallbackPath = path.join(resolveBackendDir(), "vault_plain", fileName);

  if (fs.existsSync(fallbackPath)) {
    return fallbackPath;
  }

  return null;
}

function createPreviewCopy(sourcePath) {
  const previewDir = path.join(app.getPath("temp"), "encrypted-vault-preview");
  fs.mkdirSync(previewDir, { recursive: true });

  const parsed = path.parse(sourcePath);
  const previewName = `${parsed.name}-${Date.now()}${parsed.ext}`;
  const previewPath = path.join(previewDir, previewName);
  fs.copyFileSync(sourcePath, previewPath);
  return previewPath;
}

async function createWindow() {
  // Use nativeImage to bypass icon loading/caching issues
  const iconPath = path.join(__dirname, "vault.ico");
  const image = nativeImage.createFromPath(iconPath);

  win = new BrowserWindow({
    width: 1100,
    height: 800,
    backgroundColor: "#121212",
    icon: image, 
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setMenu(null); 

  await startBackend();

  const devServerReady = !app.isPackaged && await waitForUrl(DEV_SERVER_URL, 2000);
  if (devServerReady) {
    await win.loadURL(DEV_SERVER_URL);
    return;
  }

  const distHtml = resolveDistHtml();
  if (fs.existsSync(distHtml)) {
    await win.loadFile(distHtml);
    return;
  }

  throw new Error("Frontend is not available. Start Vite or build the app first.");
}

// IPC HANDLERS (Your working logic)
ipcMain.handle("file:openNative", async (event, fileName) => {
  const filePath = getVaultFilePath(fileName);

  if (!filePath) {
    return { success: false, error: "File not found." };
  }

  try {
    const previewPath = createPreviewCopy(filePath);
    const openError = await shell.openPath(previewPath);

    if (openError) {
      return { success: false, error: openError };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error.message || "Failed to open file preview.",
    };
  }
});

ipcMain.handle("dialog:openFile", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({ 
    properties: ["openFile"] 
  });
  return canceled ? null : filePaths[0];
});

ipcMain.handle("clipboard:writeText", async (event, text) => {
  clipboard.writeText(text || "");
  return { success: true };
});

ipcMain.on("config:getApiBaseUrl", (event) => {
  event.returnValue = getApiBaseUrl();
});

// App Lifecycle
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill();
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
