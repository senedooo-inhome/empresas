import { authenticate, getEnv, handleServerError } from '../../serverless/core';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    getEnv();
    const user = authenticate(req);
    if (!user) return res.status(401).json({ error: 'Não autorizado' });
    return res.status(200).json({ user });
  } catch (error) {
    return handleServerError(res, error, 'auth/me');
  }
}
