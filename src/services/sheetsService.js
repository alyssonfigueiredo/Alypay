const { google } = require('googleapis');
const { JWT } = require('google-auth-library');
const config = require('../config/env');
const { logger, failureLogger } = require('../utils/logger');
const { normalizeBrazilianPhone } = require('../utils/phoneNormalizer');
const { parseDueDate, isOverdue, formatDate } = require('../utils/dateUtils');
const { parseMoney } = require('../utils/money');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

function getAuthClient() {
  return new JWT({
    email: config.googleSheets.serviceAccountEmail,
    key: config.googleSheets.serviceAccountPrivateKey,
    scopes: SCOPES,
  });
}

// Mapeia cabeçalhos da planilha (case-insensitive, com/sem acento) para
// os campos internos usados pelo sistema.
const HEADER_ALIASES = {
  nome: 'name',
  telefone: 'phone',
  'valor devido': 'amount',
  'data de vencimento': 'dueDate',
  vencimento: 'dueDate',
  status: 'status',
};

const COMBINING_DIACRITICS_REGEX = new RegExp('[̀-ͯ]', 'g');

function normalizeHeader(header) {
  return String(header || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_DIACRITICS_REGEX, '');
}

function buildColumnMap(headerRow) {
  const map = {};
  headerRow.forEach((header, index) => {
    const key = HEADER_ALIASES[normalizeHeader(header)];
    if (key) map[key] = index;
  });
  return map;
}

/**
 * Lê a planilha e retorna todas as linhas já estruturadas, incluindo as
 * que falharam validação (para fins de log). Uso interno.
 */
async function readSheetRows() {
  const auth = getAuthClient();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.spreadsheetId,
    range: config.googleSheets.range,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) return [];

  const [headerRow, ...dataRows] = rows;
  const columnMap = buildColumnMap(headerRow);

  const requiredColumns = ['name', 'phone', 'amount', 'dueDate', 'status'];
  const missingColumns = requiredColumns.filter((col) => columnMap[col] === undefined);
  if (missingColumns.length > 0) {
    throw new Error(
      `Colunas esperadas não encontradas na planilha: ${missingColumns.join(', ')}. ` +
        'Verifique o cabeçalho (nome, telefone, valor devido, data de vencimento, status).'
    );
  }

  return dataRows
    .map((row, index) => ({
      rowNumber: index + 2, // +2 = compensa header e index base 0
      rawName: row[columnMap.name],
      rawPhone: row[columnMap.phone],
      rawAmount: row[columnMap.amount],
      rawDueDate: row[columnMap.dueDate],
      rawStatus: row[columnMap.status],
    }))
    .filter((row) => row.rawName || row.rawPhone); // ignora linhas totalmente vazias
}

/**
 * Retorna apenas os devedores com status "pendente" e vencidos até hoje,
 * já normalizados (telefone em E.164, valor numérico, data parseada).
 * Linhas com dados inválidos são logadas em failures.log e excluídas.
 */
async function getOverdueDebtors() {
  const rows = await readSheetRows();
  const debtors = [];

  for (const row of rows) {
    const status = String(row.rawStatus || '').trim().toLowerCase();
    if (status !== 'pendente') continue;

    const dueDate = parseDueDate(row.rawDueDate);
    if (!dueDate) {
      failureLogger.warn('Linha ignorada: data de vencimento inválida', {
        rowNumber: row.rowNumber,
        rawDueDate: row.rawDueDate,
      });
      continue;
    }

    if (!isOverdue(dueDate)) continue;

    const phone = normalizeBrazilianPhone(row.rawPhone);
    if (!phone) {
      failureLogger.warn('Linha ignorada: telefone inválido', {
        rowNumber: row.rowNumber,
        rawPhone: row.rawPhone,
      });
      continue;
    }

    const amount = parseMoney(row.rawAmount);
    if (amount === null) {
      failureLogger.warn('Linha ignorada: valor devido inválido', {
        rowNumber: row.rowNumber,
        rawAmount: row.rawAmount,
      });
      continue;
    }

    const name = String(row.rawName || '').trim();
    if (!name) {
      failureLogger.warn('Linha ignorada: nome vazio', { rowNumber: row.rowNumber });
      continue;
    }

    debtors.push({
      rowNumber: row.rowNumber,
      name,
      phone,
      amount,
      dueDate,
      dueDateFormatted: formatDate(dueDate),
    });
  }

  logger.info('Leitura da planilha concluída', {
    totalLinhas: rows.length,
    pendentesVencidos: debtors.length,
  });

  return debtors;
}

module.exports = { getOverdueDebtors };
