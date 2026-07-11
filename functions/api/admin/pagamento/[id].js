import { sb, json } from '../../../_shared/supabase.js';
import { requireAdmin } from '../../../_shared/auth.js';

// PATCH /api/admin/pagamento/:id  { status: 'aprovado' | 'rejeitado' }
export async function onRequestPatch({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  if (!['aprovado', 'rejeitado'].includes(body.status)) {
    return json({ error: 'Status inválido.' }, 400);
  }

  const [updated] = await sb(env, `pagamentos?id=eq.${params.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ status: body.status }),
  });

  return json(updated);
}

// DELETE /api/admin/pagamento/:id
export async function onRequestDelete({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  await sb(env, `pagamentos?id=eq.${params.id}`, { method: 'DELETE' });
  return new Response(null, { status: 204 });
}
