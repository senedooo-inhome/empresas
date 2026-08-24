import { json } from '../_core';
export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') return json({ error: 'Método não permitido' }, 405, { Allow: 'POST' });
    return new Response(null, {
      status: 204,
      headers: { 'Set-Cookie': 'sonax_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0', 'Cache-Control': 'no-store' },
    });
  },
};
