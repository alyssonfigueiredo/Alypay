import { sb, json } from '../_shared/supabase.js';
import { resolvePrimoByToken } from '../_shared/primo.js';

// GET /api/primo?t=<token_acesso>
// Retorna somente os dados do primo dono desse token. Token inválido ou
// ausente sempre recebe o mesmo erro genérico — nunca revela se o token
// "quase" existe ou detalhe nenhum de outro primo.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const token = url.searchParams.get('t') || '';

  const primo = await resolvePrimoByToken(env, token);
  if (!primo) {
    return json({ error: 'Link inválido.' }, 404);
  }

  const [compras, pagamentos] = await Promise.all([
    sb(
      env,
      `compras?primo_id=eq.${primo.id}&select=id,descricao,total,parcelas,inicio_mes,tipo,prazo,status&order=created_at.desc`
    ),
    sb(env, `pagamentos?primo_id=eq.${primo.id}&select=id,valor,data,nota,status&order=data.desc`),
  ]);

  return json({ primo, compras, pagamentos });
}
