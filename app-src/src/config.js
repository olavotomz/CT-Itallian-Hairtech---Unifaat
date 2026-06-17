// Gerencia as configurações do sistema
const fs = require('fs');
const path = require('path');

// Caminho do arquivo de configuração
const caminhoConfig = path.join(__dirname, '..', 'config.json');

// Lê o arquivo de configuração
function lerConfig() {
  try {
    const bruto = fs.readFileSync(caminhoConfig, 'utf-8');
    return JSON.parse(bruto);
  } catch {
    return {}; // Retorna objeto vazio se houver erro
  }
}

// Salva a configuração no arquivo
function escreverConfig(cfg) {
  fs.writeFileSync(caminhoConfig, JSON.stringify(cfg, null, 2));
}

// Garante que um diretório exista, criando-o se necessário
function garantirDiretorio(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

// Obtém o caminho da pasta onde os relatórios Excel serão salvos
function obterRaizExcel() {
  const cfg = lerConfig();
  const padrao = path.join(__dirname, '..', 'excel_exports');
  const raiz = cfg.raiz_excel || padrao;
  garantirDiretorio(raiz);
  return raiz;
}

// Define o caminho da pasta de exportação Excel
function definirRaizExcel(raiz) {
  garantirDiretorio(raiz);
  const cfg = lerConfig();
  cfg.raiz_excel = raiz;
  escreverConfig(cfg);
}

module.exports = { obterRaizExcel, definirRaizExcel };
