import { authOrResponse, getSupabase, json, mapRecado, nodeHandler, readJson, recadoVigente, serverError, sortRecados } from './_core.js';
import { deleteRows, insertRow, listRows, newId, nowIso, sameInstant } from './_sheets.js';

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
    // Editar/excluir: exclusivamente supervisao@sonax.net.br
    // -----------------------------------------------------------------------
    if (action === 'agentes') {
      const gestorAutorizado = String(auth.user.email || '').trim().toLowerCase() === 'supervisao@sonax.net.br';

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

      if (request.method === 'PUT') {
        if (!gestorAutorizado) {
          return json({ error: 'Somente supervisao@sonax.net.br pode editar agentes.' }, 403);
        }

        const body = await readJson(request);
        const id = String(body?.id || '').trim();
        const nome = String(body?.nome || '').trim();
        const login = normalizeLogin(String(body?.login || nome));
        const ramal = String(body?.ramal || '').trim();
        const codigoSonax = String(body?.codigo_sonax || '26253').trim() || '26253';
        const nicho = String(body?.nicho_agente || '').trim();
        const turno = String(body?.turno || '').trim();
        const senha = String(body?.senha || '');

        if (!id || !nome || !login || !ramal || !turno) {
          return json({ error: 'Agente, nome, ramal e turno são obrigatórios.' }, 400);
        }
        if (!['SAC', 'CLINICAS', 'SAC & CLINICA'].includes(nicho)) {
          return json({ error: 'Nicho inválido.' }, 400);
        }
        if (senha && senha.length < 6) {
          return json({ error: 'A nova senha deve possuir pelo menos 6 caracteres.' }, 400);
        }

        const { data: agente, error: agenteError } = await supabase
          .from('usuarios')
          .select('id, auth_user_id, email, login, nome, role')
          .eq('id', id)
          .eq('role', 'agente')
          .maybeSingle();
        if (agenteError) return json({ error: 'Não foi possível consultar o agente.', details: agenteError.message }, 500);
        if (!agente) return json({ error: 'Agente não encontrado.' }, 404);

        const { data: duplicate, error: duplicateError } = await supabase
          .from('usuarios')
          .select('id')
          .ilike('login', login)
          .neq('id', id)
          .maybeSingle();
        if (duplicateError) return json({ error: 'Não foi possível validar o login do agente.', details: duplicateError.message }, 500);
        if (duplicate) return json({ error: 'Já existe outro agente com esse login.' }, 409);

        if (agente.auth_user_id) {
          const authChanges: any = { user_metadata: { nome, login, role: 'agente' } };
          if (senha) authChanges.password = senha;
          const { error: authError } = await supabase.auth.admin.updateUserById(String(agente.auth_user_id), authChanges);
          if (authError) {
            return json({ error: 'Não foi possível atualizar o login do agente no Supabase Auth.', details: authError.message }, 500);
          }
        }

        const { data, error } = await supabase
          .from('usuarios')
          .update({ login, nome, ramal, codigo_sonax: codigoSonax, nicho_agente: nicho, turno })
          .eq('id', id)
          .eq('role', 'agente')
          .select('*')
          .maybeSingle();
        if (error) return json({ error: 'Não foi possível atualizar o agente.', details: error.message }, 500);
        if (!data) return json({ error: 'Agente não encontrado.' }, 404);
        return json(data);
      }

      if (request.method === 'DELETE') {
        if (!gestorAutorizado) {
          return json({ error: 'Somente supervisao@sonax.net.br pode excluir agentes.' }, 403);
        }

        const body = await readJson(request);
        const id = String(body?.id || '').trim();
        if (!id) return json({ error: 'Agente obrigatório.' }, 400);

        const { data: agente, error: agenteError } = await supabase
          .from('usuarios')
          .select('id, auth_user_id, nome, role')
          .eq('id', id)
          .eq('role', 'agente')
          .maybeSingle();
        if (agenteError) return json({ error: 'Não foi possível consultar o agente.', details: agenteError.message }, 500);
        if (!agente) return json({ error: 'Agente não encontrado.' }, 404);

        const { error: deleteProfileError } = await supabase.from('usuarios').delete().eq('id', id).eq('role', 'agente');
        if (deleteProfileError) {
          return json({ error: 'Não foi possível excluir o perfil do agente.', details: deleteProfileError.message }, 500);
        }

        // Remove também o histórico de acessos e confirmações do agente na planilha.
        const uid = String(agente.auth_user_id || agente.id);
        await deleteRows('agente_acessos', (row) => row.usuario_id === uid);
        await deleteRows('recados_leituras', (row) => row.usuario_id === uid);

        if (agente.auth_user_id) {
          const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(String(agente.auth_user_id));
          if (deleteAuthError) {
            return json({
              success: true,
              warning: 'O perfil foi excluído, mas o usuário do Supabase Auth não pôde ser removido automaticamente.',
              details: deleteAuthError.message,
            });
          }
        }

        return json({ success: true });
      }

      return json({ error: 'Método não permitido' }, 405, { Allow: 'GET, POST, PUT, DELETE' });
    }

    // -----------------------------------------------------------------------
    // DASHBOARD - somente supervisão
    // Agentes vêm do Supabase; acessos, recados e confirmações vêm da planilha.
    // -----------------------------------------------------------------------
    if (action === 'dashboard') {
      if (request.method !== 'GET') return json({ error: 'Método não permitido' }, 405, { Allow: 'GET' });
      const hoje = url.searchParams.get('data') || hojeSaoPaulo();

      const agentesResult = await supabase
        .from('usuarios')
        .select('id, auth_user_id, login, nome, ramal, nicho_agente, turno')
        .eq('role', 'agente')
        .eq('ativo', true)
        .order('nome');
      if (agentesResult.error) return json({ error: 'Não foi possível montar o dashboard.', details: agentesResult.error.message }, 500);

      const [acessosRows, recadosRows, leiturasRows] = await Promise.all([
        listRows('agente_acessos'),
        listRows('recados'),
        listRows('recados_leituras'),
      ]);
      const agentes = agentesResult.data || [];
      const acessos = acessosRows.filter((a) => a.data_acesso.slice(0, 10) === hoje);
      const recados = recadosRows.map((row) => ({ ...mapRecado(row), updated_at: row.updated_at })).filter((r) => recadoVigente(r, hoje));
      const recadoIds = new Set(recados.map((r) => String(r.id)));
      const leituras = leiturasRows.filter((l) => recadoIds.has(l.recado_id));

      const entrou = new Set(acessos.map((a) => String(a.usuario_id)));
      const acessosPorUsuario = new Map<string, string>();
      for (const a of acessos) {
        const prev = acessosPorUsuario.get(String(a.usuario_id));
        if (!prev || String(a.login_em) > prev) acessosPorUsuario.set(String(a.usuario_id), String(a.login_em));
      }

      const statusAgentes = agentes.map((ag: any) => {
        const uid = String(ag.auth_user_id || ag.id);
        const pendentes = recados.filter((rec) => !leituras.some((l) =>
          String(l.usuario_id) === uid &&
          String(l.recado_id) === String(rec.id) &&
          sameInstant(l.recado_updated_at, rec.updated_at),
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
        const [recadosRows, leiturasRows] = await Promise.all([listRows('recados'), listRows('recados_leituras')]);
        let recados = recadosRows.map((row) => ({ ...mapRecado(row), updated_at: row.updated_at })).filter((r) => recadoVigente(r, hoje));
        if (empresaId) recados = recados.filter((r) => r.empresa_id === empresaId);
        recados = sortRecados(recados);
        const leituras = leiturasRows
          .filter((l) => l.usuario_id === userId)
          .sort((a, b) => String(b.confirmado_em).localeCompare(String(a.confirmado_em)));

        return json(recados.map((rec) => {
          const history = leituras.filter((l) => String(l.recado_id) === String(rec.id));
          const atual = history.find((l) => sameInstant(l.recado_updated_at, rec.updated_at));
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
            createdAt: rec.createdAt,
            updatedAt: rec.updatedAt,
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

        const recado = (await listRows('recados')).find((r) => r.id === recadoId);
        if (!recado) return json({ error: 'Recado não encontrado.' }, 404);

        const history = (await listRows('recados_leituras')).filter((l) => l.usuario_id === userId && l.recado_id === recadoId);
        // Mesma regra do antigo "upsert": uma confirmação por agente e por versão do recado.
        const existente = history.find((l) => sameInstant(l.recado_updated_at, recado.updated_at));
        if (existente) return json(existente, 201);
        const saved = await insertRow('recados_leituras', {
          id: newId('lei'),
          recado_id: recadoId,
          usuario_id: userId,
          recado_updated_at: recado.updated_at,
          tipo: history.length ? 'atualizacao' : 'lido',
          confirmado_em: nowIso(),
        });
        return json(saved, 201);
      }

      return json({ error: 'Método não permitido' }, 405, { Allow: 'GET, POST' });
    }

    return json({ error: 'Operação inválida.' }, 400);
  } catch (error) {
    return serverError(error, 'operacional');
  }
});
