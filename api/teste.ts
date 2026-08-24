import { getEnv, json, nodeHandler, serverError } from './_core.js';
export default nodeHandler(async function handler(request: Request) {
    if (request.method !== 'GET') return json({ error: 'Método não permitido' }, 405);
    try {
      const { supabaseUrl } = getEnv();
      return json({ ok: true, supabaseConfigured: Boolean(supabaseUrl), jwtConfigured: true });
    } catch (error) {
      return serverError(error, 'teste');
    }
});
