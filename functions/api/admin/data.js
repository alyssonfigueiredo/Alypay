import { sb, json } from '../../_shared/supabase.js';
import { requireAdmin } from '../../_shared/auth.js';

// GET /api/admin/data — dados completos dos DOIS primos (só pra o admin).
export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env);
  if (denied) return denied;

  const [primos, compras, pagamentos] = await Promise.all([
    sb(env, 'primos?select=id,nome,token_acesso,created_at&order=created_at.asc'),
    sb(
      env,
      'compras?select=id,primo_id,descricao,total,parcelas,inicio_mes,tipo,prazo,status,created_at&order=created_at.desc'
    ),
    sb(env, 'pagamentos?select=id,primo_id,valor,data,nota,status,created_at&order=data.desc'),
  ]);

  return json({ primos, compras, pagamentos });
}
