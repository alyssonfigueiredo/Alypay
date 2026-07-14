import { sb, json } from '../../_shared/supabase.js';

// Mesmo mapeamento do frontend (AVATAR_POR_ID em index.html) — por ID,
// não por nome, pra sobreviver a renomear o primo no admin. Duplicado
// aqui de propósito porque essa lista é pública: não pode vazar nome de
// ninguém, só o desenho.
const AVATAR_POR_ID = {
  '25f4f51d-98af-45f5-9839-fee0f32ad014': '/assets/avatar-xana.jpg',
  '8287f1f8-977e-459d-af09-55aee965c6e6': '/assets/avatar-veca.jpg',
};
function avatarFor(id) {
  return AVATAR_POR_ID[id] || '/assets/icon.jpg';
}

// GET /api/portal/avatares — lista pública (id + avatar, sem nome, sem
// token) pra montar o "quem é você" do portal de entrada.
export async function onRequestGet({ env }) {
  const primos = await sb(env, 'primos?select=id&order=created_at.asc');
  const avatares = primos.map((p) => ({ id: p.id, avatar: avatarFor(p.id) }));
  return json({ avatares });
}
