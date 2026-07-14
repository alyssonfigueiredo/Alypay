import { sb, json } from '../../../_shared/supabase.js';
import { requireAdmin } from '../../../_shared/auth.js';

const MES_RE = /^\d{4}-\d{2}$/;

// GET /api/admin/gastos/resumo?mes=YYYY-MM
// Total líquido do mês (só status='proprio' — de_primo já é dívida
// deles, ignorado não é gasto de verdade) + breakdown por categoria +
// os lançamentos individuais do mês (pra tabela de revisão e pro PATCH
// de categoria/status na mão — não existe endpoint de listagem à parte).
// "quantidade" conta QUALQUER lançamento do mês (inclusive de_primo/
// ignorado), pra saber se o mês já foi importado.
export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const mes = new URL(request.url).searchParams.get('mes');
  if (!MES_RE.test(mes || '')) {
    return json({ error: 'Parâmetro "mes" inválido (esperado YYYY-MM).' }, 400);
  }

  const [ano, m] = mes.split('-').map(Number);
  const proximoMes = m === 12 ? `${ano + 1}-01` : `${ano}-${String(m + 1).padStart(2, '0')}`;
  const lancamentos = await sb(
    env,
    `lancamentos_pessoais?select=id,data,descricao,valor,origem,categoria,status,compra_relacionada_id` +
      `&data=gte.${mes}-01&data=lt.${proximoMes}-01&order=data.desc`
  );

  const proprios = lancamentos.filter((l) => l.status === 'proprio');
  const total = round2(proprios.reduce((s, l) => s + Number(l.valor), 0));
  const porCategoria = {};
  for (const l of proprios) {
    const cat = l.categoria || 'outros';
    porCategoria[cat] = round2((porCategoria[cat] || 0) + Number(l.valor));
  }

  return json({ mes, total, porCategoria, quantidade: lancamentos.length, lancamentos });
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }
