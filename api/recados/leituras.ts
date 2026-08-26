import { authOrResponse, getSupabase, json, nodeHandler, readJson, serverError } from '../_core.js';

export default nodeHandler(async function handler(request: Request) {
  try {
    const auth = authOrResponse(request);
    if (auth.response || !auth.user) return auth.response!;
    const supabase = getSupabase();
    const userId = auth.user.id;

    if (request.method === 'GET') {
      const url = new URL(request.url);
      const empresaId = url.searchParams.get('empresa_id');
      const hoje = url.searchParams.get('data') || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
      let query = supabase.from('recados').select('*').lte('data_inicio', hoje).gte('data_fim', hoje).order('data_inicio', { ascending: false }).order('created_at', { ascending: false });
      if (empresaId) query = query.eq('empresa_id', empresaId);
      const { data: recados, error } = await query;
      if (error) return json({ error: 'Não foi possível consultar os recados vigentes.', details: error.message }, 500);

      const ids = (recados || []).map((r: any) => r.id);
      let leituras: any[] = [];
      if (ids.length) {
        const { data, error: leituraError } = await supabase.from('recados_leituras').select('*').eq('usuario_id', userId).in('recado_id', ids).order('confirmado_em', { ascending: false });
        if (leituraError) return json({ error: 'Não foi possível consultar as leituras.', details: leituraError.message }, 500);
        leituras = data || [];
      }

      const result = (recados || []).map((rec: any) => {
        const history = leituras.filter((l: any) => String(l.recado_id) === String(rec.id));
        const atual = history.find((l: any) => new Date(l.recado_updated_at).getTime() === new Date(rec.updated_at).getTime());
        return {
          id: rec.id,
          empresa_id: rec.empresa_id,
          empresa_nome: rec.empresa_nome,
          data_inicio: rec.data_inicio,
          data_fim: rec.data_fim,
          data_recado: rec.data_inicio,
          mensagem: rec.mensagem,
          criado_por: rec.criado_por,
          criado_por_email: rec.criado_por_email,
          createdAt: rec.created_at,
          updatedAt: rec.updated_at,
          lido: Boolean(atual),
          teve_leitura_anterior: history.length > 0,
          confirmacao_tipo: atual?.tipo || null,
          confirmado_em: atual?.confirmado_em || null,
        };
      });
      return json(result);
    }

    if (request.method === 'POST') {
      if (auth.user.role !== 'agente') return json({ error: 'Somente agentes precisam confirmar recados.' }, 403);
      const body = await readJson(request);
      const recadoId = String(body?.recado_id || '');
      if (!recadoId) return json({ error: 'Recado obrigatório.' }, 400);
      const { data: recado, error } = await supabase.from('recados').select('id, updated_at').eq('id', recadoId).maybeSingle();
      if (error || !recado) return json({ error: 'Recado não encontrado.' }, 404);

      const { data: history } = await supabase.from('recados_leituras').select('id').eq('usuario_id', userId).eq('recado_id', recadoId).limit(1);
      const tipo = history?.length ? 'atualizacao' : 'lido';
      const payload = { recado_id: recadoId, usuario_id: userId, recado_updated_at: recado.updated_at, tipo };
      const { data, error: saveError } = await supabase.from('recados_leituras').upsert(payload, { onConflict: 'recado_id,usuario_id,recado_updated_at' }).select('*').single();
      if (saveError) return json({ error: 'Não foi possível confirmar a leitura.', details: saveError.message }, 500);
      return json(data, 201);
    }

    return json({ error: 'Método não permitido' }, 405, { Allow: 'GET, POST' });
  } catch (error) {
    return serverError(error, 'recados/leituras');
  }
});
