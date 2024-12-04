const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Listar todas as participações do usuário informado
router.get('/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT 
      p.id AS participacao_id,
      p.id_usuario,
      u.nome AS usuario_nome,
      e.id AS evento_id,
      e.nome AS evento_nome,
      e.local,
      e.data,
      e.horario,
        (SELECT COUNT(*) FROM Participacao p WHERE p.id_evento = e.id) AS numero_participantes
    FROM Participacao p
    JOIN Usuario u ON p.id_usuario = u.id
    JOIN Evento e ON p.id_evento = e.id
    WHERE p.id_usuario = ?
    AND p.id_usuario != e.id_organizador
  `;

  db.all(sql, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nenhuma participação encontrada para este usuário.' });
    }

    res.json(rows);
  });
});



// Atualizar uma participação
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { id_usuario, id_evento } = req.body;

  if (!id_usuario || !id_evento ) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  const sql = `
    UPDATE Participacao
    SET id_usuario = ?, id_evento = ?
    WHERE id = ?
  `;
  db.run(sql, [id_usuario, id_evento, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Participação não encontrada.' });
    res.json({ id, id_usuario, id_evento });
  });
});

// Excluir uma participação
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM Participacao WHERE id = ?';
  db.run(sql, id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Participação não encontrada.' });
    res.status(204).end();
  });
});

module.exports = router;
