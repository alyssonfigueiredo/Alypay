import { sb, json } from '../_shared/supabase.js';

const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/primo?t=<token_acesso>
// Retorna somente os dados do primo dono desse token. Token inválido ou
// ausente sempre recebe o mesmo erro genérico — nunca revela se o token
// "quase" existe ou detalhe nenhum de outro primo.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('t') || '';

  if (!TOKEN_RE.test(token)) {
    return json({ error: 'Link inválido.' }, 404);
  }

  const primos = await sb(env, `primos?token_acesso=eq.${token}&select=id,nome`);
  const primo = primos && primos[0];
  if (!primo) {
    return json({ error: 'Link inválido.' }, 404);
  }

  const [compras, pagamentos] = await Promise.all([
    sb(
      env,
      `compras?primo_id=eq.${primo.id}&select=id,descricao,total,parcelas,inicio_mes&order=created_at.desc`
    ),
    sb(env, `pagamentos?primo_id=eq.${primo.id}&select=id,valor,data,nota&order=data.desc`),
  ]);

  return json({ primo, compras, pagamentos });
}
