import { sb, json } from '../../../_shared/supabase.js';
import { requireAdmin } from '../../../_shared/auth.js';

// PATCH /api/admin/primo/:id  { nome?, regenerar_token?, gerar_pin? }
// Regenerar o token invalida o link antigo na hora (token velho passa a
// não bater com nenhuma linha em "primos"). gerar_pin sorteia um novo
// PIN de 4 dígitos pro portal /entrar (derruba o PIN antigo).
export async function onRequestPatch({ request, env, params }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const patch = {};

  if (typeof body.nome === 'string' && body.nome.trim()) {
    patch.nome = body.nome.trim();
  }
  if (body.regenerar_token) {
    patch.token_acesso = crypto.randomUUID();
  }
  if (body.gerar_pin) {
    patch.pin_acesso = String(Math.floor(1000 + Math.random() * 9000));
  }

  if (Object.keys(patch).length === 0) {
    return json({ error: 'Nada para atualizar.' }, 400);
  }

  const [updated] = await sb(env, `primos?id=eq.${params.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(patch),
  });

  return json(updated);
}
