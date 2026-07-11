import { sb } from './supabase.js';

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resolve um token de acesso pro primo dono dele, ou null se inválido.
// Centraliza a validação pra todo endpoint público (GET /api/primo,
// POST /api/primo/compra, POST /api/primo/pagamento) usar a mesma regra
// e nunca vazar detalhe sobre token "quase certo".
export async function resolvePrimoByToken(env, token) {
  if (typeof token !== 'string' || !TOKEN_RE.test(token)) return null;
  const primos = await sb(env, `primos?token_acesso=eq.${token}&select=id,nome`);
  return (primos && primos[0]) || null;
}
