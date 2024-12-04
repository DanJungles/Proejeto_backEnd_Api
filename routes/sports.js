const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Listar esportes do usuário
router.get('/:userId', (req, res) => {
  const { userId } = req.params;
  const sql = `
    SELECT eu.id, e.nome AS esporte_nome, eu.nivel_habilidade
    FROM EsporteUsuario eu
    JOIN Esporte e ON eu.id_esporte = e.id
    WHERE eu.id_usuario = ?
  `;
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Adicionar esporte ao usuário
router.post('/', (req, res) => {
  const { id_usuario, id_esporte, nivel_habilidade } = req.body;

  if (!id_usuario || !id_esporte || !nivel_habilidade) {
    return res.status(400).json({ error: 'Campos obrigatórios: id_usuario, id_esporte, nivel_habilidade' });
  }

  // Verificar se o esporte já está associado ao usuário
  const checkSql = `
    SELECT COUNT(*) AS count 
    FROM EsporteUsuario 
    WHERE id_usuario = ? AND id_esporte = ?
  `;

  db.get(checkSql, [id_usuario, id_esporte], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao verificar esporte do usuário.' });
    }

    if (row.count > 0) {
      return res.status(400).json({ error: 'Este esporte já está associado a este usuário.' });
    }

    // Inserir novo esporte para o usuário
    const insertSql = `
      INSERT INTO EsporteUsuario (id_usuario, id_esporte, nivel_habilidade)
      VALUES (?, ?, ?)
    `;
    db.run(insertSql, [id_usuario, id_esporte, nivel_habilidade], function (err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, id_usuario, id_esporte, nivel_habilidade });
    });
  });
});


// Atualizar esporte do usuário
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nivel_habilidade } = req.body;

  if (!nivel_habilidade) {
    return res.status(400).json({ error: 'Campo obrigatório: nivel_habilidade' });
  }

  const sql = `
    UPDATE EsporteUsuario
    SET nivel_habilidade = ?
    WHERE id = ?
  `;
  db.run(sql, [nivel_habilidade, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Registro de esporte não encontrado' });
    res.json({ id, nivel_habilidade });
  });
});

// Excluir esporte do usuário
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM EsporteUsuario WHERE id = ?';
  db.run(sql, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Registro de esporte não encontrado' });
    res.status(204).end();
  });
});

module.exports = router;
