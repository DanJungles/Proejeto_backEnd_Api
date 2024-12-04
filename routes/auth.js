const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../db/database');
const router = express.Router();

const SECRET_KEY = 'sua_chave_secreta';

// Login do usuário
router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Campos obrigatórios: email, senha' });
  }

  const sql = 'SELECT id, nome, email, senha FROM Usuario WHERE email = ?';

  db.get(sql, [email], (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar usuário no banco de dados' });
    }
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar a senha
    bcrypt.compare(senha, user.senha, (err, isMatch) => {
      if (err || !isMatch) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

      // Gerar o token JWT
      const token = jwt.sign(
        { id: user.id, email: user.email },
        SECRET_KEY,
        { expiresIn: '1h' } // Token expira em 1 hora
      );

      res.json({
        token,
        user: {
          id: user.id,
          nome: user.nome,
          email: user.email,
        },
      });
    });
  });
});

// Middleware para validar o token
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido' });
    }

    req.user = decoded; // Decodifica os dados do token
    next();
  });
};

// Middleware para validar se o usuário é o organizador do evento
const isOrganizer = (req, res, next) => {
  const { userId } = req.params;
  if (req.user.id != userId) {
    return res.status(403).json({ error: 'Acesso negado. Você não é o organizador deste evento.' });
  }
  next();
};

module.exports = { router, authenticateToken, isOrganizer };
