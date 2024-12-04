const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const usersRoutes = require('./routes/users');
const eventsRoutes = require('./routes/events');

const authRoutes = require('./routes/auth');
const sportsRoutes = require('./routes/sports');

const participationRoutes = require('./routes/participations');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use('/api/auth', authRoutes.router);
app.use('/api/users', usersRoutes);
app.use('/api/sports', sportsRoutes);
app.use('/api/participations', participationRoutes);
app.use('/api/events', eventsRoutes);

// Rota inicial
app.get('/', (req, res) => {
  res.send('API EsportiVai rodando!');
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
