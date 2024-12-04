const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Listar eventos onde o usuário ainda não participa
router.get('/:userId', (req, res) => {
  const { userId } = req.params;

  const sql = `
    SELECT 
      e.id, 
      e.nome, 
      es.nome AS esporte, 
      e.data, 
      e.horario, 
      e.local,
      e.max_participantes, 
      e.nivel_habilidade, 
      u.nome AS organizador
    FROM Evento e
    JOIN Usuario u ON e.id_organizador = u.id
    JOIN Esporte es ON e.id_esporte = es.id
    WHERE e.id NOT IN (
        SELECT p.id_evento
        FROM Participacao p
        WHERE p.id_usuario = ?
    )
    AND (
        SELECT COUNT(*) 
        FROM Participacao p 
        WHERE p.id_evento = e.id
    ) < e.max_participantes
    AND e.nivel_habilidade = (
        SELECT eu.nivel_habilidade
        FROM EsporteUsuario eu
        WHERE eu.id_usuario = ?
        AND e.id_esporte = eu.id_esporte
    )
    AND e.id_esporte IN (
        SELECT eu.id_esporte
        FROM EsporteUsuario eu
        WHERE eu.id_usuario = ?
    )
  `;

  db.all(sql, [userId, userId, userId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});


// Obter evento por ID com o número de participantes
router.get('/byID/:id', async (req, res) => {
  const { id } = req.params;

  const sqlEvento = `
    SELECT 
      e.id,
      e.nome,
      e.id_esporte,
      e.data,
      e.horario,
      e.local,
      e.max_participantes,
      e.nivel_habilidade,
      u.nome AS organizador
    FROM Evento e
    JOIN Usuario u ON e.id_organizador = u.id
    JOIN Esporte es ON e.id_esporte = es.id
    WHERE e.id = ?
  `;

  const sqlParticipantes = `
    SELECT COUNT(*) AS numero_participantes
    FROM Participacao
    WHERE id_evento = ?
  `;

  try {
    // Obter informações do evento
    const evento = await new Promise((resolve, reject) => {
      db.get(sqlEvento, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!evento) {
      return res.status(404).json({ error: 'Evento não encontrado' });
    }

    // Obter número de participantes
    const participantes = await new Promise((resolve, reject) => {
      db.get(sqlParticipantes, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row.numero_participantes || 0);
      });
    });

    // Combinar informações do evento e número de participantes
    evento.numero_participantes = participantes;

    res.json(evento);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar informações do evento' });
  }
});

// Listar eventos do organizador
router.get('/organizer/:userId', (req, res) => {
  const { userId } = req.params;
  const sql = `
    SELECT e.id, e.nome, Cast(es.id AS VARCHAR ) AS id_esporte, es.nome AS esporte, e.data, e.horario, e.local,
           e.max_participantes, e.nivel_habilidade,
            (SELECT COUNT(*) FROM Participacao p WHERE p.id_evento = e.id) AS numero_participantes
    FROM Evento e
    JOIN Esporte es ON e.id_esporte = es.id
    WHERE e.id_organizador = ?
  `;
  db.all(sql, [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Criar um novo evento e atualizar a tabela Participacao
router.post('/organizer/:userId', (req, res) => {
  const { userId } = req.params;
  const { nome, id_esporte, data, horario, local, max_participantes, nivel_habilidade } = req.body;

  if (!nome || !id_esporte || !data || !horario || !local || !max_participantes || !nivel_habilidade) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  const insertEventoSql = `
    INSERT INTO Evento (id_organizador, nome, id_esporte, data, horario, local, max_participantes, nivel_habilidade)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(insertEventoSql, [userId, nome, id_esporte, data, horario, local, max_participantes, nivel_habilidade], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    const eventoId = this.lastID;

    const insertParticipacaoSql = `
      INSERT INTO Participacao (id_usuario, id_evento)
      VALUES (?, ?)
    `;

    db.run(insertParticipacaoSql, [userId, eventoId], function (err) {
      if (err) {
        return res.status(500).json({ error: 'Erro ao adicionar participação do organizador' });
      }

      res.status(201).json({
        id: eventoId,
        userId,
        nome,
        id_esporte,
        data,
        horario,
        local,
        max_participantes,
        nivel_habilidade,
        participacao: { id_usuario: userId, id_evento: eventoId},
      });
    });
  });
});


// Atualizar um evento existente
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { nome, id_esporte, data, horario, local, max_participantes, nivel_habilidade } = req.body;

  if (!nome || !id_esporte || !data || !horario || !local || !max_participantes || !nivel_habilidade) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  const sql = `
    UPDATE Evento
    SET nome = ?, id_esporte = ?, data = ?, horario = ?, local = ?, max_participantes = ?, nivel_habilidade = ?
    WHERE id = ?
  `;
  db.run(sql, [nome, id_esporte, data, horario, local, max_participantes, nivel_habilidade, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Evento não encontrado.' });
    res.json({ id, nome, id_esporte, data, horario, local, max_participantes, nivel_habilidade });
  });
});

// Excluir um evento
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM Evento WHERE id = ?';
  db.run(sql, [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Evento não encontrado.' });
    res.status(204).end();
  });
});

// Participar de um evento
router.post('/:eventId/participate', (req, res) => {
  const { eventId } = req.params;
  const { userId } = req.body;

  if (!userId ) return res.status(400).json({ error: 'Campo obrigatório: userId ' });

  const sql = `
    INSERT INTO Participacao (id_usuario, id_evento)
    VALUES (?, ?)
  `;
  db.run(sql, [userId, eventId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ participationId: this.lastID });
  });
});

// Listar participantes de um evento
router.get('/:eventId/participants', (req, res) => {
  const { eventId } = req.params;
  const sql = `
    SELECT u.id, u.nome, u.email
    JOIN Usuario u ON p.id_usuario = u.id
    WHERE p.id_evento = ?
  `;
  db.all(sql, [eventId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

module.exports = router;
