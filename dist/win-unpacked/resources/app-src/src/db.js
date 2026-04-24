const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
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

  CREATE UNIQUE INDEX IF NOT EXISTS idx_pessoas_cpf ON pessoas(cpf);

  CREATE TABLE IF NOT EXISTS registros_acesso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pessoa_id INTEGER NOT NULL,
    entrada_em TEXT NOT NULL,
    saida_em TEXT,
    FOREIGN KEY(pessoa_id) REFERENCES pessoas(id)
  );

  CREATE INDEX IF NOT EXISTS idx_registros_pessoa ON registros_acesso(pessoa_id);

  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome_usuario TEXT NOT NULL UNIQUE,
    hash_senha TEXT NOT NULL,
    criado_em TEXT NOT NULL
  );
`);

// Migrações para garantir compatibilidade com nomes antigos se necessário (embora o pedido seja mudar tudo)
// Como o banco é SQLite e local, vou manter os nomes novos para a estrutura.

function criarPessoa(dados) {
  const stmt = db.prepare(`
    INSERT INTO pessoas (tipo, nome, cpf, contato, tem_veiculo, veiculo_marca, veiculo_modelo, veiculo_cor, placa, departamento, criado_em)
    VALUES (@tipo, @nome, @cpf, @contato, @tem_veiculo, @veiculo_marca, @veiculo_modelo, @veiculo_cor, @placa, @departamento, @criado_em)
  `);
  const info = stmt.run(dados);
  return obterPessoaPorId(info.lastInsertRowid);
}

function obterPessoaPorId(id) {
  return db.prepare('SELECT * FROM pessoas WHERE id = ?').get(id);
}

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

function marcarEntrada(pessoaId, timestamp) {
  const stmt = db.prepare('INSERT INTO registros_acesso (pessoa_id, entrada_em) VALUES (?, ?)');
  const info = stmt.run(pessoaId, timestamp);
  return db.prepare('SELECT * FROM registros_acesso WHERE id = ?').get(info.lastInsertRowid);
}

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

module.exports = {
  criarPessoa,
  obterPessoaPorId,
  listarPessoas,
  marcarEntrada,
  marcarSaida,
  obterRegistros,
  obterRegistrosNoPeriodo,
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
    const info = db.prepare(`
      INSERT INTO usuarios (nome_usuario, hash_senha, criado_em)
      VALUES (@nome_usuario, @hash_senha, @criado_em)
    `).run(usuario);
    return db.prepare('SELECT * FROM usuarios WHERE id = ?').get(info.lastInsertRowid);
  },
  validarUsuario(nome_usuario, hash_senha) {
    return db.prepare('SELECT * FROM usuarios WHERE nome_usuario = ? AND hash_senha = ?').get(nome_usuario, hash_senha);
  },
};
