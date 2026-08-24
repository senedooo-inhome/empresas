import { getSupabase, handleServerError, mapEmpresa, requireAuth, requireSupervisor } from '../../serverless/core';

export default async function handler(req: any, res: any) {
  try {
    const supabase = getSupabase();
    const id = String(req.query?.id || '');
    if (!id) return res.status(400).json({ error: 'ID da empresa não informado.' });

    if (req.method === 'GET') {
      if (!requireAuth(req, res)) return;
      const { data, error } = await supabase.from('empresas').select('*').eq('id', id).maybeSingle();
      if (error) return res.status(500).json({ error: 'Não foi possível consultar a empresa.' });
      if (!data) return res.status(404).json({ error: 'Empresa não encontrada' });
      return res.status(200).json(mapEmpresa(data));
    }

    if (req.method === 'PUT') {
      if (!requireSupervisor(req, res)) return;
      const changes: any = {};
      for (const key of ['nome', 'nicho', 'segmento', 'link_sistema', 'resumo', 'logo_url', 'ativo']) {
        if (req.body?.[key] !== undefined) changes[key] = req.body[key];
      }
      const { data, error } = await supabase.from('empresas').update(changes).eq('id', id).select('*').maybeSingle();
      if (error) return res.status(500).json({ error: 'Não foi possível atualizar a empresa.' });
      if (!data) return res.status(404).json({ error: 'Empresa não encontrada' });
      return res.status(200).json(mapEmpresa(data));
    }

    if (req.method === 'DELETE') {
      if (!requireSupervisor(req, res)) return;
      const { data: empresa, error } = await supabase.from('empresas').update({ ativo: false }).eq('id', id).select('*').maybeSingle();
      if (error) return res.status(500).json({ error: 'Não foi possível inativar a empresa.' });
      if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' });
      const { count } = await supabase.from('recados').select('id', { count: 'exact', head: true }).eq('empresa_id', id);
      return res.status(200).json({
        inativada: true,
        totalRecadosVinculados: count || 0,
        message: 'Empresa inativada com sucesso.',
      });
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    return handleServerError(res, error, 'empresas/id');
  }
}
