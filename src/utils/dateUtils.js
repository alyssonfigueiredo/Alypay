const dayjs = require('dayjs');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const config = require('../config/env');

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

const ACCEPTED_FORMATS = ['DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'];

/**
 * Faz o parse de uma data de vencimento vinda da planilha (esperado
 * DD/MM/YYYY, com fallback para ISO) na timezone configurada.
 * Retorna null se a data for inválida/vazia.
 */
function parseDueDate(rawDate) {
  if (!rawDate) return null;
  const value = String(rawDate).trim();

  for (const format of ACCEPTED_FORMATS) {
    // Valida em modo estrito, sem timezone, primeiro: passar uma string que
    // não bate com o formato direto para dayjs.tz(input, format, tz) lança
    // exceção em vez de retornar um objeto inválido (bug conhecido do plugin).
    const strict = dayjs(value, format, true);
    if (strict.isValid()) {
      return dayjs.tz(strict.format('YYYY-MM-DD'), config.cron.timezone).startOf('day');
    }
  }
  return null;
}

function today() {
  return dayjs().tz(config.cron.timezone).startOf('day');
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  return dueDate.isBefore(today());
}

function formatDate(dueDate) {
  return dueDate ? dueDate.format('DD/MM/YYYY') : '';
}

function todayKey() {
  return today().format('YYYY-MM-DD');
}

module.exports = { parseDueDate, today, isOverdue, formatDate, todayKey };
