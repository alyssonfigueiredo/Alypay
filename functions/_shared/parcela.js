// ponytail: duplica a matemática de parcela que já existe em index.html
// (client). São 4 funções puras e pequenas — extrair pra um módulo
// importado pelos dois lados exigiria expor index.html como script
// separado, troca grande pra pouco ganho. Se a fórmula mudar, mudar nos
// dois lugares.

function isRecorrente(compra) {
  return compra.parcelas === null || compra.parcelas === undefined;
}

function mesesEntreInclusive(a, b) {
  const [y1, m1] = a.split('-').map(Number);
  const [y2, m2] = b.split('-').map(Number);
  return Math.max(0, (y2 - y1) * 12 + (m2 - m1) + 1);
}

function parcelaValor(compra, index) {
  if (isRecorrente(compra)) return Number(compra.total);
  const base = Math.floor((compra.total / compra.parcelas) * 100) / 100;
  const soma = Math.round((base * (compra.parcelas - 1) + Number.EPSILON) * 100) / 100;
  const ultima = Math.round((compra.total - soma + Number.EPSILON) * 100) / 100;
  return index === compra.parcelas - 1 ? ultima : base;
}

// Valor da parcela dessa compra que cai no mês "mes" (YYYY-MM), ou null
// se essa compra não tem nada vencendo nesse mês.
export function parcelaNoMes(compra, mes) {
  const idx = mesesEntreInclusive(compra.inicio_mes, mes) - 1;
  if (idx < 0) return null;
  if (!isRecorrente(compra) && idx >= compra.parcelas) return null;
  return parcelaValor(compra, idx);
}
