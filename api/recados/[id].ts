import { authOrResponse, getSupabase, json, mapRecado, nodeHandler, pathSegment, readJson, serverError } from '../_core.js';

export default nodeHandler(async function handler(request: Request) {
    try {
      const auth = authOrResponse(request, true);
      if (auth.response || !auth.user) return auth.response!;
      const id = pathSegment(request, '/api/recados/');
      const supabase = getSupabase();

      if (request.method === 'PUT') {
        const body = await readJson(request);
        const changes: any = {};
        if (body?.empresa_id !== undefined) {
          const empresaId = String(body.empresa_id);
          const { data: empresa } = await supabase.from('empresas').select('id, nome').eq('id', empresaId).maybeSingle();
          if (!empresa) return json({ error: 'Empresa inválida' }, 400);
          changes.empresa_id = empresaId;
          changes.empresa_nome = empresa.nome;
        }
        if (body?.data_recado !== undefined) changes.data_recado = String(body.data_recado);
        if (body?.mensagem !== undefined) changes.mensagem = String(body.mensagem).trim();
        if (body?.criado_por !== undefined) changes.criado_por = String(body.criado_por);
        changes.criado_por_email = auth.user.email;
        const { data, error } = await supabase.from('recados').update(changes).eq('id', id).select('*').maybeSingle();
        if (error) return json({ error: 'Não foi possível atualizar o recado.', details: error.message }, 500);
        if (!data) return json({ error: 'Recado não encontrado' }, 404);
        return json(mapRecado(data));
      }

      if (request.method === 'DELETE') {
        const { data, error } = await supabase.from('recados').delete().eq('id', id).select('id').maybeSingle();
        if (error) return json({ error: 'Não foi possível excluir o recado.', details: error.message }, 500);
        if (!data) return json({ error: 'Recado não encontrado' }, 404);
        return new Response(null, { status: 204 });
      }

      return json({ error: 'Método não permitido' }, 405, { Allow: 'PUT, DELETE' });
    } catch (error) {
      return serverError(error, 'recados/id');
    }
});
