import { authOrResponse, getSupabase, json, nodeHandler, readJson, serverError } from './_core.js';

function normalizeLogin(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '') || 'agente';
}

function hojeSaoPaulo() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

export default nodeHandler(async function handler(request: Request) {
  try {
    const url = new URL(request.url);
    const action = String(url.searchParams.get('action') || '').toLowerCase();
    const auth = authOrResponse(request, action === 'agentes' || action === 'dashboard');
    if (auth.response || !auth.user) return auth.response!;

    const supabase = getSupabase();

    // -----------------------------------------------------------------------
    // AGENTES - somente supervisão
    // -----------------------------------------------------------------------
    if (action === 'agentes') {
      if (request.method === 'GET') {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, auth_user_id, email, login, nome, role, ramal, codigo_sonax, nicho_agente, turno, ativo, created_at, updated_at')
          .eq('role', 'agente')
          .order('nome', { ascending: true });
        if (error) return json({ error: 'Não foi possível consultar os agentes.', details: error.message }, 500);
        return json(data || []);
      }

      if (request.method === 'POST') {
        const body = await readJson(request);
        const nome = String(body?.nome || '').trim();
        const login = normalizeLogin(String(body?.login || nome));
        const ramal = String(body?.ramal || '').trim();
        const codigoSonax = String(body?.codigo_sonax || '26253').trim() || '26253';
        const nicho = String(body?.nicho_agente || '').trim();
        const turno = String(body?.turno || '').trim();
        const senha = String(body?.senha || '');

        if (!nome || !login || !ramal || !turno || !senha) {
          return json({ error: 'Nome, ramal, turno e senha são obrigatórios.' }, 400);
        }
        if (!['SAC', 'CLINICAS', 'SAC & CLINICA'].includes(nicho)) {
          return json({ error: 'Nicho inválido.' }, 400);
        }
        if (senha.length < 6) return json({ error: 'A senha deve possuir pelo menos 6 caracteres.' }, 400);

        const { data: duplicate, error: duplicateError } = await supabase
          .from('usuarios')
          .select('id')
          .ilike('login', login)
          .maybeSingle();
        if (duplicateError) return json({ error: 'Não foi possível validar o login do agente.', details: duplicateError.message }, 500);
        if (duplicate) return json({ error: 'Já existe um agente com esse login.' }, 409);

        const email = `${slugify(login)}.${Date.now().toString(36)}@agentes.sonax.net.br`;
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          password: senha,
          email_confirm: true,
          user_metadata: { nome, login, role: 'agente' },
        });
        if (authError || !authData.user) {
          return json({ error: 'Não foi possível criar o login no Supabase Auth.', details: authError?.message }, 500);
        }

        const payload = {
          auth_user_id: authData.user.id,
          email,
          login,
          nome,
          role: 'agente',
          ramal,
          codigo_sonax: codigoSonax,
          nicho_agente: nicho,
          turno,
          ativo: true,
        };
        const { data, error } = await supabase.from('usuarios').insert(payload).select('*').single();
        if (error) {
          await supabase.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
          return json({ error: 'Não foi possível salvar o perfil do agente.', details: error.message }, 500);
        }
        return json(data, 201);
      }

      return json({ error: 'Método não permitido' }, 405, { Allow: 'GET, POST' });
    }

    // -----------------------------------------------------------------------
    // DASHBOARD - somente supervisão
    // -----------------------------------------------------------------------
    if (action === 'dashboard') {
      if (request.method !== 'GET') return json({ error: 'Método não permitido' }, 405, { Allow: 'GET' });
      const hoje = url.searchParams.get('data') || hojeSaoPaulo();

      const [agentesResult, acessosResult, recadosResult] = await Promise.all([
        supabase.from('usuarios').select('id, auth_user_id, login, nome, ramal, nicho_agente, turno').eq('role', 'agente').eq('ativo', true).order('nome'),
        supabase.from('agente_acessos').select('usuario_id, login_em').eq('data_acesso', hoje),
        supabase.from('recados').select('id, empresa_id, empresa_nome, mensagem, data_inicio, data_fim, updated_at').lte('data_inicio', hoje).gte('data_fim', hoje),
      ]);

      const firstError = agentesResult.error || acessosResult.error || recadosResult.error;
      if (firstError) return json({ error: 'Não foi possível montar o dashboard.', details: firstError.message }, 500);

      const agentes = agentesResult.data || [];
      const acessos = acessosResult.data || [];
      const recados = recadosResult.data || [];
      const recadoIds = recados.map((r: any) => r.id);
      let leituras: any[] = [];
      if (recadoIds.length) {
        const { data, error } = await supabase
          .from('recados_leituras')
          .select('recado_id, usuario_id, recado_updated_at, confirmado_em, tipo')
          .in('recado_id', recadoIds);
        if (error) return json({ error: 'Não foi possível consultar confirmações.', details: error.message }, 500);
        leituras = data || [];
      }

      const entrou = new Set(acessos.map((a: any) => String(a.usuario_id)));
      const acessosPorUsuario = new Map<string, string>();
      for (const a of acessos) {
        const prev = acessosPorUsuario.get(String(a.usuario_id));
        if (!prev || String(a.login_em) > prev) acessosPorUsuario.set(String(a.usuario_id), String(a.login_em));
      }

      const statusAgentes = agentes.map((ag: any) => {
        const uid = String(ag.auth_user_id || ag.id);
        const pendentes = recados.filter((rec: any) => !leituras.some((l: any) =>
          String(l.usuario_id) === uid &&
          String(l.recado_id) === String(rec.id) &&
          new Date(l.recado_updated_at).getTime() === new Date(rec.updated_at).getTime(),
        ));
        return {
          ...ag,
          acessou_hoje: entrou.has(uid),
          ultimo_acesso_hoje: acessosPorUsuario.get(uid) || null,
          recados_pendentes: pendentes.length,
        };
      });

      return json({
        data: hoje,
        agentes: statusAgentes,
        acessos_hoje: statusAgentes.filter((a: any) => a.acessou_hoje),
        pendentes_ciencia: statusAgentes.filter((a: any) => a.recados_pendentes > 0),
        total_recados_vigentes: recados.length,
      });
    }

    // -----------------------------------------------------------------------
    // LEITURAS DOS RECADOS - agente autenticado
    // -----------------------------------------------------------------------
    if (action === 'leituras') {
      const userId = auth.user.id;

      if (request.method === 'GET') {
        const empresaId = url.searchParams.get('empresa_id');
        const hoje = url.searchParams.get('data') || hojeSaoPaulo();
        let query = supabase
          .from('recados')
          .select('*')
          .lte('data_inicio', hoje)
          .gte('data_fim', hoje)
          .order('data_inicio', { ascending: false })
          .order('created_at', { ascending: false });
        if (empresaId) query = query.eq('empresa_id', empresaId);

        const { data: recados, error } = await query;
        if (error) return json({ error: 'Não foi possível consultar os recados vigentes.', details: error.message }, 500);

        const ids = (recados || []).map((r: any) => r.id);
        let leituras: any[] = [];
        if (ids.length) {
          const { data, error: leituraError } = await supabase
            .from('recados_leituras')
            .select('*')
            .eq('usuario_id', userId)
            .in('recado_id', ids)
            .order('confirmado_em', { ascending: false });
          if (leituraError) return json({ error: 'Não foi possível consultar as leituras.', details: leituraError.message }, 500);
          leituras = data || [];
        }

        return json((recados || []).map((rec: any) => {
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
        }));
      }

      if (request.method === 'POST') {
        if (auth.user.role !== 'agente') return json({ error: 'Somente agentes precisam confirmar recados.' }, 403);
        const body = await readJson(request);
        const recadoId = String(body?.recado_id || '');
        if (!recadoId) return json({ error: 'Recado obrigatório.' }, 400);

        const { data: recado, error } = await supabase.from('recados').select('id, updated_at').eq('id', recadoId).maybeSingle();
        if (error || !recado) return json({ error: 'Recado não encontrado.' }, 404);

        const { data: history } = await supabase
          .from('recados_leituras')
          .select('id')
          .eq('usuario_id', userId)
          .eq('recado_id', recadoId)
          .limit(1);
        const tipo = history?.length ? 'atualizacao' : 'lido';
        const payload = { recado_id: recadoId, usuario_id: userId, recado_updated_at: recado.updated_at, tipo };
        const { data, error: saveError } = await supabase
          .from('recados_leituras')
          .upsert(payload, { onConflict: 'recado_id,usuario_id,recado_updated_at' })
          .select('*')
          .single();
        if (saveError) return json({ error: 'Não foi possível confirmar a leitura.', details: saveError.message }, 500);
        return json(data, 201);
      }

      return json({ error: 'Método não permitido' }, 405, { Allow: 'GET, POST' });
    }

    return json({ error: 'Operação inválida.' }, 400);
  } catch (error) {
    return serverError(error, 'operacional');
  }
});
