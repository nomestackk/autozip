const { shell, contextBridge, ipcRenderer } = require("electron");
const consultarCNPJ = require("consultar-cnpj");
const path = require("path");
const fs = require("fs");

const SETTINGS_FILE = path.join(__dirname, "settings.json");

const api = {};

api.openAppPasswordSite = () => {
  shell.openExternal("https://myaccount.google.com/apppasswords");
};

api.start = (settings, replyFunc) => {
  ipcRenderer.send("start", settings);
  ipcRenderer.on("automation-reply", (event, reply) => {
    replyFunc(reply);
  });
};

api.chooseFolder = (callback) => {
  ipcRenderer.send("open");
  ipcRenderer.on("open-reply", (event, reply) => {
    callback(reply);
  });
};

api.getCNPJ = async (cnpj) => {
  try {
    const empresa = await consultarCNPJ(cnpj);
    return empresa;
  } catch (e) {
    return {};
  }
};

api.saveSettings = (settings) => {
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings));
    return true;
  } catch (e) {
    return false;
  }
};

api.getSettings = () => {
  if (fs.existsSync(SETTINGS_FILE)) {
    const data = fs.readFileSync(SETTINGS_FILE, { encoding: "utf-8" });
    const json = JSON.parse(data);
    return {
      ok: true,
      ...json,
    };
  } else {
    return {
      ok: false,
      error: "Arquivo de configuração não existe.",
    };
  }
};

contextBridge.exposeInMainWorld("api", api);
