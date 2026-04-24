const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const dayjs = require('dayjs');
const crypto = require('crypto');

const bancoDados = require('./db');
const configuracao = require('./config');
const excel = require('./excel');

const app = express();
app.use(cors());
app.use(express.json());

const publicoExterno = path.join(process.resourcesPath, 'app-src', 'public');
const diretorioPublico = fs.existsSync(publicoExterno) ? publicoExterno : path.join(__dirname, '..', 'public');

app.get('/login', (req, res) => {
  res.sendFile(path.join(diretorioPublico, 'login.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(diretorioPublico, 'login.html'));
});

app.use(express.static(diretorioPublico, { index: false }));

function agoraISO() {
  return dayjs().toISOString();
}

const SAL_SENHA = 'controle_de_acesso_salt_v1';
function hashSenha(senha) {
  return crypto.createHash('sha256').update(SAL_SENHA + String(senha)).digest('hex');
}

// Criar usuário admin se não existir
try {
  const adminExistente = bancoDados.obterUsuarioPorNome('admin');
  if (!adminExistente) {
    bancoDados.criarUsuario({ nome_usuario: 'admin', hash_senha: hashSenha('23689498'), criado_em: agoraISO() });
  }
} catch {}

// Endpoints de Autenticação
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Credenciais inválidas' });
  const usuario = bancoDados.validarUsuario(String(username).toLowerCase(), hashSenha(password));
  if (!usuario) return res.status(401).json({ error: 'Usuário ou senha incorretos' });
  res.json({ ok: true });
});

app.post('/api/auth/create-user', (req, res) => {
  const { admin_code, username, password } = req.body || {};
  if (admin_code !== 'R00t$#@!26') return res.status(403).json({ error: 'Código administrador inválido' });
  const nomeU = String(username || '').trim().toLowerCase();
  const senha = String(password || '');
  if (!nomeU || !senha) return res.status(400).json({ error: 'Informe usuário e senha' });
  try {
    const existe = bancoDados.obterUsuarioPorNome(nomeU);
    if (existe) return res.status(409).json({ error: 'Usuário já existe' });
    const criado = bancoDados.criarUsuario({ nome_usuario: nomeU, hash_senha: hashSenha(senha), criado_em: agoraISO() });
    res.status(201).json({ id: criado.id, nome_usuario: criado.nome_usuario });
  } catch (e) {
    res.status(500).json({ error: 'Falha ao criar usuário', details: e.message });
  }
});

// Rotas para servir páginas
app.get('/app', (req, res) => {
  res.sendFile(path.join(diretorioPublico, 'index.html'));
});

app.post('/api/people', async (req, res) => {
  let { tipo, nome, cpf, veiculo_modelo, veiculo_cor, placa, departamento } = req.body || {};
  const { contato, tem_veiculo, veiculo_marca } = req.body || {};
  if (!tipo || !['funcionario', 'visitante'].includes(tipo)) {
    return res.status(400).json({ error: 'tipo inválido: use funcionario ou visitante' });
  }
  if (!nome || !cpf) {
    return res.status(400).json({ error: 'nome e cpf são obrigatórios' });
  }
  cpf = String(cpf).replace(/\D/g, '');
  if (!/^\d+$/.test(cpf)) {
    return res.status(400).json({ error: 'cpf deve conter apenas números' });
  }
  try {
    const pessoa = bancoDados.criarPessoa({
      tipo,
      nome,
      cpf,
      contato: contato || null,
      tem_veiculo: tem_veiculo === 0 || tem_veiculo === false || tem_veiculo === '0' ? 0 : 1,
      veiculo_marca: tem_veiculo === 0 || tem_veiculo === false || tem_veiculo === '0' ? null : (veiculo_marca || null),
      veiculo_modelo: veiculo_modelo || null,
      veiculo_cor: veiculo_cor || null,
      placa: placa || null,
      departamento: departamento || null,
      criado_em: agoraISO(),
    });
    try { await excel.appendCadastro(pessoa); } catch {}
    res.status(201).json(pessoa);
  } catch (e) {
    if (String(e.message).includes('idx_pessoas_cpf')) {
      return res.status(409).json({ error: 'CPF já cadastrado' });
    }
    res.status(500).json({ error: 'Erro ao cadastrar', details: e.message });
  }
});

app.get('/api/people', (req, res) => {
  const { q } = req.query;
  const lista = bancoDados.listarPessoas(q || '');
  res.json(lista);
});

app.get('/api/stats/overview', (req, res) => {
  try {
    const total = bancoDados.contarFuncionarios();
    const presentes = bancoDados.contarPresentesFuncionarios();
    const nomesPresentes = bancoDados.listarPresentesFuncionarios();
    const nomesAusentes = bancoDados.listarAusentesFuncionarios();
    res.json({ 
      total_funcionarios: total, 
      presentes, 
      nomes_presentes: nomesPresentes,
      nomes_ausentes: nomesAusentes 
    });
  } catch (e) {
    res.status(500).json({ error: 'Falha ao obter estatísticas' });
  }
});

app.get('/api/reports/access', async (req, res) => {
  try {
    const { from, to } = req.query || {};
    const diaInicio = from ? dayjs(from).startOf('day') : null;
    const diaFim = to ? dayjs(to).endOf('day') : null;
    const inicioISO = diaInicio ? diaInicio.toISOString() : null;
    const fimISO = diaFim ? diaFim.toISOString() : null;
    const registros = bancoDados.obterRegistrosNoPeriodo(inicioISO, fimISO);
    const ExcelJS = require('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Acessos');
    ws.addRow(['Nome','Tipo','Entrada','Saída']);
    registros.forEach((l) => {
      const ent = l.entrada_em ? dayjs(l.entrada_em).format('YYYY-MM-DD HH:mm:ss') : '';
      const sai = l.saida_em ? dayjs(l.saida_em).format('YYYY-MM-DD HH:mm:ss') : '';
      ws.addRow([l.nome, l.tipo, ent, sai]);
    });
    const nomeArquivo = `acessos_${from || 'inicio'}_${to || 'fim'}.xlsx`.replace(/[:\\/]+/g, '-');
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    res.status(500).json({ error: 'Falha ao gerar relatório', details: e.message });
  }
});

app.get('/api/people/:id', (req, res) => {
  const pessoa = bancoDados.obterPessoaPorId(Number(req.params.id));
  if (!pessoa) return res.status(404).json({ error: 'Pessoa não encontrada' });
  res.json(pessoa);
});

app.put('/api/people/:id', (req, res) => {
  const id = Number(req.params.id);
  const encontrada = bancoDados.obterPessoaPorId(id);
  if (!encontrada) return res.status(404).json({ error: 'Pessoa não encontrada' });
  let { tipo, nome, cpf, contato, tem_veiculo, veiculo_marca, veiculo_modelo, veiculo_cor, placa, departamento } = req.body || {};
  if (!tipo || !['funcionario', 'visitante'].includes(tipo)) {
    return res.status(400).json({ error: 'tipo inválido: use funcionario ou visitante' });
  }
  if (!nome || !cpf) {
    return res.status(400).json({ error: 'nome e cpf são obrigatórios' });
  }
  cpf = String(cpf).replace(/\D/g, '');
  if (!/^\d+$/.test(cpf)) {
    return res.status(400).json({ error: 'cpf deve conter apenas números' });
  }
  try {
    const tv = tem_veiculo === 0 || tem_veiculo === false || tem_veiculo === '0' ? 0 : 1;
    const atualizada = bancoDados.atualizarPessoa(id, {
      tipo,
      nome,
      cpf,
      contato: contato || null,
      tem_veiculo: tv,
      veiculo_marca: tv ? (veiculo_marca || null) : null,
      veiculo_modelo: tv ? (veiculo_modelo || null) : null,
      veiculo_cor: tv ? (veiculo_cor || null) : null,
      placa: tv ? (placa || null) : null,
      departamento: departamento || null,
    });
    res.json(atualizada);
  } catch (e) {
    if (String(e.message).includes('idx_pessoas_cpf')) {
      return res.status(409).json({ error: 'CPF já cadastrado' });
    }
    res.status(500).json({ error: 'Erro ao atualizar', details: e.message });
  }
});

app.delete('/api/people/:id', (req, res) => {
  const id = Number(req.params.id);
  const pessoa = bancoDados.obterPessoaPorId(id);
  if (!pessoa) return res.status(404).json({ error: 'Pessoa não encontrada' });
  bancoDados.excluirPessoa(id);
  res.status(204).end();
});

app.post('/api/access/:id/entry', async (req, res) => {
  const id = Number(req.params.id);
  const pessoa = bancoDados.obterPessoaPorId(id);
  if (!pessoa) return res.status(404).json({ error: 'Pessoa não encontrada' });
  const aberta = bancoDados.obterRegistroAberto(id);
  if (aberta) {
    return res.status(409).json({ error: 'Entrada já registrada para esta pessoa' });
  }
  const registro = bancoDados.marcarEntrada(id, agoraISO());
  try { await excel.appendAcesso(registro, pessoa); } catch {}
  res.status(201).json(registro);
});

app.post('/api/access/:id/exit', async (req, res) => {
  const id = Number(req.params.id);
  const pessoa = bancoDados.obterPessoaPorId(id);
  if (!pessoa) return res.status(404).json({ error: 'Pessoa não encontrada' });
  const registro = bancoDados.marcarSaida(id, agoraISO());
  if (!registro) return res.status(409).json({ error: 'Saída já registrada ou não há entrada aberta' });
  try { await excel.appendAcesso(registro, pessoa); } catch {}
  res.json(registro);
});

app.get('/api/access/logs', (req, res) => {
  const pessoaId = req.query.personId ? Number(req.query.personId) : undefined;
  const registros = bancoDados.obterRegistros(pessoaId);
  res.json(registros);
});

// Configurar raiz do Excel
app.get('/api/config/excel-root', (req, res) => {
  res.json({ excel_root: configuracao.obterRaizExcel() });
});

app.post('/api/config/excel-root', (req, res) => {
  const { excel_root } = req.body || {};
  if (!excel_root || typeof excel_root !== 'string') {
    return res.status(400).json({ error: 'excel_root inválido' });
  }
  try {
    configuracao.definirRaizExcel(excel_root);
    res.json({ ok: true, excel_root: configuracao.obterRaizExcel() });
  } catch (e) {
    res.status(500).json({ error: 'Falha ao salvar configuração', details: e.message });
  }
});

// Navegador de diretórios
app.get('/api/fs/list', (req, res) => {
  try {
    const solicitado = req.query.path;
    const base = solicitado && typeof solicitado === 'string' ? solicitado : path.join(process.env.SystemDrive || 'C:', 'Users');
    const entradas = fs.readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({ name: d.name, path: path.join(base, d.name) }));
    const pai = path.dirname(base);
    res.json({ path: base, parent: pai, entries: entradas });
  } catch (e) {
    res.status(500).json({ error: 'Falha ao listar diretório', details: e.message });
  }
});

module.exports = app;
