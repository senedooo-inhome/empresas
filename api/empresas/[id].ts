import { authOrResponse, getSupabase, json, mapEmpresa, pathSegment, readJson, serverError } from '../_core.js';

export default async function handler(request: Request) {
    try {
      const id = pathSegment(request, '/api/empresas/');
      if (!id) return json({ error: 'ID da empresa não informado.' }, 400);
      const supabase = getSupabase();

      if (request.method === 'GET') {
        const auth = authOrResponse(request);
        if (auth.response) return auth.response;
        const { data, error } = await supabase.from('empresas').select('*').eq('id', id).maybeSingle();
        if (error) return json({ error: 'Não foi possível consultar a empresa.', details: error.message }, 500);
        if (!data) return json({ error: 'Empresa não encontrada' }, 404);
        return json(mapEmpresa(data));
      }

      if (request.method === 'PUT') {
        const auth = authOrResponse(request, true);
        if (auth.response) return auth.response;
        const body = await readJson(request);
        const changes: any = {};
        for (const key of ['nome', 'nicho', 'segmento', 'link_sistema', 'resumo', 'logo_url', 'ativo']) {
          if (body?.[key] !== undefined) changes[key] = body[key];
        }
        const { data, error } = await supabase.from('empresas').update(changes).eq('id', id).select('*').maybeSingle();
        if (error) return json({ error: 'Não foi possível atualizar a empresa.', details: error.message }, 500);
        if (!data) return json({ error: 'Empresa não encontrada' }, 404);
        return json(mapEmpresa(data));
      }

      if (request.method === 'DELETE') {
        const auth = authOrResponse(request, true);
        if (auth.response) return auth.response;
        const { data: empresa, error } = await supabase.from('empresas').update({ ativo: false }).eq('id', id).select('*').maybeSingle();
        if (error) return json({ error: 'Não foi possível inativar a empresa.', details: error.message }, 500);
        if (!empresa) return json({ error: 'Empresa não encontrada' }, 404);
        const { count } = await supabase.from('recados').select('id', { count: 'exact', head: true }).eq('empresa_id', id);
        return json({ inativada: true, totalRecadosVinculados: count || 0, message: 'Empresa inativada com sucesso.' });
      }

      return json({ error: 'Método não permitido' }, 405, { Allow: 'GET, PUT, DELETE' });
    } catch (error) {
      return serverError(error, 'empresas/id');
    }
}
