const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Conexão com o banco SQLite
const dbPath = path.resolve(__dirname, 'esportivai.db');
const db = new sqlite3.Database(dbPath);

// Função para gerar senhas criptografadas
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

// Criação das tabelas e inserção de dados
db.serialize(async () => {
  console.log('Iniciando a criação das tabelas...');

  // Tabela Usuario
  db.run(`
    CREATE TABLE IF NOT EXISTS Usuario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL
    );
  `);

  // Tabela Esporte
  db.run(`
    CREATE TABLE IF NOT EXISTS Esporte (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL
    );
  `);

  // Tabela EsporteUsuario (Relacionamento)
  db.run(`
    CREATE TABLE IF NOT EXISTS EsporteUsuario (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL,
      id_esporte INTEGER NOT NULL,
      nivel_habilidade TEXT NOT NULL,
      FOREIGN KEY (id_usuario) REFERENCES Usuario (id),
      FOREIGN KEY (id_esporte) REFERENCES Esporte (id)
    );
  `);

  // Tabela Evento
  db.run(`
    CREATE TABLE IF NOT EXISTS Evento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      id_esporte INTEGER NOT NULL,
      data TEXT NOT NULL,
      horario TEXT NOT NULL,
      local TEXT NOT NULL,
      max_participantes INTEGER NOT NULL,
      nivel_habilidade TEXT NOT NULL,
      id_organizador INTEGER NOT NULL,
      FOREIGN KEY (id_esporte) REFERENCES Esporte (id),
      FOREIGN KEY (id_organizador) REFERENCES Usuario (id)
    );
  `);

  // Tabela Participacao (Relacionamento)
  db.run(`
    CREATE TABLE IF NOT EXISTS Participacao (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL,
      id_evento INTEGER NOT NULL,
      FOREIGN KEY (id_usuario) REFERENCES Usuario (id),
      FOREIGN KEY (id_evento) REFERENCES Evento (id)
    );
  `);

  console.log('Tabelas criadas com sucesso!');

  // Criação de índices para melhorar o desempenho
  console.log('Criando índices...');

  // Índices na tabela Usuario
  db.run(`CREATE INDEX IF NOT EXISTS idx_usuario_email ON Usuario (email);`);

  // Índices na tabela EsporteUsuario
  db.run(`CREATE INDEX IF NOT EXISTS idx_esporteusuario_id_usuario ON EsporteUsuario (id_usuario);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_esporteusuario_id_esporte ON EsporteUsuario (id_esporte);`);

  // Índices na tabela Evento
  db.run(`CREATE INDEX IF NOT EXISTS idx_evento_id_esporte ON Evento (id_esporte);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_evento_id_organizador ON Evento (id_organizador);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_evento_data ON Evento (data);`);

  // Índices na tabela Participacao
  db.run(`CREATE INDEX IF NOT EXISTS idx_participacao_id_usuario ON Participacao (id_usuario);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_participacao_id_evento ON Participacao (id_evento);`);

  console.log('Índices criados com sucesso!');

  // Inserção de dados para teste
  console.log('Inserindo dados de exemplo...');

  // Inserir dados na tabela Esporte
  const esportes = ['Futebol', 'Basquete', 'Vôlei', 'Tênis', 'Natação'];
  esportes.forEach((esporte, index) => {
    db.run(`INSERT OR IGNORE INTO Esporte (id, nome) VALUES (?, ?)`, [index + 1, esporte]);
  });

  console.log('Dados de exemplo inseridos com sucesso!');
});

// Fechar conexão
// db.close();
module.exports = db;
