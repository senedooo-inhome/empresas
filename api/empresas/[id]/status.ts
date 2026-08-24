import { getSupabase, handleServerError, mapEmpresa, requireSupervisor } from '../../../serverless/core';

export default async function handler(req: any, res: any) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH');
    return res.status(405).json({ error: 'Método não permitido' });
  }
  try {
    if (!requireSupervisor(req, res)) return;
    const id = String(req.query?.id || '');
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('empresas')
      .update({ ativo: Boolean(req.body?.ativo) })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) return res.status(500).json({ error: 'Não foi possível alterar o status da empresa.' });
    if (!data) return res.status(404).json({ error: 'Empresa não encontrada' });
    return res.status(200).json(mapEmpresa(data));
  } catch (error) {
    return handleServerError(res, error, 'empresas/status');
  }
}
