import { authOrResponse, getSupabase, json, mapRecado, nodeHandler, readJson, serverError } from '../_core.js';

export default nodeHandler(async function handler(request: Request) {
    try {
      const supabase = getSupabase();
      const url = new URL(request.url);

      if (request.method === 'GET') {
        const auth = authOrResponse(request);
        if (auth.response) return auth.response;
        let query = supabase.from('recados').select('*').order('data_recado', { ascending: false }).order('created_at', { ascending: false });
        const empresaId = url.searchParams.get('empresa_id');
        const dataRecado = url.searchParams.get('data_recado');
        if (empresaId) query = query.eq('empresa_id', empresaId);
        if (dataRecado) query = query.eq('data_recado', dataRecado);
        const { data, error } = await query;
        if (error) return json({ error: 'Não foi possível consultar os recados.', details: error.message }, 500);
        return json((data || []).map(mapRecado));
      }

      if (request.method === 'POST') {
        const auth = authOrResponse(request, true);
        if (auth.response || !auth.user) return auth.response!;
        const body = await readJson(request);
        const empresaId = String(body?.empresa_id || '');
        const { data: empresa } = await supabase.from('empresas').select('id, nome').eq('id', empresaId).maybeSingle();
        if (!empresa) return json({ error: 'Empresa inválida' }, 400);
        const payload = {
          empresa_id: empresaId,
          empresa_nome: empresa.nome,
          data_recado: String(body?.data_recado || ''),
          mensagem: String(body?.mensagem || '').trim(),
          criado_por: String(body?.criado_por || auth.user.id),
          criado_por_email: auth.user.email,
        };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.data_recado) || !payload.mensagem) {
          return json({ error: 'Data e mensagem do recado são obrigatórias.' }, 400);
        }
        const { data, error } = await supabase.from('recados').insert(payload).select('*').single();
        if (error) return json({ error: 'Não foi possível salvar o recado.', details: error.message }, 500);
        return json(mapRecado(data), 201);
      }

      return json({ error: 'Método não permitido' }, 405, { Allow: 'GET, POST' });
    } catch (error) {
      return serverError(error, 'recados');
    }
});
