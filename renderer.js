/*
--------------------------------------------------------------------------------
  Electron
--------------------------------------------------------------------------------
*/

/**
 * @typedef {Object} ElectronAPI
 * @property {function(): Promise<{ status: number }>} getCNPJ
 * @property {function(): { ok: boolean, name: string, email: string, password: string, contabilidade: string, cnpj: string }} getSettings
 * @property {function(): boolean} saveSettings
 * @property {Promise<string>} chooseFolder
 */

/*
--------------------------------------------------------------------------------
  Elementos
--------------------------------------------------------------------------------
*/

/** @type {HTMLParagraphElement} */
const details = document.querySelector("#details");

/** @type {HTMLDivElement} */
const statusSection = document.querySelector(".status");

/** @type {HTMLDivElement} */
const settingsSection = document.querySelector(".settings");

/** @type {HTMLHeadingElement} */
const statusDisplay = document.querySelector("#status-display");

/** @type {HTMLDivElement} */
const errorMessage = document.querySelector("#error-message");

/** @type {HTMLButtonElement} */
const settingsButton = document.querySelector("#btn-settings");

/** @type {HTMLButtonElement} */
const submitSettings = document.querySelector("#submit-settings");

/** @type {HTMLInputElement} */
const nameInput = document.querySelector("#name");

/** @type {HTMLInputElement} */
const emailInput = document.querySelector("#email");

/** @type {HTMLInputElement} */
const passwordInput = document.querySelector("#password");

/** @type {HTMLInputElement} */
const contabilidadeInput = document.querySelector("#contabilidade");

/** @type {HTMLInputElement} */
const cnpjInput = document.querySelector("#cnpj");

/** @type {HTMLButtonElement} */
const chooseVendasFolder = document.querySelector("#vendas-folder");

/** @type {HTMLButtonElement} */
const chooseCanceladosFolder = document.querySelector("#cancelados-folder");

/** @type {HTMLAnchorElement} */
const appSettingsLink = document.querySelector("#app-settings-link");

/** @type {HTMLButtonElement} */
const restart = document.querySelector("#restart");

/*
--------------------------------------------------------------------------------
  Váriaveis
--------------------------------------------------------------------------------
*/

let currentSection = "status";
let cnpjValido = false;
let pastaVendas;
let pastaCancelados;

/*
--------------------------------------------------------------------------------
  Ajudantes
--------------------------------------------------------------------------------
*/

/**
 * Verifica se o email passado é válido ou não.
 * @param {String} email Email para ser válidado.
 * @returns {Boolean} O resultado da válidação.
 */
const validateEmail = (email) => {
  const regex = /\S+@\S+\.\S+/;
  return regex.test(email);
};

/**
 * Muda o valor da mensagem de erro na seção de configurações.
 * @param {string} error Mensagem de erro.
 */
function setSettingsError(error) {
  if (error === undefined || error === "") {
    errorMessage.style.display = "none";
    return;
  }
  errorMessage.style.display = "block";
  errorMessage.textContent = error;
}

/**
 * Retorna verdadeiro se o CNPJ que está dentro do input for válido.
 * @returns {Boolean}
 * @async
 */
async function getCNPJ() {
  const cnpj = cnpjInput.value;
  const response = await api.getCNPJ(cnpj);
  if (response) {
    if (response.status == 400) {
      setSettingsError(response.titulo);
      return false;
    } else if (response.status == 429) {
      setSettingsError(response.titulo);
      return false;
    } else {
      setSettingsError();
      return true;
    }
  } else {
    errorMessage.textContent = "CNPJ inexistente.";
    return false;
  }
}

/**
 * Verifica se o objeto "settings" é uma configuração válida, retorna um objeto.
 * Sendo "ok" o resultado dessa verificação e "message" uma mensagem adicional.
 * @param {Object} settings
 * @returns {{ ok: boolean, message: string }}
 * @async
 */
async function isSettingsValid(settings) {
  const blank =
    settings.name !== "" &&
    settings.email !== "" &&
    settings.password !== "" &&
    settings.contabilidade !== "" &&
    settings.cnpj !== "";

  if (!blank) return { ok: false, message: "Preencher configuração." };

  if (pastaVendas === undefined)
    return { ok: false, message: "Pasta de vendas inválida." };

  if (pastaCancelados === undefined)
    return { ok: false, message: "Pasta de cancelamentos inválida." };

  if (!validateEmail(settings.email))
    return { ok: false, message: "e-mail do cliente inválido." };

  if (!validateEmail(settings.contabilidade))
    return { ok: false, message: "e-mail do destinatário inválido." };

  const valid = await getCNPJ();
  if (!valid) return { ok: false, message: "CNPJ inválido ou inexistente." };
  return { ok: true, message: "" };
}

appSettingsLink.addEventListener("click", (event) => {
  event.preventDefault();
  api.openAppPasswordSite();
});

submitSettings.addEventListener("click", async () => {
  const name = nameInput.value;
  const email = emailInput.value;
  const password = passwordInput.value;
  const contabilidade = contabilidadeInput.value;
  const cnpj = cnpjInput.value;
  const settings = {
    name,
    email,
    password,
    contabilidade,
    cnpj,
    pastaVendas,
    pastaCancelados,
  };
  const response = await isSettingsValid(settings);
  if (response.ok) {
    api.saveSettings(settings);
    currentSection = "status";
    renderCurrentSection();
  } else {
    setSettingsError(response.message);
  }
});

const startApp = () => {
  const settings = api.getSettings();
  const replyCallback = (response) => {
    if (!response.ok) {
      setStatusError(response.message);
    }
  };

  api.start(
    settings.ok
      ? {
          name: settings.name,
          email: settings.email,
          password: settings.password,
          contabilidade: settings.contabilidade,
          cnpj: settings.cnpj,
          pastaVendas: settings.pastaVendas,
          pastaCancelados: settings.pastaCancelados,
        }
      : null,
    replyCallback
  );
};

chooseVendasFolder.addEventListener("click", () => {
  api.chooseFolder((pasta) => {
    pastaVendas = pasta;
  });
});

chooseCanceladosFolder.addEventListener("click", () => {
  api.chooseFolder((pasta) => {
    pastaCancelados = pasta;
  });
});

settingsButton.addEventListener("click", () => {
  currentSection = "settings";
  renderCurrentSection();
});

/**
 * Modifica o texto da mensagem de erro.
 * @param {string} error Mensagem de erro.
 */
const setStatusError = (error) => {
  details.textContent = error;
  statusDisplay.textContent = "Desativado";
  statusDisplay.style.background = "rgba(255, 0, 0, 0.5)";
};

const setStatusSuccess = () => {
  details.textContent = "O aplicativo está sendo executado normalmente.";
  statusDisplay.textContent = "Ativado";
  statusDisplay.style.background = "rgba(0, 255, 0, 0.5)";
};

/**
 * Atualiza a seção de status.
 */
const renderStatusSection = async () => {
  setStatusSuccess();
};

/**
 * Atualiza a seção de configurações.
 */
const renderSettingsSection = () => {
  const configuracoes = api.getSettings();
  setSettingsError();
  if (configuracoes.ok) {
    nameInput.value = configuracoes.name;
    emailInput.value = configuracoes.email;
    passwordInput.value = configuracoes.password;
    contabilidadeInput.value = configuracoes.contabilidade;
    cnpjInput.value = configuracoes.cnpj;
    pastaVendas = configuracoes.pastaVendas;
    pastaCancelados = configuracoes.pastaCancelados;
  }
};

// Renders the current section

const renderCurrentSection = () => {
  if (currentSection === "status") {
    settingsSection.style.display = "none";
    statusSection.style.display = "flex";
    renderStatusSection();
  } else {
    statusSection.style.display = "none";
    settingsSection.style.display = "flex";
    renderSettingsSection();
  }
};

// Window OnLoad

window.addEventListener("load", () => {
  renderCurrentSection();
  startApp();
  restart.addEventListener("click", () => {
    renderStatusSection();
    startApp();
  });
});
