const axios = require('axios');
const config = require('../config/env');
const { logger, failureLogger } = require('../utils/logger');
const { sleep } = require('../utils/sleep');
const { formatBRL } = require('../utils/money');

const GRAPH_BASE_URL = 'https://graph.facebook.com';

function buildEndpoint() {
  return `${GRAPH_BASE_URL}/${config.whatsapp.apiVersion}/${config.whatsapp.phoneNumberId}/messages`;
}

function buildTemplatePayload(debtor) {
  return {
    messaging_product: 'whatsapp',
    to: debtor.phone,
    type: 'template',
    template: {
      name: config.whatsapp.templateName,
      language: { code: config.whatsapp.templateLanguage },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: debtor.name },
            { type: 'text', text: formatBRL(debtor.amount) },
            { type: 'text', text: debtor.dueDateFormatted },
          ],
        },
      ],
    },
  };
}

function isRetryableError(error) {
  if (!error.response) return true; // erro de rede/timeout
  const status = error.response.status;
  return status === 429 || status >= 500;
}

function extractErrorInfo(error) {
  if (error.response) {
    return {
      status: error.response.status,
      body: error.response.data,
    };
  }
  return { status: null, body: error.message };
}

/**
 * Envia a mensagem de template de cobrança para um devedor, com retry e
 * backoff exponencial em falhas transitórias (5xx, timeout, rate limit).
 * Erros permanentes (número inválido, token expirado, template incorreto)
 * não são retentados e vão direto para o log de falhas.
 */
async function sendCollectionTemplate(debtor) {
  const endpoint = buildEndpoint();
  const payload = buildTemplatePayload(debtor);
  const { maxRetries, retryBaseDelayMs } = config.whatsapp;

  let lastErrorInfo = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${config.whatsapp.token}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      });

      const messageId = response.data?.messages?.[0]?.id || null;
      logger.info('Mensagem enviada com sucesso', {
        phone: debtor.phone,
        name: debtor.name,
        messageId,
        attempt: attempt + 1,
      });

      return { success: true, messageId, attempts: attempt + 1 };
    } catch (error) {
      lastErrorInfo = extractErrorInfo(error);
      const retryable = isRetryableError(error);

      logger.warn('Falha ao enviar mensagem', {
        phone: debtor.phone,
        name: debtor.name,
        attempt: attempt + 1,
        retryable,
        status: lastErrorInfo.status,
      });

      if (!retryable || attempt === maxRetries) break;

      const backoffMs = retryBaseDelayMs * 2 ** attempt;
      await sleep(backoffMs);
    }
  }

  failureLogger.error('Envio de mensagem falhou definitivamente', {
    phone: debtor.phone,
    name: debtor.name,
    rowNumber: debtor.rowNumber,
    error: lastErrorInfo,
  });

  return { success: false, error: lastErrorInfo, attempts: maxRetries + 1 };
}

module.exports = { sendCollectionTemplate };
