import { getSupabase, handleServerError, mapRecado, requireAuth } from '../../../../serverless/core';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido' });
  }
  try {
    if (!requireAuth(req, res)) return;
    const empresaId = String(req.query?.empresaId || '');
    const dataHoje = String(req.query?.dataHoje || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataHoje)) {
      return res.status(400).json({ error: 'Data inválida.' });
    }
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('recados')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('data_recado', dataHoje)
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: 'Não foi possível consultar os recados.' });
    return res.status(200).json((data || []).map(mapRecado));
  } catch (error) {
    return handleServerError(res, error, 'recados/empresa/hoje');
  }
}
