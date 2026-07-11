import { sb, json } from '../../_shared/supabase.js';
import { resolvePrimoByToken } from '../../_shared/primo.js';

// POST /api/primo/pagamento  { token, valor, nota? }
// primo_id vem do token validado no servidor. Nasce status="pendente".
export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const primo = await resolvePrimoByToken(env, body.token);
  if (!primo) return json({ error: 'Link inválido.' }, 404);

  const { valor, nota } = body;
  const valorNum = Number(valor);
  if (!(valorNum > 0)) {
    return json({ error: 'Valor deve ser maior que zero.' }, 400);
  }

  const [created] = await sb(env, 'pagamentos', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      primo_id: primo.id,
      valor: valorNum,
      nota: typeof nota === 'string' && nota.trim() ? nota.trim() : null,
      status: 'pendente',
    }),
  });

  return json(created, 201);
}
