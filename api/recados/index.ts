import { getSupabase, handleServerError, mapRecado, requireAuth, requireSupervisor } from '../../serverless/core';

export default async function handler(req: any, res: any) {
  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      if (!requireAuth(req, res)) return;
      let query = supabase.from('recados').select('*').order('data_recado', { ascending: false }).order('created_at', { ascending: false });
      if (req.query?.empresa_id) query = query.eq('empresa_id', String(req.query.empresa_id));
      if (req.query?.data_recado) query = query.eq('data_recado', String(req.query.data_recado));
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: 'Não foi possível consultar os recados.' });
      return res.status(200).json((data || []).map(mapRecado));
    }

    if (req.method === 'POST') {
      const user = requireSupervisor(req, res);
      if (!user) return;
      const empresaId = String(req.body?.empresa_id || '');
      const { data: empresa } = await supabase.from('empresas').select('id, nome').eq('id', empresaId).maybeSingle();
      if (!empresa) return res.status(400).json({ error: 'Empresa inválida' });

      const payload = {
        empresa_id: empresaId,
        empresa_nome: empresa.nome,
        data_recado: String(req.body?.data_recado || ''),
        mensagem: String(req.body?.mensagem || '').trim(),
        criado_por: String(req.body?.criado_por || user.id),
        criado_por_email: user.email,
      };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.data_recado) || !payload.mensagem) {
        return res.status(400).json({ error: 'Data e mensagem do recado são obrigatórias.' });
      }
      const { data, error } = await supabase.from('recados').insert(payload).select('*').single();
      if (error) {
        console.error('[recados POST] Supabase:', error);
        return res.status(500).json({ error: 'Não foi possível salvar o recado.' });
      }
      return res.status(201).json(mapRecado(data));
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    return handleServerError(res, error, 'recados');
  }
}
