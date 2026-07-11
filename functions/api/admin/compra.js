import { sb, json } from '../../_shared/supabase.js';
import { requireAdmin } from '../../_shared/auth.js';

const MES_RE = /^\d{4}-\d{2}$/;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/admin/compra  { primo_id, descricao, total, parcelas, inicio_mes, recorrente?, tipo?, prazo? }
// tipo "emprestimo": dinheiro emprestado direto, não é compra de
// cartão — sempre grava 1 parcela só (é um valor fechado, não parcelado
// entre lojas), e aceita um "prazo" opcional pra devolução (informativo,
// não entra em nenhum cálculo). Lançado pelo admin, então já nasce
// aprovado.
export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const { primo_id, descricao, total, parcelas, inicio_mes, recorrente, prazo } = body;
  const tipo = body.tipo === 'emprestimo' ? 'emprestimo' : 'compra';
  const isEmprestimo = tipo === 'emprestimo';

  const totalNum = Number(total);
  const parcelasNum = isEmprestimo ? 1 : recorrente ? null : Number(parcelas);

  const parcelasValidas =
    isEmprestimo || recorrente
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

  const payload = {
    primo_id,
    descricao: descricao.trim(),
    total: totalNum,
    parcelas: parcelasNum,
    inicio_mes,
    tipo,
  };
  if (isEmprestimo && typeof prazo === 'string' && DATA_RE.test(prazo)) {
    payload.prazo = prazo;
  }

  const [created] = await sb(env, 'compras', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });

  return json(created, 201);
}
