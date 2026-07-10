const path = require('path');
const crypto = require('crypto');
const express = require('express');
const config = require('../config/env');
const { logger } = require('../utils/logger');
const {
  getAllDebtors,
  appendDebtor,
  updateDebtor,
  updateDebtorStatus,
  deleteDebtor,
} = require('../services/sheetsService');

if (!config.web.username || !config.web.password) {
  throw new Error(
    'PANEL_USERNAME e PANEL_PASSWORD são obrigatórios para rodar o painel. Defina-os no .env.'
  );
}

const app = express();

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function basicAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');

  if (scheme === 'Basic' && encoded) {
    const [user, pass] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
    if (
      timingSafeStringEqual(user || '', config.web.username) &&
      timingSafeStringEqual(pass || '', config.web.password)
    ) {
      return next();
    }
  }

  res.set('WWW-Authenticate', 'Basic realm="Alypay"');
  res.status(401).send('Autenticação necessária.');
}

app.use(basicAuth);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/debtors', async (req, res) => {
  try {
    const debtors = await getAllDebtors();
    res.json(debtors);
  } catch (error) {
    logger.error('Erro ao listar devedores no painel', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/debtors', async (req, res) => {
  try {
    await appendDebtor(req.body);
    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/debtors/:rowNumber', async (req, res) => {
  try {
    const rowNumber = Number(req.params.rowNumber);
    const { status } = req.body;
    if (!['pago', 'pendente'].includes(status)) {
      return res.status(400).json({ error: 'Status deve ser "pago" ou "pendente".' });
    }
    await updateDebtorStatus(rowNumber, status);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.put('/api/debtors/:rowNumber', async (req, res) => {
  try {
    const rowNumber = Number(req.params.rowNumber);
    await updateDebtor(rowNumber, req.body);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/debtors/:rowNumber', async (req, res) => {
  try {
    const rowNumber = Number(req.params.rowNumber);
    await deleteDebtor(rowNumber);
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const port = config.web.port;
app.listen(port, () => {
  logger.info('Painel web iniciado', { port });
  console.log(`\nPainel de cobrança disponível em: http://localhost:${port}\n`);
});
