import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

export type Role = 'supervisao' | 'agente';
export type AuthUser = { id: string; email: string; nome: string; role: Role };

export function getEnv() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const jwtSecret = process.env.JWT_SECRET;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!jwtSecret) missing.push('JWT_SECRET');

  if (missing.length) {
    const error = new Error(`Configuração do servidor incompleta: ${missing.join(', ')}`);
    (error as any).missing = missing;
    throw error;
  }

  return { supabaseUrl, serviceKey, jwtSecret } as {
    supabaseUrl: string;
    serviceKey: string;
    jwtSecret: string;
  };
}

export function getSupabase() {
  const { supabaseUrl, serviceKey } = getEnv();
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getBearerOrCookieToken(req: any): string | null {
  const authorization = String(req.headers?.authorization || '');
  if (/^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, '').trim() || null;
  }

  const cookieHeader = String(req.headers?.cookie || '');
  if (!cookieHeader) return null;

  for (const item of cookieHeader.split(';')) {
    const [rawKey, ...parts] = item.trim().split('=');
    if (rawKey === 'sonax_token') {
      try {
        return decodeURIComponent(parts.join('=')) || null;
      } catch {
        return parts.join('=') || null;
      }
    }
  }
  return null;
}

export function authenticate(req: any): AuthUser | null {
  const token = getBearerOrCookieToken(req);
  if (!token) return null;

  try {
    const { jwtSecret } = getEnv();
    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    if (!decoded?.id || !decoded?.email || !decoded?.nome) return null;
    if (decoded.role !== 'supervisao' && decoded.role !== 'agente') return null;
    return decoded;
  } catch {
    return null;
  }
}

export function requireAuth(req: any, res: any): AuthUser | null {
  const user = authenticate(req);
  if (!user) {
    res.status(401).json({ error: 'Não autorizado' });
    return null;
  }
  return user;
}

export function requireSupervisor(req: any, res: any): AuthUser | null {
  const user = requireAuth(req, res);
  if (!user) return null;
  if (user.role !== 'supervisao') {
    res.status(403).json({ error: 'Acesso permitido somente para supervisão.' });
    return null;
  }
  return user;
}

export function handleServerError(res: any, error: any, context: string) {
  console.error(`[${context}]`, error);
  const missing = error?.missing as string[] | undefined;
  if (missing?.length) {
    return res.status(500).json({
      error: 'Configuração do servidor incompleta.',
      missing,
    });
  }
  return res.status(500).json({ error: 'Erro interno do servidor.' });
}

export function mapEmpresa(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    nome: row.nome,
    nicho: row.nicho,
    segmento: row.segmento,
    link_sistema: row.link_sistema,
    links_sistema: Array.isArray(row.links_sistema) && row.links_sistema.length
      ? row.links_sistema
      : row.link_sistema
        ? [{ nome: 'Sistema principal', url: row.link_sistema }]
        : [],
    resumo: row.resumo,
    logo_url: row.logo_url,
    ativo: row.ativo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRecado(row: any) {
  if (!row) return row;
  return {
    id: row.id,
    empresa_id: row.empresa_id,
    empresa_nome: row.empresa_nome,
    data_recado: row.data_recado,
    mensagem: row.mensagem,
    criado_por: row.criado_por,
    criado_por_email: row.criado_por_email,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
