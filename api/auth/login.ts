import jwt from 'jsonwebtoken';
import { getEnv, getSupabase, getSupabaseAuth, json, nodeHandler, readJson, serverError, type AuthUser } from '../_core.js';

export default nodeHandler(async function handler(request: Request) {
  if (request.method !== 'POST') return json({ error: 'Método não permitido' }, 405, { Allow: 'POST' });
  try {
    const body = await readJson(request);
    const identifier = String(body?.email || body?.login || '').trim();
    const password = String(body?.password || '');
    if (!identifier || !password) return json({ error: 'Usuário e senha são obrigatórios.' }, 400);

    const supabase = getSupabase();
    let profile: any = null;
    if (identifier.includes('@')) {
      const { data, error } = await supabase.from('usuarios').select('id, auth_user_id, email, login, nome, role, ativo').ilike('email', identifier).maybeSingle();
      if (error) return json({ error: 'Não foi possível consultar os usuários.', details: error.message }, 500);
      profile = data;
    } else {
      const { data, error } = await supabase.from('usuarios').select('id, auth_user_id, email, login, nome, role, ativo').ilike('login', identifier).maybeSingle();
      if (error) return json({ error: 'Não foi possível consultar os usuários.', details: error.message }, 500);
      profile = data;
    }
    if (!profile || profile.ativo === false) return json({ error: 'Usuário ou senha inválidos.' }, 401);

    const supabaseAuth = getSupabaseAuth();
    const { jwtSecret } = getEnv();

    // Usa o e-mail real do Supabase Auth. Para agentes antigos criados com o
    // domínio técnico .local, migra silenciosamente para um domínio válido,
    // preservando a senha e o mesmo auth_user_id.
    let authEmail = String(profile.email || '').trim().toLowerCase();
    if (profile.auth_user_id) {
      const { data: authLookup } = await supabase.auth.admin.getUserById(String(profile.auth_user_id));
      if (authLookup?.user?.email) authEmail = String(authLookup.user.email).trim().toLowerCase();
    }

    if (profile.role === 'agente' && authEmail.endsWith('@agentes.sonax.local') && profile.auth_user_id) {
      const localPart = authEmail.split('@')[0];
      const migratedEmail = `${localPart}@agentes.sonax.net.br`;
      const { data: updatedAuth, error: updateAuthError } = await supabase.auth.admin.updateUserById(String(profile.auth_user_id), {
        email: migratedEmail,
        email_confirm: true,
      });
      if (!updateAuthError && updatedAuth.user?.email) {
        authEmail = String(updatedAuth.user.email).toLowerCase();
        const { error: profileEmailError } = await supabase.from('usuarios').update({ email: authEmail }).eq('id', profile.id);
        if (profileEmailError) console.warn('[auth/login] Login funcionará, mas não foi possível atualizar o e-mail técnico do perfil:', profileEmailError.message);
      } else if (updateAuthError) {
        console.warn('[auth/login] Não foi possível migrar e-mail técnico do agente:', updateAuthError.message);
      }
    }

    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({ email: authEmail, password });
    if (authError || !authData.user) {
      console.warn('[auth/login] Supabase Auth recusou o login:', authError?.message);
      return json({ error: 'Usuário ou senha inválidos.', details: authError?.message || null }, 401);
    }
    if (profile.role !== 'supervisao' && profile.role !== 'agente') return json({ error: 'Perfil de usuário inválido.' }, 403);

    const user: AuthUser = { id: String(authData.user.id), email: String(profile.email), login: profile.login || undefined, nome: String(profile.nome), role: profile.role };

    if (profile.role === 'agente') {
      const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
      const { error: accessError } = await supabase.from('agente_acessos').insert({ usuario_id: authData.user.id, data_acesso: hoje });
      if (accessError) console.warn('[auth/login] Não foi possível registrar acesso do agente:', accessError.message);
    }

    const token = jwt.sign(user, jwtSecret, { expiresIn: '8h' });
    return json({ user, token }, 200, {
      'Set-Cookie': `sonax_token=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`,
      'Cache-Control': 'no-store',
    });
  } catch (error) {
    return serverError(error, 'auth/login');
  }
});
