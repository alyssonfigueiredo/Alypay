import { sb, json } from '../../_shared/supabase.js';
import { resolvePrimoByToken } from '../../_shared/primo.js';

const MES_RE = /^\d{4}-\d{2}$/;

// POST /api/primo/compra  { token, descricao, total, parcelas, inicio_mes }
// O primo só lança compra parcelada normal (recorrente e empréstimo
// ficam a critério do admin). primo_id vem sempre do token validado no
// servidor, nunca do corpo da requisição. Já entra aprovado — o admin
// vê na aba Atividade e pode contestar (PATCH status=rejeitado) depois.
export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const primo = await resolvePrimoByToken(env, body.token);
  if (!primo) return json({ error: 'Link inválido.' }, 404);

  const { descricao, total, parcelas, inicio_mes } = body;
  const totalNum = Number(total);
  const parcelasNum = Number(parcelas);

  if (
    typeof descricao !== 'string' ||
    !descricao.trim() ||
    !(totalNum > 0) ||
    !Number.isInteger(parcelasNum) ||
    parcelasNum < 1 ||
    parcelasNum > 24 ||
    !MES_RE.test(inicio_mes || '')
  ) {
    return json({ error: 'Dados inválidos. Confira valor, parcelas (1–24) e mês.' }, 400);
  }

  const [created] = await sb(env, 'compras', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      primo_id: primo.id,
      descricao: descricao.trim(),
      total: totalNum,
      parcelas: parcelasNum,
      inicio_mes,
      tipo: 'compra',
      origem: 'primo',
    }),
  });

  return json(created, 201);
}
