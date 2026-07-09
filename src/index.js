const cron = require('node-cron');
const config = require('./config/env');
const { logger } = require('./utils/logger');
const { generatePreview, isApproved } = require('./jobs/collectionJob');
const { todayKey } = require('./utils/dateUtils');

/**
 * Tarefa agendada: apenas consulta a planilha e grava o preview do dia.
 * O disparo em si só acontece via "npm run approve", que exige
 * confirmação manual — o cron nunca envia mensagens sozinho.
 */
async function dailyTick() {
  const date = todayKey();

  if (await isApproved(date)) {
    logger.info('Tick diário: dia já aprovado, nada a fazer', { date });
    return;
  }

  try {
    const preview = await generatePreview(date);
    logger.info('Tick diário: preview gerado, aguardando aprovação manual', {
      date,
      totalCount: preview.totalCount,
    });
    console.log(
      `\n[${date}] Preview gerado com ${preview.totalCount} devedor(es) pendente(s)/vencido(s). ` +
        `Rode "npm run approve" para revisar e aprovar o disparo de hoje.\n`
    );
  } catch (error) {
    logger.error('Tick diário: falha ao gerar preview', { date, error: error.message });
  }
}

if (!cron.validate(config.cron.schedule)) {
  throw new Error(`CRON_SCHEDULE inválido: "${config.cron.schedule}"`);
}

cron.schedule(config.cron.schedule, dailyTick, { timezone: config.cron.timezone });

logger.info('Agendador iniciado', {
  schedule: config.cron.schedule,
  timezone: config.cron.timezone,
});
console.log(
  `Alypay Cobrança WhatsApp iniciado.\n` +
    `Agendamento: "${config.cron.schedule}" (timezone: ${config.cron.timezone})\n` +
    `Comandos manuais: npm run preview | npm run approve -- [YYYY-MM-DD]\n`
);
