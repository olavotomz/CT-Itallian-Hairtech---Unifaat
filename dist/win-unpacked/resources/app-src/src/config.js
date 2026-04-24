const fs = require('fs');
const path = require('path');

const caminhoConfig = path.join(__dirname, '..', 'config.json');

function lerConfig() {
  try {
    const bruto = fs.readFileSync(caminhoConfig, 'utf-8');
    return JSON.parse(bruto);
  } catch {
    return {};
  }
}

function escreverConfig(cfg) {
  fs.writeFileSync(caminhoConfig, JSON.stringify(cfg, null, 2));
}

function garantirDiretorio(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

function obterRaizExcel() {
  const cfg = lerConfig();
  const padrao = path.join(__dirname, '..', 'excel_exports');
  const raiz = cfg.raiz_excel || padrao;
  garantirDiretorio(raiz);
  return raiz;
}

function definirRaizExcel(raiz) {
  garantirDiretorio(raiz);
  const cfg = lerConfig();
  cfg.raiz_excel = raiz;
  escreverConfig(cfg);
}

module.exports = { obterRaizExcel, definirRaizExcel };
