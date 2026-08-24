import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEnv, getSupabase, json, readJson, serverError, type AuthUser } from '../_core';

export default async function handler(request: Request) {
    if (request.method !== 'POST') return json({ error: 'Método não permitido' }, 405, { Allow: 'POST' });
    try {
      const body = await readJson(request);
      const email = String(body?.email || '').trim().toLowerCase();
      const password = String(body?.password || '');
      if (!email || !password) return json({ error: 'E-mail e senha são obrigatórios.' }, 400);

      const supabase = getSupabase();
      const { jwtSecret } = getEnv();
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, email, nome, role, password_hash')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('[auth/login] Supabase:', error);
        return json({ error: 'Não foi possível consultar os usuários.', details: error.message }, 500);
      }
      if (!data?.password_hash) return json({ error: 'Usuário ou senha inválidos.' }, 401);

      const passwordOk = await bcrypt.compare(password, String(data.password_hash));
      if (!passwordOk) return json({ error: 'Usuário ou senha inválidos.' }, 401);
      if (data.role !== 'supervisao' && data.role !== 'agente') return json({ error: 'Perfil de usuário inválido.' }, 403);

      const user: AuthUser = {
        id: String(data.id), email: String(data.email), nome: String(data.nome), role: data.role,
      };
      const token = jwt.sign(user, jwtSecret, { expiresIn: '8h' });
      return json({ user, token }, 200, {
        'Set-Cookie': `sonax_token=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`,
        'Cache-Control': 'no-store',
      });
    } catch (error) {
      return serverError(error, 'auth/login');
    }
}
