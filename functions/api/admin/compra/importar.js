import { sb, json } from '../../../_shared/supabase.js';
import { requireAdmin } from '../../../_shared/auth.js';

const MES_RE = /^\d{4}-\d{2}$/;

// POST /api/admin/compra/importar  { primo_id, itens: [{descricao, total, parcelas, inicio_mes}] }
// Lança várias compras de um primo de uma vez (ex: várias linhas de uma
// fatura colada e revisada no admin). Cada item já entra aprovado, como
// qualquer lançamento feito pelo admin.
export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const { primo_id, itens } = body;
  if (!primo_id || !Array.isArray(itens) || itens.length === 0) {
    return json({ error: 'Selecione o primo e pelo menos um item.' }, 400);
  }

  const payload = [];
  for (const it of itens) {
    const total = Number(it.total);
    const parcelas = Number(it.parcelas);
    if (
      typeof it.descricao !== 'string' || !it.descricao.trim() ||
      !(total > 0) ||
      !Number.isInteger(parcelas) || parcelas < 1 || parcelas > 24 ||
      !MES_RE.test(it.inicio_mes || '')
    ) {
      return json({ error: 'Item inválido: ' + JSON.stringify(it) }, 400);
    }
    payload.push({
      primo_id,
      descricao: it.descricao.trim(),
      total,
      parcelas,
      inicio_mes: it.inicio_mes,
      tipo: 'compra',
    });
  }

  const created = await sb(env, 'compras', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });

  return json({ criados: created.length, compras: created }, 201);
}
