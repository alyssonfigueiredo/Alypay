import { sb } from '../../../_shared/supabase.js';
import { requireAdmin } from '../../../_shared/auth.js';

// DELETE /api/admin/compra/:id
export async function onRequestDelete({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  await sb(env, `compras?id=eq.${params.id}`, { method: 'DELETE' });
  return new Response(null, { status: 204 });
}
