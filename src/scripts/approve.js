const readline = require('readline');
const {
  generatePreview,
  markApproved,
  sendApprovedList,
  isApproved,
  readJsonIfExists,
  previewPath,
} = require('../jobs/collectionJob');
const { todayKey } = require('../utils/dateUtils');
const { formatBRL } = require('../utils/money');

function askConfirmation(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase());
    });
  });
}

async function main() {
  const date = process.argv[2] || todayKey();

  let preview = await readJsonIfExists(previewPath(date));
  if (!preview) {
    console.log(`Nenhum preview encontrado para ${date}. Gerando agora a partir da planilha...`);
    preview = await generatePreview(date);
  }

  if (preview.totalCount === 0) {
    console.log(`Nenhum devedor pendente/vencido para ${date}. Nada a aprovar.`);
    return;
  }

  console.log(`\nPreview de cobrança — ${date}`);
  console.log(`Total de devedores: ${preview.totalCount}`);
  console.log(`Valor total: ${formatBRL(preview.totalAmount)}\n`);

  console.table(
    preview.debtors.map((d) => ({
      linha: d.rowNumber,
      nome: d.name,
      telefone: d.phone,
      valor: formatBRL(d.amount),
      vencimento: d.dueDate,
    }))
  );

  const alreadyApproved = await isApproved(date);
  if (!alreadyApproved) {
    const answer = await askConfirmation(
      `\nDigite CONFIRMAR para aprovar o disparo de ${preview.totalCount} mensagem(ns) em ${date}: `
    );
    if (answer !== 'CONFIRMAR') {
      console.log('Aprovação cancelada. Nenhuma mensagem foi enviada.');
      return;
    }
    await markApproved(date);
  } else {
    console.log(`\nDia ${date} já aprovado anteriormente. Reenviando apenas pendentes/falhos...`);
  }

  const summary = await sendApprovedList(date);

  console.log('\nResumo do disparo:');
  console.log(`  Total no preview: ${summary.total}`);
  console.log(`  Enviados agora:   ${summary.enviados}`);
  console.log(`  Falhas:           ${summary.falhas}`);
  console.log(`  Já enviados antes:${summary.pulados}`);
  console.log(`\nDetalhes em logs/app.log e logs/failures.log\n`);
}

main().catch((error) => {
  console.error('Erro ao aprovar/enviar cobranças:', error.message);
  process.exit(1);
});
