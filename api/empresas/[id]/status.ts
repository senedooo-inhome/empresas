import { authOrResponse, getSupabase, json, mapEmpresa, pathSegment, readJson, serverError } from '../../_core';

export default {
  async fetch(request: Request) {
    if (request.method !== 'PATCH') return json({ error: 'Método não permitido' }, 405, { Allow: 'PATCH' });
    try {
      const auth = authOrResponse(request, true);
      if (auth.response) return auth.response;
      const id = pathSegment(request, '/api/empresas/');
      const body = await readJson(request);
      const supabase = getSupabase();
      const { data, error } = await supabase.from('empresas').update({ ativo: Boolean(body?.ativo) }).eq('id', id).select('*').maybeSingle();
      if (error) return json({ error: 'Não foi possível alterar o status da empresa.', details: error.message }, 500);
      if (!data) return json({ error: 'Empresa não encontrada' }, 404);
      return json(mapEmpresa(data));
    } catch (error) {
      return serverError(error, 'empresas/status');
    }
  },
};
