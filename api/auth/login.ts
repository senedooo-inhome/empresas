import jwt from 'jsonwebtoken';
import { checkPassword, getEnv, json, nodeHandler, readJson, serverError, userUid, type AuthUser } from '../_core.js';
import { hojeSaoPaulo, insertRow, listRows, newId, nowIso, parseBool } from '../_sheets.js';

export default nodeHandler(async function handler(request: Request) {
  if (request.method !== 'POST') return json({ error: 'Método não permitido' }, 405, { Allow: 'POST' });
  try {
    const body = await readJson(request);
    const identifier = String(body?.email || body?.login || '').trim().toLowerCase();
    const password = String(body?.password || '');
    if (!identifier || !password) return json({ error: 'Usuário e senha são obrigatórios.' }, 400);

    const { jwtSecret } = getEnv();
    const usuarios = await listRows('usuarios');
    const profile = usuarios.find((u) => identifier.includes('@')
      ? u.email.trim().toLowerCase() === identifier
      : u.login.trim().toLowerCase() === identifier);

    if (!profile || !parseBool(profile.ativo, true) || !checkPassword(password, profile.password_hash)) {
      return json({ error: 'Usuário ou senha inválidos.' }, 401);
    }
    if (profile.role !== 'supervisao' && profile.role !== 'agente') return json({ error: 'Perfil de usuário inválido.' }, 403);

    const user: AuthUser = { id: userUid(profile), email: profile.email, login: profile.login || undefined, nome: profile.nome, role: profile.role };

    if (profile.role === 'agente') {
      try {
        await insertRow('agente_acessos', { id: newId('acc'), usuario_id: user.id, data_acesso: hojeSaoPaulo(), login_em: nowIso() });
      } catch (accessError) {
        // O login não é bloqueado se a gravação do acesso falhar.
        console.warn('[auth/login] Não foi possível registrar acesso do agente:', (accessError as Error).message);
      }
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
