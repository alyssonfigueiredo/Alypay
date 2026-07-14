import { json } from '../_shared/supabase.js';

// GET /api/pix — dados públicos da chave PIX do Alysson (pra qualquer
// primo montar o código Pix na hora, com ou sem valor embutido). Vem de
// secrets do Pages (PIX_*), igual ADMIN_PASSWORD — não tem no repo, e
// trocar exige um deploy pra valer.
export async function onRequestGet({ env }) {
  if (!env.PIX_CHAVE) return json({ disponivel: false });
  return json({
    disponivel: true,
    tipo: env.PIX_TIPO || '',
    nome: env.PIX_NOME || '',
    cidade: env.PIX_CIDADE || '',
    chave: env.PIX_CHAVE,
  });
}
