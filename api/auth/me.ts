import { authenticate, getEnv, json, serverError } from '../_core';

export default async function handler(request: Request) {
    if (request.method !== 'GET') return json({ error: 'Método não permitido' }, 405, { Allow: 'GET' });
    try {
      getEnv();
      const user = authenticate(request);
      if (!user) return json({ error: 'Não autorizado' }, 401);
      return json({ user }, 200, { 'Cache-Control': 'no-store' });
    } catch (error) {
      return serverError(error, 'auth/me');
    }
}
