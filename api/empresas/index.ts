import { getSupabase, handleServerError, mapEmpresa, requireAuth, requireSupervisor } from '../../serverless/core';

export default async function handler(req: any, res: any) {
  try {
    const supabase = getSupabase();

    if (req.method === 'GET') {
      if (!requireAuth(req, res)) return;
      let query = supabase.from('empresas').select('*').order('nome', { ascending: true });
      if (String(req.query?.ativas || '') === 'true') query = query.eq('ativo', true);
      const { data, error } = await query;
      if (error) return res.status(500).json({ error: 'Não foi possível consultar as empresas.' });
      return res.status(200).json((data || []).map(mapEmpresa));
    }

    if (req.method === 'POST') {
      if (!requireSupervisor(req, res)) return;
      const payload = {
        nome: String(req.body?.nome || '').trim(),
        nicho: String(req.body?.nicho || '').trim(),
        segmento: String(req.body?.segmento || '').trim(),
        link_sistema: String(req.body?.link_sistema || '').trim(),
        resumo: String(req.body?.resumo || '').trim(),
        logo_url: String(req.body?.logo_url || '').trim(),
        ativo: req.body?.ativo ?? true,
      };
      if (!payload.nome || !payload.nicho || !payload.segmento || !payload.link_sistema || !payload.resumo) {
        return res.status(400).json({ error: 'Preencha todos os campos obrigatórios da empresa.' });
      }
      const { data, error } = await supabase.from('empresas').insert(payload).select('*').single();
      if (error) {
        console.error('[empresas POST] Supabase:', error);
        return res.status(500).json({ error: 'Não foi possível salvar a empresa.' });
      }
      return res.status(201).json(mapEmpresa(data));
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    return handleServerError(res, error, 'empresas');
  }
}
