// Wrapper fino sobre a REST API (PostgREST) do Supabase, usando a
// service_role key. Roda só no servidor (Cloudflare Pages Functions) —
// essa key nunca deve chegar ao navegador.

function headers(env, extra) {
  return {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function sb(env, path, init = {}) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: headers(env, init.headers),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${text}`);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
