import { sb, json } from '../../_shared/supabase.js';
import { requireAdmin } from '../../_shared/auth.js';

// POST /api/admin/import — restaura um backup exportado pelo próprio
// painel. Faz upsert por id (mesmo projeto Supabase), não cria duplicata.
export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (
    !body ||
    !Array.isArray(body.primos) ||
    !Array.isArray(body.compras) ||
    !Array.isArray(body.pagamentos)
  ) {
    return json({ error: 'Arquivo de backup inválido.' }, 400);
  }

  const upsert = (table, rows) =>
    rows.length
      ? sb(env, `${table}?on_conflict=id`, {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates' },
          body: JSON.stringify(rows),
        })
      : null;

  await upsert('primos', body.primos);
  await upsert('compras', body.compras);
  await upsert('pagamentos', body.pagamentos);

  return json({ ok: true });
}
