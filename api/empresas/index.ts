import { authOrResponse, getSupabase, json, mapEmpresa, readJson, serverError } from '../_core';

export default async function handler(request: Request) {
    try {
      const supabase = getSupabase();
      const url = new URL(request.url);

      if (request.method === 'GET') {
        const auth = authOrResponse(request);
        if (auth.response) return auth.response;
        let query = supabase.from('empresas').select('*').order('nome', { ascending: true });
        if (url.searchParams.get('ativas') === 'true') query = query.eq('ativo', true);
        const { data, error } = await query;
        if (error) return json({ error: 'Não foi possível consultar as empresas.', details: error.message }, 500);
        return json((data || []).map(mapEmpresa));
      }

      if (request.method === 'POST') {
        const auth = authOrResponse(request, true);
        if (auth.response) return auth.response;
        const body = await readJson(request);
        const payload = {
          nome: String(body?.nome || '').trim(),
          nicho: String(body?.nicho || '').trim(),
          segmento: String(body?.segmento || '').trim(),
          link_sistema: String(body?.link_sistema || '').trim(),
          resumo: String(body?.resumo || '').trim(),
          logo_url: String(body?.logo_url || '').trim(),
          ativo: body?.ativo ?? true,
        };
        if (!payload.nome || !payload.nicho || !payload.segmento || !payload.link_sistema || !payload.resumo) {
          return json({ error: 'Preencha todos os campos obrigatórios da empresa.' }, 400);
        }
        const { data, error } = await supabase.from('empresas').insert(payload).select('*').single();
        if (error) return json({ error: 'Não foi possível salvar a empresa.', details: error.message }, 500);
        return json(mapEmpresa(data), 201);
      }

      return json({ error: 'Método não permitido' }, 405, { Allow: 'GET, POST' });
    } catch (error) {
      return serverError(error, 'empresas');
    }
}
