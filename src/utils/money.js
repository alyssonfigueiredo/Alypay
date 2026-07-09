/**
 * Converte um valor de "valor devido" vindo da planilha (que pode estar
 * como "1234.56", "1234,56" ou "R$ 1.234,56") para um Number.
 * Retorna null se não for possível converter.
 */
function parseMoney(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;
  if (typeof rawValue === 'number') return rawValue;

  let value = String(rawValue).trim().replace(/[R$\s]/g, '');

  // Formato BR "1.234,56" -> remove separador de milhar, troca vírgula por ponto.
  if (/,\d{1,2}$/.test(value)) {
    value = value.replace(/\./g, '').replace(',', '.');
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

module.exports = { parseMoney, formatBRL };
