import { authOrResponse, getSupabase, json, nodeHandler, readJson, serverError } from '../_core.js';

function normalizeLogin(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'agente';
}

export default nodeHandler(async function handler(request: Request) {
  try {
    const auth = authOrResponse(request, true);
    if (auth.response || !auth.user) return auth.response!;
    const supabase = getSupabase();

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

      const { data: duplicate } = await supabase
        .from('usuarios')
        .select('id')
        .ilike('login', login)
        .maybeSingle();
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
  } catch (error) {
    return serverError(error, 'agentes');
  }
});
