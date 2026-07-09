const fs = require('fs/promises');
const path = require('path');
const config = require('../config/env');
const { logger } = require('../utils/logger');
const { todayKey } = require('../utils/dateUtils');
const { getOverdueDebtors } = require('../services/sheetsService');
const { sendCollectionTemplate } = require('../services/whatsappService');
const { sleep } = require('../utils/sleep');

const LOGS_DIR = path.resolve(__dirname, '../../logs');
const PREVIEWS_DIR = path.join(LOGS_DIR, 'previews');
const APPROVALS_DIR = path.join(LOGS_DIR, 'approvals');
const SENT_DIR = path.join(LOGS_DIR, 'sent');

const previewPath = (date) => path.join(PREVIEWS_DIR, `preview-${date}.json`);
const approvalPath = (date) => path.join(APPROVALS_DIR, `${date}.json`);
const sentPath = (date) => path.join(SENT_DIR, `${date}.json`);

async function readJsonIfExists(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function isApproved(date) {
  const approval = await readJsonIfExists(approvalPath(date));
  return Boolean(approval);
}

/**
 * Consulta a planilha e grava o preview do dia (quem seria cobrado),
 * sem disparar nenhuma mensagem. Se o dia já tiver sido aprovado, não
 * regenera o preview (evitaria divergência com o que já foi aprovado/enviado).
 */
async function generatePreview(date = todayKey()) {
  if (await isApproved(date)) {
    logger.info('Preview não regenerado: dia já aprovado', { date });
    return readJsonIfExists(previewPath(date));
  }

  const debtors = await getOverdueDebtors();
  const totalAmount = debtors.reduce((sum, d) => sum + d.amount, 0);

  const preview = {
    date,
    generatedAt: new Date().toISOString(),
    totalCount: debtors.length,
    totalAmount,
    debtors: debtors.map((d) => ({
      rowNumber: d.rowNumber,
      name: d.name,
      phone: d.phone,
      amount: d.amount,
      dueDate: d.dueDateFormatted,
    })),
  };

  await writeJson(previewPath(date), preview);
  logger.info('Preview gerado', { date, totalCount: preview.totalCount, totalAmount });
  return preview;
}

/**
 * Marca o dia como aprovado para disparo. Não envia mensagens por si só —
 * quem envia é sendApprovedList, chamado em seguida pelo script de aprovação.
 */
async function markApproved(date, approvedBy = 'manual') {
  await writeJson(approvalPath(date), { date, approvedAt: new Date().toISOString(), approvedBy });
  logger.info('Dia aprovado para disparo', { date, approvedBy });
}

/**
 * Envia as mensagens de cobrança do preview já aprovado para o dia,
 * respeitando rate limit entre envios e pulando quem já foi enviado
 * (idempotência, útil se o processo for reexecutado após falha parcial).
 */
async function sendApprovedList(date = todayKey()) {
  const preview = await readJsonIfExists(previewPath(date));
  if (!preview) {
    throw new Error(`Nenhum preview encontrado para ${date}. Rode "npm run preview" primeiro.`);
  }

  if (!(await isApproved(date))) {
    throw new Error(`O dia ${date} ainda não foi aprovado. Rode "npm run approve" primeiro.`);
  }

  const sentLog = (await readJsonIfExists(sentPath(date))) || { date, sent: [] };
  const alreadySentPhones = new Set(sentLog.sent.map((s) => s.phone));

  const pending = preview.debtors.filter((d) => !alreadySentPhones.has(d.phone));

  logger.info('Iniciando disparo de cobranças', {
    date,
    total: preview.debtors.length,
    jaEnviados: alreadySentPhones.size,
    aEnviar: pending.length,
  });

  let successCount = 0;
  let failureCount = 0;

  for (const debtor of pending) {
    const result = await sendCollectionTemplate(debtor);

    if (result.success) {
      successCount += 1;
      sentLog.sent.push({
        phone: debtor.phone,
        name: debtor.name,
        rowNumber: debtor.rowNumber,
        messageId: result.messageId,
        sentAt: new Date().toISOString(),
      });
    } else {
      failureCount += 1;
    }

    // Persiste incrementalmente para não perder progresso em caso de falha do processo.
    await writeJson(sentPath(date), sentLog);

    if (debtor !== pending[pending.length - 1]) {
      await sleep(config.whatsapp.sendDelayMs);
    }
  }

  const summary = {
    date,
    total: preview.debtors.length,
    enviados: successCount,
    falhas: failureCount,
    pulados: alreadySentPhones.size,
  };

  logger.info('Disparo de cobranças concluído', summary);
  return summary;
}

module.exports = {
  generatePreview,
  markApproved,
  sendApprovedList,
  isApproved,
  previewPath,
  approvalPath,
  sentPath,
  readJsonIfExists,
};
