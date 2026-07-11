import { sb, json } from '../../_shared/supabase.js';
import { requireAdmin } from '../../_shared/auth.js';

const MES_RE = /^\d{4}-\d{2}$/;

// POST /api/admin/compra  { primo_id, descricao, total, parcelas, inicio_mes, recorrente? }
// Se recorrente=true, "parcelas" é ignorado/gravado como null: "total" vira
// o valor cobrado todo mês, sem data de fim (ex: assinatura).
export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const { primo_id, descricao, total, parcelas, inicio_mes, recorrente } = body;

  const totalNum = Number(total);
  const parcelasNum = recorrente ? null : Number(parcelas);

  const parcelasValidas = recorrente
    ? true
    : Number.isInteger(parcelasNum) && parcelasNum >= 1 && parcelasNum <= 24;

  if (
    !primo_id ||
    typeof descricao !== 'string' ||
    !descricao.trim() ||
    !(totalNum > 0) ||
    !parcelasValidas ||
    !MES_RE.test(inicio_mes || '')
  ) {
    return json({ error: 'Dados inválidos. Confira valor, parcelas (1–24) e mês.' }, 400);
  }

  const [created] = await sb(env, 'compras', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      primo_id,
      descricao: descricao.trim(),
      total: totalNum,
      parcelas: parcelasNum,
      inicio_mes,
    }),
  });

  return json(created, 201);
}
