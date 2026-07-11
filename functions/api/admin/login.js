import { json } from '../../_shared/supabase.js';
import { timingSafeEqual } from '../../_shared/auth.js';

// POST /api/admin/login  { password }
// Só confirma se a senha bate — usado pra dar feedback imediato na UI.
// Toda rota admin de verdade revalida a senha por conta própria a cada
// chamada (header X-Admin-Password), então isso aqui não é uma "sessão".
export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const provided = String(body.password || '');
  const ok = Boolean(env.ADMIN_PASSWORD) && timingSafeEqual(provided, env.ADMIN_PASSWORD);
  return json({ ok }, ok ? 200 : 401);
}
