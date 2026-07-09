const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED_VARS = [
  'WHATSAPP_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_TEMPLATE_NAME',
  'WHATSAPP_TEMPLATE_LANGUAGE',
  'GOOGLE_SHEETS_SPREADSHEET_ID',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
];

function requireEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key] || process.env[key].trim() === '');
  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}. ` +
        'Confira o arquivo .env (veja .env.example para referência).'
    );
  }
}

requireEnv();

module.exports = {
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
    templateName: process.env.WHATSAPP_TEMPLATE_NAME,
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE,
    sendDelayMs: Number(process.env.WHATSAPP_SEND_DELAY_MS || 1200),
    maxRetries: Number(process.env.WHATSAPP_MAX_RETRIES || 3),
    retryBaseDelayMs: Number(process.env.WHATSAPP_RETRY_BASE_DELAY_MS || 2000),
  },
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    range: process.env.GOOGLE_SHEETS_RANGE || 'Página1!A:E',
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    // O private key vem do .env com \n escapado (texto literal), precisa
    // ser convertido de volta para quebras de linha reais.
    serviceAccountPrivateKey: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  cron: {
    schedule: process.env.CRON_SCHEDULE || '0 9 * * *',
    timezone: process.env.CRON_TIMEZONE || 'America/Sao_Paulo',
  },
  business: {
    defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE || '55',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
