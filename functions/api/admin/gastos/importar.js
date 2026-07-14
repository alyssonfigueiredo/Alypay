import { sb, json } from '../../../_shared/supabase.js';
import { requireAdmin } from '../../../_shared/auth.js';
import { parcelaNoMes } from '../../../_shared/parcela.js';

const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const ORIGEM_VALIDA = ['extrato', 'fatura'];

function normalizar(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ');
}

// Acha a compra de primo que essa transação provavelmente paga: mesmo
// valor da parcela ativa no mês da transação (tolerância de 1 centavo,
// por causa de arredondamento), com o nome do primo ou uma palavra da
// descrição da compra aparecendo no texto do banco como desempate quando
// mais de uma compra bate no valor.
function acharCompraRelacionada(lancamento, compras, primos) {
  const mes = lancamento.data.slice(0, 7);
  const candidatas = compras
    .filter((c) => c.status !== 'rejeitado')
    .map((c) => ({ compra: c, valor: parcelaNoMes(c, mes) }))
    .filter((x) => x.valor !== null && Math.abs(x.valor - lancamento.valor) < 0.01);

  if (candidatas.length === 0) return null;
  if (candidatas.length === 1) return candidatas[0].compra;

  const textoBanco = normalizar(lancamento.descricao);
  const comScore = candidatas.map((x) => {
    const primo = primos.find((p) => p.id === x.compra.primo_id);
    const primeiroNome = normalizar((primo && primo.nome.split(' ')[0]) || '');
    const palavrasCompra = normalizar(x.compra.descricao).split(' ').filter((w) => w.length >= 4);
    const bate = (primeiroNome && textoBanco.includes(primeiroNome)) ||
      palavrasCompra.some((w) => textoBanco.includes(w));
    return { ...x, bate };
  });
  return (comScore.find((x) => x.bate) || comScore[0]).compra;
}

// POST /api/admin/gastos/importar  { lancamentos: [{data, descricao, valor, origem, categoria?}] }
export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const lancamentos = Array.isArray(body.lancamentos) ? body.lancamentos : [];
  if (lancamentos.length === 0) {
    return json({ error: 'Nenhum lançamento para importar.' }, 400);
  }
  for (const l of lancamentos) {
    if (
      !DATA_RE.test(l.data) ||
      typeof l.descricao !== 'string' || !l.descricao.trim() ||
      !(Number(l.valor) > 0) ||
      !ORIGEM_VALIDA.includes(l.origem)
    ) {
      return json({ error: 'Lançamento inválido: ' + JSON.stringify(l) }, 400);
    }
  }

  const [compras, primos] = await Promise.all([
    sb(env, 'compras?select=id,primo_id,descricao,total,parcelas,inicio_mes,status'),
    sb(env, 'primos?select=id,nome'),
  ]);

  const payload = lancamentos.map((l) => {
    const relacionada = acharCompraRelacionada(l, compras, primos);
    return {
      data: l.data,
      descricao: l.descricao.trim(),
      valor: Number(l.valor),
      origem: l.origem,
      status: relacionada ? 'de_primo' : 'proprio',
      compra_relacionada_id: relacionada ? relacionada.id : null,
      categoria: typeof l.categoria === 'string' && l.categoria.trim() ? l.categoria.trim() : null,
    };
  });

  const created = await sb(env, 'lancamentos_pessoais', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });

  return json({ criados: created.length, lancamentos: created }, 201);
}
