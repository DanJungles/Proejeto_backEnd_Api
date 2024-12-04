const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db/database');

// Listar todos os usuários
router.get('/', (req, res) => {
  db.all('SELECT id, nome, email FROM Usuario', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Adicionar um novo usuário com senha criptografada
router.post('/', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, senha' });
  }

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);
    const sql = 'INSERT INTO Usuario (nome, email, senha) VALUES (?, ?, ?)';
    db.run(sql, [nome, email, hashedPassword], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, nome, email });
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criptografar a senha' });
  }
});

// Atualizar um usuário com senha criptografada, se fornecida
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email' });
  }

  try {
    let hashedPassword = null;
    if (senha) {
      hashedPassword = await bcrypt.hash(senha, 10);
    }

    const sql = `
      UPDATE Usuario
      SET nome = ?, email = ?, senha = COALESCE(?, senha)
      WHERE id = ?
    `;
    db.run(sql, [nome, email, hashedPassword, id], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      res.json({ id, nome, email });
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criptografar a senha' });
  }
});

// Excluir um usuário
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM Usuario WHERE id = ?';
  db.run(sql, id, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    res.status(204).end();
  });
});

// Obter perfil do usuário
router.get('/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT u.id, u.nome, u.email, eu.id AS esporte_id, e.nome AS esporte_nome, eu.nivel_habilidade
    FROM Usuario u
    LEFT JOIN EsporteUsuario eu ON u.id = eu.id_usuario
    LEFT JOIN Esporte e ON eu.id_esporte = e.id
    WHERE u.id = ?
  `;
  db.all(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    const user = {
      id: rows[0].id,
      nome: rows[0].nome,
      email: rows[0].email,
      esportes: rows.map((row) => ({
        esporte_id: row.esporte_id,
        nome: row.esporte_nome,
        nivel_habilidade: row.nivel_habilidade,
      })),
    };
    res.json(user);
  });
});

// Listar eventos organizados pelo usuário
router.get('/:userId/events', (req, res) => {
  const { userId } = req.params;
  const sql = 'SELECT * FROM Evento WHERE id_organizador = ?';
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Listar participações do usuário
router.get('/:userId/participations', (req, res) => {
  const { userId } = req.params;
  const sql = `
    SELECT p.id AS participacao_id, e.nome AS evento_nome, e.data, e.local
    FROM Participacao p
    JOIN Evento e ON p.id_evento = e.id
    WHERE p.id_usuario = ?
  `;
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
  
});

// Listar próximos eventos
router.get('/:userId/upcoming-events', (req, res) => {
  const { userId } = req.params;

  const sql = ` SELECT es.nome as esporte_nome , e.* FROM evento e
    JOIN Participacao p ON e.id = p.id_evento
    JOIN Esporte es ON e.id_esporte = es.id
    WHERE p.id_usuario = ? AND e.data > DATE('now')`
   
  ;
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Listar eventos inscritos
router.get('/:userId/subscribed-events', (req, res) => {
  const { userId } = req.params;

  const sql = ` SELECT es.nome as esporte_nome ,e.* FROM evento e
    JOIN Participacao p ON e.id = p.id_evento
    JOIN Esporte es ON e.id_esporte = es.id
    WHERE p.id_usuario = ? AND e.data >= DATE('now')
  `;
   
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });

  // Listar eventos passados
router.get('/:userId/past-events', (req, res) => {
  const { userId } = req.params;

  const sql = `  SELECT es.nome as esporte_nome , e.* FROM evento e
    JOIN Participacao p ON e.id = p.id_evento
     JOIN Esporte es ON e.id_esporte = es.id
    WHERE p.id_usuario = ? AND e.data < DATE('now')`
  
  ;
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});
});
module.exports = router;
