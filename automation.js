const fs = require("fs");
const AdmZip = require("adm-zip");
const path = require("path");
const nodemailer = require("nodemailer");

const TEMPORARY_FILE = path.join(__dirname, "temporary.json");

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
 * @param {number} number
 * @returns {number|null}
 */
function padWithZeros(number) {
  const parsedNumber = parseInt(number, 10);
  if (!isNaN(parsedNumber)) {
    return parsedNumber.toString().padStart(2, "0");
  } else {
    return null;
  }
}

/**
 * @param {string} folderPath
 * @param {string} outputZipPath
 */
async function zipFolder(folderPath, outputZipPath) {
  const zip = new AdmZip();
  zip.addLocalFolder(folderPath);
  zip.writeZip(outputZipPath);
}

/**
 * Deletes the file at the given path.
 * @param {string} path Path to the file that you want to delete.
 * @returns {Promise<null>}
 */
function deleteFile(path) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(path)) {
      fs.unlink(path, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    } else {
      resolve();
    }
  });
}

/**
 * Salva as informações no arquivo temporário.
 * @param {number} mes
 */
function salvarInformacoesTemporarias(mes) {
  const informacoes = { mes: mes, enviado: true };
  fs.writeFileSync(TEMPORARY_FILE, JSON.stringify(informacoes));
}

/**
 * Retorna oque está escrito no arquivo temporário.
 * @returns {{ mes: number, enviado: boolean }}
 */
function lerInformacoesTemporarias() {
  return JSON.parse(fs.readFileSync(TEMPORARY_FILE, { encoding: "utf-8" }));
}

/**
 * Faz o processo de automatização.
 * @param {{ name: string, email: string, password: string, contabilidade: string, cnpj: string }} settings
 * @return {{ ok: boolean, message: string }}
 */
module.exports = async (settings) => {
  // Verificar configurações

  if (settings === undefined || settings === null)
    return { ok: false, message: "Arquivo de configuração não existe." };
  if (settings.name === undefined)
    return {
      ok: false,
      message:
        "A configuração 'nome' está indefinido, preencha as configurações novamente.",
    };
  if (settings.email === undefined)
    return {
      ok: false,
      message:
        "A configuração 'email' está indefinido, preencha as configurações novamente.",
    };
  if (!validateEmail(settings.email))
    return {
      ok: false,
      message: "A configuração 'email' não está no formato de um email.",
    };
  if (settings.password === undefined)
    return {
      ok: false,
      message:
        "A configuração 'senha' está indefinido, preencha as configurações novamente.",
    };
  if (settings.contabilidade === undefined)
    return {
      ok: false,
      message:
        "A configuração 'destino' está indefinido, preencha as configurações novamente.",
    };
  if (!validateEmail(settings.contabilidade))
    return {
      ok: false,
      message: "A configuração 'destino' não está no formato de um email.",
    };
  if (settings.cnpj === undefined)
    return {
      ok: false,
      message:
        "A configuração 'cnpj' está indefinido, preencha as configurações novamente.",
    };

  // Criar o transportador

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: settings.email,
      pass: settings.password,
    },
  });

  // Definir as váriaveis e os caminhos

  let date = new Date();
  let month = date.getMonth() + 1;

  if (fs.existsSync(TEMPORARY_FILE)) {
    const informacoes = lerInformacoesTemporarias();
    const mesQueEnviou = informacoes.mes;
    if (mesQueEnviou === month) {
      return { ok: false, message: "Arquivos xml não enviado." };
    } else {
      salvarInformacoesTemporarias(month);
    }
  } else {
    salvarInformacoesTemporarias(month);
  }

  let year = date.getFullYear();

  if (month === 1) {
    month = 12;
    year -= 1;
  }

  month -= 1;

  const vendasPath = `${settings.pastaVendas}\\${year}\\${padWithZeros(month)}`;
  const canceladosPath = `${settings.pastaCancelados}\\${year}\\${padWithZeros(
    month
  )}`;

  const vendasZipPath = path.join(__dirname, "Vendas.zip");
  const canceladosZipPath = path.join(__dirname, "Cancelados.zip");

  await deleteFile(vendasZipPath);
  await deleteFile(canceladosZipPath);

  /** @type {Array<{ filename: string, path: string }>} */
  const attachments = [];

  // Transformar a pasta CFeCanc em .zip

  try {
    const canceladosZip = await zipFolder(canceladosPath, canceladosZipPath);
    if (canceladosZip !== null) {
      attachments.push({
        filename: path.basename(canceladosZipPath),
        path: canceladosZipPath,
      });
    }
  } catch {}

  // Transformar a pasta CFeVenda em .zip

  try {
    const vendasZip = await zipFolder(vendasPath, vendasZipPath);
    if (vendasZip !== null) {
      attachments.push({
        filename: path.basename(vendasZipPath),
        path: vendasZipPath,
      });
    }
  } catch {}

  if (attachments.length === 0) {
    return {
      ok: false,
      message: "Nenhum arquivo encontrado para ser enviado.",
    };
  }

  // Enviar o email

  const mailOptions = {
    from: settings.email,
    to: settings.contabilidade,
    subject: `Arquivos xml de Cupom Fiscal SAT ${month}/${year} - ${settings.name} ${settings.cnpj}`,
    text: "",
    attachments: attachments,
  };

  const resposta = { ok: true, message: "Sucesso" };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error !== null) {
      resposta = { ok: false, message: "Erro ao enviar email: " + error };
    }
  });

  return resposta;
};
