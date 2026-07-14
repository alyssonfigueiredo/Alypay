import { sb, json } from '../../_shared/supabase.js';
import { timingSafeEqual } from '../../_shared/auth.js';

const PIN_RE = /^\d{4}$/;

// POST /api/portal/entrar  { primo_id, pin }
// Trava leve do portal: confere o PIN de 4 dígitos do primo escolhido e,
// se bater, devolve o token de acesso dele (o resto do app já sabe usar
// isso via /?t=<token>). Erro sempre genérico — não revela se o
// primo_id existe, se ele ainda não tem PIN gerado, ou só o PIN errou.
export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const { primo_id, pin } = body;

  if (!primo_id || !PIN_RE.test(pin || '')) {
    return json({ error: 'PIN inválido.' }, 400);
  }

  const rows = await sb(env, `primos?id=eq.${primo_id}&select=token_acesso,pin_acesso`);
  const primo = rows[0];

  if (!primo || !primo.pin_acesso || !timingSafeEqual(pin, primo.pin_acesso)) {
    return json({ error: 'PIN incorreto.' }, 401);
  }

  return json({ token: primo.token_acesso });
}
