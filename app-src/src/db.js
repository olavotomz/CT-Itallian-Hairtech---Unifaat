// Gerencia o banco de dados SQLite e as operações de dados
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Define o caminho do banco de dados
const projetoRaiz = path.resolve(__dirname, '..', '..');
const diretorioDb = path.join(projetoRaiz, 'data');
fs.mkdirSync(diretorioDb, { recursive: true }); // Cria pasta se não existir

const dbPath = process.env.SQLITE_DB_PATH || path.join(diretorioDb, 'data.db');
const db = new Database(dbPath); // Conecta ao banco de dados

// Habilita modo WAL (Write-Ahead Logging) para melhor desempenho
db.pragma('journal_mode = WAL');

// Cria as tabelas do banco de dados se não existirem
db.exec(`
  -- Tabela de pessoas (funcionários e visitantes)
  CREATE TABLE IF NOT EXISTS pessoas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT NOT NULL CHECK(tipo IN ('funcionario','visitante')),
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    contato TEXT,
    tem_veiculo INTEGER NOT NULL DEFAULT 1,
    veiculo_marca TEXT,
    veiculo_modelo TEXT,
    veiculo_cor TEXT,
    placa TEXT,
    departamento TEXT,
    criado_em TEXT NOT NULL
  );

  -- Índice único para CPF (evita duplicatas)
  CREATE UNIQUE INDEX IF NOT EXISTS idx_pessoas_cpf ON pessoas(cpf);

  -- Tabela de registros de entrada/saída
  CREATE TABLE IF NOT EXISTS registros_acesso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pessoa_id INTEGER NOT NULL,
    entrada_em TEXT NOT NULL,
    saida_em TEXT,
    FOREIGN KEY(pessoa_id) REFERENCES pessoas(id)
  );

  -- Índice para consultas por pessoa
  CREATE INDEX IF NOT EXISTS idx_registros_pessoa ON registros_acesso(pessoa_id);

  -- Tabela de usuários do sistema
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_usuario TEXT NOT NULL UNIQUE,
    hash_senha TEXT NOT NULL,
    papel TEXT NOT NULL DEFAULT 'portaria',
    criado_em TEXT NOT NULL
  );

  -- Tabela de configurações do sistema
  CREATE TABLE IF NOT EXISTS configuracoes (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );
`);

// Migração: adiciona coluna papel na tabela usuarios se não existir
try {
  db.prepare(`ALTER TABLE usuarios ADD COLUMN papel TEXT NOT NULL DEFAULT 'portaria'`).run();
} catch {}

// Cria uma nova pessoa no banco de dados
function criarPessoa(dados) {
  const stmt = db.prepare(`
    INSERT INTO pessoas (tipo, nome, cpf, contato, tem_veiculo, veiculo_marca, veiculo_modelo, veiculo_cor, placa, departamento, criado_em)
    VALUES (@tipo, @nome, @cpf, @contato, @tem_veiculo, @veiculo_marca, @veiculo_modelo, @veiculo_cor, @placa, @departamento, @criado_em)
  `);
  const info = stmt.run(dados);
  return obterPessoaPorId(info.lastInsertRowid);
}

// Busca uma pessoa pelo ID
function obterPessoaPorId(id) {
  return db.prepare('SELECT * FROM pessoas WHERE id = ?').get(id);
}

// Busca uma pessoa pelo CPF
function obterPessoaPorCpf(cpf) {
  return db.prepare('SELECT * FROM pessoas WHERE cpf = ?').get(cpf);
}

// Lista todas as pessoas, com opção de busca
function listarPessoas(busca) {
  if (!busca) {
    return db.prepare('SELECT * FROM pessoas ORDER BY nome ASC').all();
  }
  const like = `%${busca.toLowerCase()}%`;
  return db.prepare(`
    SELECT * FROM pessoas
    WHERE LOWER(nome) LIKE ? OR LOWER(cpf) LIKE ? OR LOWER(placa) LIKE ? OR LOWER(departamento) LIKE ?
    ORDER BY nome ASC
  `).all(like, like, like, like);
}

// Registra a entrada de uma pessoa
function marcarEntrada(pessoaId, timestamp) {
  const stmt = db.prepare('INSERT INTO registros_acesso (pessoa_id, entrada_em) VALUES (?, ?)');
  const info = stmt.run(pessoaId, timestamp);
  return db.prepare('SELECT * FROM registros_acesso WHERE id = ?').get(info.lastInsertRowid);
}

// Registra a saída de uma pessoa (encontra o último registro aberto)
function marcarSaida(pessoaId, timestamp) {
  const registroAberto = db.prepare(`
    SELECT * FROM registros_acesso
    WHERE pessoa_id = ? AND saida_em IS NULL
    ORDER BY id DESC
    LIMIT 1
  `).get(pessoaId);
  if (!registroAberto) return null;
  db.prepare('UPDATE registros_acesso SET saida_em = ? WHERE id = ?').run(timestamp, registroAberto.id);
  return db.prepare('SELECT * FROM registros_acesso WHERE id = ?').get(registroAberto.id);
}

// Obtém registros de acesso (todos ou de uma pessoa específica)
function obterRegistros(pessoaId, limite = 50) {
  if (pessoaId) {
    return db.prepare(`
      SELECT * FROM registros_acesso WHERE pessoa_id = ? ORDER BY id DESC LIMIT ?
    `).all(pessoaId, limite);
  }
  return db.prepare(`
    SELECT r.*, p.nome, p.tipo FROM registros_acesso r
    JOIN pessoas p ON p.id = r.pessoa_id
    ORDER BY r.id DESC LIMIT ?
  `).all(limite);
}

// Obtém registros de acesso em um período específico
function obterRegistrosNoPeriodo(inicioISO, fimISO) {
  const condicoes = [];
  const parametros = [];
  if (inicioISO && fimISO) {
    condicoes.push(`(r.entrada_em BETWEEN ? AND ? OR r.saida_em BETWEEN ? AND ?)`);
    parametros.push(inicioISO, fimISO, inicioISO, fimISO);
  } else if (inicioISO) {
    condicoes.push(`(r.entrada_em >= ? OR r.saida_em >= ?)`);
    parametros.push(inicioISO, inicioISO);
  } else if (fimISO) {
    condicoes.push(`(r.entrada_em <= ? OR r.saida_em <= ?)`);
    parametros.push(fimISO, fimISO);
  }
  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const sql = `
    SELECT r.*, p.nome, p.tipo
    FROM registros_acesso r
    JOIN pessoas p ON p.id = r.pessoa_id
    ${where}
    ORDER BY r.id ASC
  `;
  return db.prepare(sql).all(...parametros);
}

// Conta quantos usuários existem no sistema
function contarUsuarios() {
  const r = db.prepare(`SELECT COUNT(*) AS c FROM usuarios`).get();
  return r ? r.c : 0;
}

// Obtém uma configuração do banco de dados
function obterConfiguracao(chave) {
  const r = db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get(chave);
  return r ? r.valor : null;
}

// Define ou atualiza uma configuração no banco de dados
function definirConfiguracao(chave, valor) {
  db.prepare(`
    INSERT INTO configuracoes (chave, valor)
    VALUES (?, ?)
    ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor
  `).run(chave, String(valor));
  return obterConfiguracao(chave);
}

module.exports = {
  criarPessoa,
  obterPessoaPorId,
  obterPessoaPorCpf,
  listarPessoas,
  marcarEntrada,
  marcarSaida,
  obterRegistros,
  obterRegistrosNoPeriodo,
  contarUsuarios,
  obterConfiguracao,
  definirConfiguracao,
  contarFuncionarios() {
    const r = db.prepare(`SELECT COUNT(*) AS c FROM pessoas WHERE tipo = 'funcionario'`).get();
    return r ? r.c : 0;
  },
  contarPresentesFuncionarios() {
    const r = db.prepare(`
      SELECT COUNT(DISTINCT r.pessoa_id) AS c
      FROM registros_acesso r
      JOIN pessoas p ON p.id = r.pessoa_id
      WHERE p.tipo = 'funcionario' AND r.saida_em IS NULL
    `).get();
    return r ? r.c : 0;
  },
  listarPresentesFuncionarios() {
    return db.prepare(`
      SELECT DISTINCT p.nome
      FROM registros_acesso r
      JOIN pessoas p ON p.id = r.pessoa_id
      WHERE p.tipo = 'funcionario' AND r.saida_em IS NULL
      ORDER BY p.nome ASC
    `).all().map(r => r.nome);
  },
  listarAusentesFuncionarios() {
    return db.prepare(`
      SELECT nome FROM pessoas 
      WHERE tipo = 'funcionario' 
      AND id NOT IN (
        SELECT DISTINCT pessoa_id FROM registros_acesso WHERE saida_em IS NULL
      )
      ORDER BY nome ASC
    `).all().map(r => r.nome);
  },
  excluirPessoa(id) {
    db.prepare('DELETE FROM registros_acesso WHERE pessoa_id = ?').run(id);
    db.prepare('DELETE FROM pessoas WHERE id = ?').run(id);
  },
  obterRegistroAberto(pessoaId) {
    return db.prepare(`
      SELECT * FROM registros_acesso
      WHERE pessoa_id = ? AND saida_em IS NULL
      ORDER BY id DESC
      LIMIT 1
    `).get(pessoaId);
  },
  atualizarPessoa(id, dados) {
    const stmt = db.prepare(`
      UPDATE pessoas SET
        tipo = @tipo,
        nome = @nome,
        cpf = @cpf,
        contato = @contato,
        tem_veiculo = @tem_veiculo,
        veiculo_marca = @veiculo_marca,
        veiculo_modelo = @veiculo_modelo,
        veiculo_cor = @veiculo_cor,
        placa = @placa,
        departamento = @departamento
      WHERE id = @id
    `);
    stmt.run({ ...dados, id });
    return db.prepare('SELECT * FROM pessoas WHERE id = ?').get(id);
  },
  obterUsuarioPorNome(nome_usuario) {
    return db.prepare('SELECT * FROM usuarios WHERE nome_usuario = ?').get(nome_usuario);
  },
  criarUsuario(usuario) {
    const papel = usuario.papel ? String(usuario.papel) : 'portaria';
    const info = db.prepare(`
      INSERT INTO usuarios (nome_usuario, hash_senha, papel, criado_em)
      VALUES (@nome_usuario, @hash_senha, @papel, @criado_em)
    `).run({ ...usuario, papel });
    return db.prepare('SELECT * FROM usuarios WHERE id = ?').get(info.lastInsertRowid);
  },
  validarUsuario(nome_usuario, hash_senha) {
    return db.prepare('SELECT * FROM usuarios WHERE nome_usuario = ? AND hash_senha = ?').get(nome_usuario, hash_senha);
  },
};
