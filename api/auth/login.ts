import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getEnv, getSupabase, handleServerError, type AuthUser } from '../../serverless/core';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const supabase = getSupabase();
    const { jwtSecret } = getEnv();

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, role, password_hash')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      console.error('[auth/login] Supabase:', error);
      return res.status(500).json({ error: 'Não foi possível consultar os usuários.' });
    }

    if (!data?.password_hash) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    const passwordOk = await bcrypt.compare(password, String(data.password_hash));
    if (!passwordOk) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    if (data.role !== 'supervisao' && data.role !== 'agente') {
      return res.status(403).json({ error: 'Perfil de usuário inválido.' });
    }

    const user: AuthUser = {
      id: String(data.id),
      email: String(data.email),
      nome: String(data.nome),
      role: data.role,
    };

    const token = jwt.sign(user, jwtSecret, { expiresIn: '8h' });

    res.setHeader(
      'Set-Cookie',
      `sonax_token=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`
    );

    return res.status(200).json({ user, token });
  } catch (error) {
    return handleServerError(res, error, 'auth/login');
  }
}
