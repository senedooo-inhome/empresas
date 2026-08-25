import jwt from 'jsonwebtoken';
import { getEnv, getSupabase, getSupabaseAuth, json, nodeHandler, readJson, serverError, type AuthUser } from '../_core.js';

export default nodeHandler(async function handler(request: Request) {
    if (request.method !== 'POST') return json({ error: 'Método não permitido' }, 405, { Allow: 'POST' });
    try {
      const body = await readJson(request);
      const email = String(body?.email || '').trim().toLowerCase();
      const password = String(body?.password || '');
      if (!email || !password) return json({ error: 'E-mail e senha são obrigatórios.' }, 400);

      const supabaseAuth = getSupabaseAuth();
      const { jwtSecret } = getEnv();
      const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({ email, password });
      if (authError || !authData.user) {
        console.warn('[auth/login] Supabase Auth recusou o login:', authError?.message);
        return json({ error: 'Usuário ou senha inválidos.' }, 401);
      }

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, email, nome, role')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('[auth/login] Supabase:', error);
        return json({ error: 'Não foi possível consultar os usuários.', details: error.message }, 500);
      }
      if (!data) return json({ error: 'Perfil do usuário não cadastrado na tabela usuarios.' }, 403);
      if (data.role !== 'supervisao' && data.role !== 'agente') return json({ error: 'Perfil de usuário inválido.' }, 403);

      const user: AuthUser = {
        id: String(authData.user.id), email: String(data.email), nome: String(data.nome), role: data.role,
      };
      const token = jwt.sign(user, jwtSecret, { expiresIn: '8h' });
      return json({ user, token }, 200, {
        'Set-Cookie': `sonax_token=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`,
        'Cache-Control': 'no-store',
      });
    } catch (error) {
      return serverError(error, 'auth/login');
    }
});
