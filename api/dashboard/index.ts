import { authOrResponse, getSupabase, json, nodeHandler, serverError } from '../_core.js';

export default nodeHandler(async function handler(request: Request) {
  if (request.method !== 'GET') return json({ error: 'Método não permitido' }, 405, { Allow: 'GET' });
  try {
    const auth = authOrResponse(request, true);
    if (auth.response) return auth.response;
    const supabase = getSupabase();
    const hoje = new URL(request.url).searchParams.get('data') || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

    const [{ data: agentes, error: agentesError }, { data: acessos, error: acessosError }, { data: recados, error: recadosError }] = await Promise.all([
      supabase.from('usuarios').select('id, auth_user_id, login, nome, ramal, nicho_agente, turno').eq('role', 'agente').eq('ativo', true).order('nome'),
      supabase.from('agente_acessos').select('usuario_id, login_em').eq('data_acesso', hoje),
      supabase.from('recados').select('id, empresa_id, empresa_nome, mensagem, data_inicio, data_fim, updated_at').lte('data_inicio', hoje).gte('data_fim', hoje),
    ]);
    if (agentesError || acessosError || recadosError) return json({ error: 'Não foi possível montar o dashboard.', details: agentesError?.message || acessosError?.message || recadosError?.message }, 500);

    const recadoIds = (recados || []).map((r: any) => r.id);
    let leituras: any[] = [];
    if (recadoIds.length) {
      const { data, error } = await supabase.from('recados_leituras').select('recado_id, usuario_id, recado_updated_at, confirmado_em, tipo').in('recado_id', recadoIds);
      if (error) return json({ error: 'Não foi possível consultar confirmações.', details: error.message }, 500);
      leituras = data || [];
    }

    const entrou = new Set((acessos || []).map((a: any) => String(a.usuario_id)));
    const acessosPorUsuario = new Map<string, string>();
    for (const a of acessos || []) {
      const prev = acessosPorUsuario.get(String(a.usuario_id));
      if (!prev || String(a.login_em) > prev) acessosPorUsuario.set(String(a.usuario_id), String(a.login_em));
    }

    const statusAgentes = (agentes || []).map((ag: any) => {
      const uid = String(ag.auth_user_id || ag.id);
      const pendentes = (recados || []).filter((rec: any) => !leituras.some((l: any) => String(l.usuario_id) === uid && String(l.recado_id) === String(rec.id) && new Date(l.recado_updated_at).getTime() === new Date(rec.updated_at).getTime()));
      return { ...ag, acessou_hoje: entrou.has(uid), ultimo_acesso_hoje: acessosPorUsuario.get(uid) || null, recados_pendentes: pendentes.length };
    });

    return json({ data: hoje, agentes: statusAgentes, acessos_hoje: statusAgentes.filter((a: any) => a.acessou_hoje), pendentes_ciencia: statusAgentes.filter((a: any) => a.recados_pendentes > 0), total_recados_vigentes: (recados || []).length });
  } catch (error) {
    return serverError(error, 'dashboard');
  }
});
