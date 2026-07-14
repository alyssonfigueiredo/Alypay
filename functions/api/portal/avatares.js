import { sb, json } from '../../_shared/supabase.js';

// Mesma lógica de mapeamento do frontend (avatarPrimo em index.html) —
// duplicada aqui de propósito, porque essa lista é pública e não pode
// vazar o nome de ninguém, só o desenho.
function avatarFor(nome) {
  const n = (nome || '').toLowerCase();
  if (n.includes('xana')) return '/assets/avatar-xana.jpg';
  if (n.includes('vec')) return '/assets/avatar-veca.jpg';
  return '/assets/icon.jpg';
}

// GET /api/portal/avatares — lista pública (id + avatar, sem nome, sem
// token) pra montar o "quem é você" do portal de entrada.
export async function onRequestGet({ env }) {
  const primos = await sb(env, 'primos?select=id,nome&order=created_at.asc');
  const avatares = primos.map((p) => ({ id: p.id, avatar: avatarFor(p.nome) }));
  return json({ avatares });
}
