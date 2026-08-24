import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

export type Role = 'supervisao' | 'agente';
export type AuthUser = { id: string; email: string; nome: string; role: Role };

type NodeRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type NodeResponse = {
  statusCode: number;
  setHeader(name: string, value: string | string[]): void;
  end(body?: Uint8Array): void;
};

function toWebRequest(request: NodeRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers || {})) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else if (value !== undefined) {
      headers.set(name, value);
    }
  }

  const protocol = headers.get('x-forwarded-proto') || 'https';
  const host = headers.get('x-forwarded-host') || headers.get('host') || 'localhost';
  const url = new URL(request.url || '/', `${protocol}://${host}`).toString();
  const method = request.method || 'GET';
  const init: RequestInit = { method, headers };

  if (method !== 'GET' && method !== 'HEAD' && request.body !== undefined) {
    if (typeof request.body === 'string' || request.body instanceof Uint8Array) {
      init.body = request.body;
    } else {
      init.body = JSON.stringify(request.body);
      if (!headers.has('content-type')) headers.set('content-type', 'application/json');
    }
  }

  return new Request(url, init);
}

async function sendWebResponse(response: Response, target: NodeResponse) {
  target.statusCode = response.status;
  response.headers.forEach((value, name) => target.setHeader(name, value));
  const body = new Uint8Array(await response.arrayBuffer());
  target.end(body.length ? body : undefined);
}

export function nodeHandler(
  handler: (request: Request) => Response | Promise<Response>,
) {
  return async (request: NodeRequest, response: NodeResponse) => {
    try {
      await sendWebResponse(await handler(toWebRequest(request)), response);
    } catch (error) {
      await sendWebResponse(serverError(error, 'vercel/adapter'), response);
    }
  };
}

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers });
}

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

export function getToken(request: Request): string | null {
  const authorization = request.headers.get('authorization') || '';
  if (/^Bearer\s+/i.test(authorization)) {
    return authorization.replace(/^Bearer\s+/i, '').trim() || null;
  }

  const cookieHeader = request.headers.get('cookie') || '';
  for (const item of cookieHeader.split(';')) {
    const [rawKey, ...parts] = item.trim().split('=');
    if (rawKey === 'sonax_token') {
      const raw = parts.join('=');
      try { return decodeURIComponent(raw) || null; } catch { return raw || null; }
    }
  }
  return null;
}

export function authenticate(request: Request): AuthUser | null {
  const token = getToken(request);
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

export function authOrResponse(request: Request, supervisorOnly = false): { user?: AuthUser; response?: Response } {
  const user = authenticate(request);
  if (!user) return { response: json({ error: 'Não autorizado' }, 401) };
  if (supervisorOnly && user.role !== 'supervisao') {
    return { response: json({ error: 'Acesso permitido somente para supervisão.' }, 403) };
  }
  return { user };
}

export function serverError(error: any, context: string) {
  console.error(`[${context}]`, error);
  const missing = error?.missing as string[] | undefined;
  if (missing?.length) {
    return json({ error: 'Configuração do servidor incompleta.', missing }, 500);
  }
  return json({ error: 'Erro interno do servidor.' }, 500);
}

export async function readJson(request: Request): Promise<any> {
  try { return await request.json(); } catch { return {}; }
}

export function pathSegment(request: Request, marker: string): string {
  const pathname = new URL(request.url).pathname;
  const idx = pathname.indexOf(marker);
  if (idx < 0) return '';
  return decodeURIComponent(pathname.slice(idx + marker.length).split('/')[0] || '');
}

export function mapEmpresa(row: any) {
  if (!row) return row;
  return {
    id: row.id, nome: row.nome, nicho: row.nicho, segmento: row.segmento,
    link_sistema: row.link_sistema, resumo: row.resumo, logo_url: row.logo_url,
    ativo: row.ativo, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function mapRecado(row: any) {
  if (!row) return row;
  return {
    id: row.id, empresa_id: row.empresa_id, empresa_nome: row.empresa_nome,
    data_recado: row.data_recado, mensagem: row.mensagem, criado_por: row.criado_por,
    criado_por_email: row.criado_por_email, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}
