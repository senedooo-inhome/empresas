import { authOrResponse, getSupabase, json, mapRecado, nodeHandler, pathSegment, serverError } from '../../../_core.js';

export default nodeHandler(async function handler(request: Request) {
  if (request.method !== 'GET') return json({ error: 'Método não permitido' }, 405, { Allow: 'GET' });
  try {
    const auth = authOrResponse(request);
    if (auth.response) return auth.response;
    const empresaId = pathSegment(request, '/api/recados/empresa/');
    const dataHoje = new URL(request.url).searchParams.get('dataHoje') || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    const supabase = getSupabase();
    const { data, error } = await supabase.from('recados').select('*').eq('empresa_id', empresaId).lte('data_inicio', dataHoje).gte('data_fim', dataHoje).order('created_at', { ascending: false });
    if (error) return json({ error: 'Não foi possível consultar os recados.', details: error.message }, 500);
    return json((data || []).map(mapRecado));
  } catch (error) {
    return serverError(error, 'recados/empresa/hoje');
  }
});
