const { generatePreview } = require('../jobs/collectionJob');
const { formatBRL } = require('../utils/money');

async function main() {
  const preview = await generatePreview();

  console.log(`\nPreview de cobrança — ${preview.date}`);
  console.log(`Total de devedores pendentes e vencidos: ${preview.totalCount}`);
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

  console.log(`\nArquivo salvo em: logs/previews/preview-${preview.date}.json`);
  console.log(`Para aprovar e disparar as mensagens, rode: npm run approve -- ${preview.date}\n`);
}

main().catch((error) => {
  console.error('Erro ao gerar preview:', error.message);
  process.exit(1);
});
