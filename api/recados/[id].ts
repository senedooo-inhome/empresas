import { getSupabase, handleServerError, mapRecado, requireSupervisor } from '../../serverless/core';

export default async function handler(req: any, res: any) {
  try {
    const user = requireSupervisor(req, res);
    if (!user) return;
    const id = String(req.query?.id || '');
    const supabase = getSupabase();

    if (req.method === 'PUT') {
      const changes: any = {};
      if (req.body?.empresa_id !== undefined) {
        const empresaId = String(req.body.empresa_id);
        const { data: empresa } = await supabase.from('empresas').select('id, nome').eq('id', empresaId).maybeSingle();
        if (!empresa) return res.status(400).json({ error: 'Empresa inválida' });
        changes.empresa_id = empresaId;
        changes.empresa_nome = empresa.nome;
      }
      if (req.body?.data_recado !== undefined) changes.data_recado = String(req.body.data_recado);
      if (req.body?.mensagem !== undefined) changes.mensagem = String(req.body.mensagem).trim();
      if (req.body?.criado_por !== undefined) changes.criado_por = String(req.body.criado_por);
      changes.criado_por_email = user.email;

      const { data, error } = await supabase.from('recados').update(changes).eq('id', id).select('*').maybeSingle();
      if (error) return res.status(500).json({ error: 'Não foi possível atualizar o recado.' });
      if (!data) return res.status(404).json({ error: 'Recado não encontrado' });
      return res.status(200).json(mapRecado(data));
    }

    if (req.method === 'DELETE') {
      const { data, error } = await supabase.from('recados').delete().eq('id', id).select('id').maybeSingle();
      if (error) return res.status(500).json({ error: 'Não foi possível excluir o recado.' });
      if (!data) return res.status(404).json({ error: 'Recado não encontrado' });
      return res.status(204).end();
    }

    res.setHeader('Allow', 'PUT, DELETE');
    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error) {
    return handleServerError(res, error, 'recados/id');
  }
}
