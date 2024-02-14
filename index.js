const { app, BrowserWindow, ipcMain, Tray, Menu } = require("electron");
const { dialog } = require("electron");
const path = require("node:path");
const send = require("./automation");

if (handleSquirrelEvent(app)) {
  return;
}

function handleSquirrelEvent(application) {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require("child_process");
  const path = require("path");

  const appFolder = path.resolve(process.execPath, "..");
  const rootAtomFolder = path.resolve(appFolder, "..");
  const updateDotExe = path.resolve(path.join(rootAtomFolder, "Update.exe"));
  const exeName = path.basename(process.execPath);

  const spawn = function (command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {
        detached: true,
      });
    } catch (error) { }

    return spawnedProcess;
  };

  const spawnUpdate = function (args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case "--squirrel-install":
    case "--squirrel-updated":
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(["--createShortcut", exeName]);

      setTimeout(application.quit, 1000);
      return true;

    case "--squirrel-uninstall":
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(["--removeShortcut", exeName]);

      setTimeout(application.quit, 1000);
      return true;

    case "--squirrel-obsolete":
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      application.quit();
      return true;
  }
}

const createWindow = () => {
  const window = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    icon: path.join(__dirname, "app-icon.png"),
    webPreferences: {
      sandbox: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  window.on("restore", () => {
    window.setSkipTaskbar(false);
  });
  window.on("minimize", () => {
    window.setSkipTaskbar(true);
  });
  window.minimize();
  window.loadFile("index.html");
};

let tray = null;

app.setLoginItemSettings({
  openAtLogin: true
})

app.whenReady().then(() => {
  createWindow();

  tray = new Tray(path.join(__dirname, "icon.png"));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Abrir",
      type: "normal",
      click: () => {
        BrowserWindow.getAllWindows().forEach((window) => window.restore());
      },
    },
    { label: "Sair", type: "normal", role: "quit" },
  ]);

  tray.setContextMenu(contextMenu);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("open", async (event) => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (!canceled) {
    event.reply("open-reply", filePaths[0]);
  }
});

ipcMain.on("start", async (event, settings) => {
  const resposta = await send(settings);
  event.reply("automation-reply", resposta);
});
