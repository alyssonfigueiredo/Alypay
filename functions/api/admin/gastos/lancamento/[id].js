import { sb, json } from '../../../../_shared/supabase.js';
import { requireAdmin } from '../../../../_shared/auth.js';

const STATUS_VALIDOS = ['proprio', 'de_primo', 'ignorado'];

// PATCH /api/admin/gastos/lancamento/:id  { status?, categoria? }
// Correção manual depois da importação automática (matching errado,
// categoria diferente da sugestão).
export async function onRequestPatch({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const patch = {};

  if (body.status !== undefined) {
    if (!STATUS_VALIDOS.includes(body.status)) {
      return json({ error: 'Status inválido.' }, 400);
    }
    patch.status = body.status;
    if (body.status !== 'de_primo') patch.compra_relacionada_id = null;
  }
  if (body.categoria !== undefined) {
    patch.categoria = typeof body.categoria === 'string' && body.categoria.trim() ? body.categoria.trim() : null;
  }

  if (Object.keys(patch).length === 0) {
    return json({ error: 'Nada para atualizar.' }, 400);
  }

  const [updated] = await sb(env, `lancamentos_pessoais?id=eq.${params.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });

  return json(updated);
}

// DELETE /api/admin/gastos/lancamento/:id
export async function onRequestDelete({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  await sb(env, `lancamentos_pessoais?id=eq.${params.id}`, { method: 'DELETE' });
  return new Response(null, { status: 204 });
}
