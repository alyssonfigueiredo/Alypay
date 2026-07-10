const path = require('path');
const express = require('express');
const config = require('../config/env');
const { logger } = require('../utils/logger');
const { getAllDebtors, appendDebtor, updateDebtorStatus } = require('../services/sheetsService');

const app = express();
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

const port = config.web.port;
app.listen(port, () => {
  logger.info('Painel web iniciado', { port });
  console.log(`\nPainel de cobrança disponível em: http://localhost:${port}\n`);
});
