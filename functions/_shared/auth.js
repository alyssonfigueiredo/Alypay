import { json } from './supabase.js';

function timingSafeEqual(a, b) {
  const bufA = new TextEncoder().encode(a);
  const bufB = new TextEncoder().encode(b);
  if (bufA.length !== bufB.length) return false;
  let diff = 0;
  for (let i = 0; i < bufA.length; i += 1) diff |= bufA[i] ^ bufB[i];
  return diff === 0;
}

/**
 * Valida a senha de admin no header X-Admin-Password contra o secret
 * ADMIN_PASSWORD. Retorna uma Response 401 se inválida, ou null se ok.
 */
export function requireAdmin(request, env) {
  const provided = request.headers.get('x-admin-password') || '';
  if (!env.ADMIN_PASSWORD || !timingSafeEqual(provided, env.ADMIN_PASSWORD)) {
    return json({ error: 'Não autorizado.' }, 401);
  }
  return null;
}

export { timingSafeEqual };
