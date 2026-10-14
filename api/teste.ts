import { getEnv, json, nodeHandler, serverError } from './_core.js';
import { checkSheets } from './_sheets.js';
export default nodeHandler(async function handler(request: Request) {
    if (request.method !== 'GET') return json({ error: 'Método não permitido' }, 405);
    try {
      const { supabaseUrl } = getEnv();
      const sheets = await checkSheets();
      return json({ ok: true, supabaseConfigured: Boolean(supabaseUrl), jwtConfigured: true, googleSheets: sheets });
    } catch (error) {
      return serverError(error, 'teste');
    }
});
