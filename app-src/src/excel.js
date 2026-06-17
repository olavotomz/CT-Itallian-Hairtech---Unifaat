// Gerencia a criação e atualização de arquivos Excel com registros do sistema
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const configuracao = require('./config');
const dayjs = require('dayjs');

// Função genérica para adicionar uma linha em uma planilha Excel
// Se o arquivo não existir, cria um novo
async function adicionarLinha(nomeArquivo, nomePlanilha, cabecalhos, valores) {
  const raiz = configuracao.obterRaizExcel();
  const caminhoArquivo = path.join(raiz, nomeArquivo);
  const wb = new ExcelJS.Workbook();
  
  // Se o arquivo já existir, lê ele
  if (fs.existsSync(caminhoArquivo)) {
    await wb.xlsx.readFile(caminhoArquivo);
  }
  
  // Obtém ou cria a planilha
  let ws = wb.getWorksheet(nomePlanilha);
  if (!ws) {
    ws = wb.addWorksheet(nomePlanilha);
    ws.addRow(cabecalhos); // Adiciona cabeçalhos na primeira linha
  }
  
  // Adiciona a nova linha com os valores
  ws.addRow(valores);
  
  // Salva o arquivo
  await wb.xlsx.writeFile(caminhoArquivo);
}

// Adiciona um novo cadastro de pessoa no arquivo cadastros.xlsx
async function appendCadastro(pessoa) {
  const cabecalhos = ['id','tipo','nome','cpf','contato','tem_veiculo','veiculo_marca','veiculo_modelo','veiculo_cor','placa','departamento','criado_em'];
  const valores = [
    pessoa.id,
    pessoa.tipo,
    pessoa.nome,
    pessoa.cpf,
    pessoa.contato || '',
    pessoa.tem_veiculo ? 'sim' : 'nao',
    pessoa.veiculo_marca || '',
    pessoa.veiculo_modelo || '',
    pessoa.veiculo_cor || '',
    pessoa.placa || '',
    pessoa.departamento || '',
    pessoa.criado_em ? dayjs(pessoa.criado_em).format('YYYY-MM-DD HH:mm:ss') : '',
  ];
  await adicionarLinha('cadastros.xlsx', 'Cadastros', cabecalhos, valores);
}

// Adiciona um registro de entrada/saída no arquivo acessos.xlsx
async function appendAcesso(registro, pessoa) {
  const cabecalhos = ['id_registro','id_pessoa','nome','tipo','entrada_em','saida_em'];
  const valores = [
    registro.id,
    pessoa.id,
    pessoa.nome,
    pessoa.tipo,
    registro.entrada_em ? dayjs(registro.entrada_em).format('YYYY-MM-DD HH:mm:ss') : '',
    registro.saida_em ? dayjs(registro.saida_em).format('YYYY-MM-DD HH:mm:ss') : '',
  ];
  await adicionarLinha('acessos.xlsx', 'Acessos', cabecalhos, valores);
}

module.exports = { appendCadastro, appendAcesso };
