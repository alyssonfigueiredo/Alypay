import { sb, json } from '../../_shared/supabase.js';
import { requireAdmin } from '../../_shared/auth.js';

// POST /api/admin/pagamento  { primo_id, valor, data?, nota? }
export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const { primo_id, valor, data, nota } = body;
  const valorNum = Number(valor);

  if (!primo_id || !(valorNum > 0)) {
    return json({ error: 'Dados inválidos. Valor deve ser maior que zero.' }, 400);
  }

  const payload = {
    primo_id,
    valor: valorNum,
    nota: typeof nota === 'string' && nota.trim() ? nota.trim() : null,
  };
  if (typeof data === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
    payload.data = data;
  }

  const [created] = await sb(env, 'pagamentos', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  });

  return json(created, 201);
}
