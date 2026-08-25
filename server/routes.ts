import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

type Role = 'supervisao' | 'agente';
type User = { id: string; email: string; nome: string; role: Role };
type Empresa = { id: string; nome: string; nicho: string; segmento: string; link_sistema: string; links_sistema?: Array<{ nome: string; url: string }>; resumo: string; logo_url: string; ativo: boolean; createdAt: string; updatedAt: string };
type Recado = { id: string; empresa_id: string; data_recado: string; mensagem: string; criado_por: string; createdAt: string; updatedAt: string };
type Store = { empresas: Empresa[]; recados: Recado[] };

dotenv.config({ path: '.env.local' });

const router = Router();
const dataPath = path.join(process.cwd(), '.local-data.json');
const jwtSecret = process.env.JWT_SECRET || 'sonax-local-development-secret';
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '');
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })
  : null;
const supabaseAuth = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;
const users: (User & { password?: string })[] = [
  { id: process.env.ADMIN_ID || 'supervisao', email: (process.env.ADMIN_EMAIL || 'supervisao@sonax.net.br').toLowerCase(), nome: process.env.ADMIN_NOME || 'Supervisão', role: 'supervisao', password: process.env.ADMIN_PASSWORD },
  { id: process.env.AGENT_ID || 'sonaxinhome', email: (process.env.AGENT_EMAIL || 'sonaxinhome@gmail.com').toLowerCase(), nome: process.env.AGENT_NOME || 'Agente', role: 'agente', password: process.env.AGENT_PASSWORD },
];

function readStore(): Store {
  if (!existsSync(dataPath)) return { empresas: [], recados: [] };
  try { const parsed = JSON.parse(readFileSync(dataPath, 'utf8')); return { empresas: parsed.empresas || [], recados: parsed.recados || [] }; }
  catch { return { empresas: [], recados: [] }; }
}
function writeStore(store: Store) { writeFileSync(dataPath, JSON.stringify(store, null, 2), 'utf8'); }
function userFromRequest(req: any): User | null {
  const token = req.cookies?.sonax_token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  try { const user = jwt.verify(token, jwtSecret) as User; return user?.id && user?.email && user?.role ? user : null; }
  catch { return null; }
}
function requireAuth(req: any, res: any, next: any) { const user = userFromRequest(req); if (!user) return res.status(401).json({ error: 'Não autorizado' }); req.user = user; next(); }
function requireSupervisor(req: any, res: any, next: any) { if (req.user?.role !== 'supervisao') return res.status(403).json({ error: 'Não autorizado' }); next(); }
function enrichRecado(recado: Recado, store: Store) { return { ...recado, empresa_nome: store.empresas.find((empresa) => empresa.id === recado.empresa_id)?.nome }; }

router.post('/auth/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  let user: User | null = null;

  if (supabase) {
    if (!supabaseAuth) {
      return res.status(500).json({ error: 'Configuração incompleta: SUPABASE_ANON_KEY.' });
    }
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      console.warn('[auth/login local] Supabase Auth recusou o login:', authError?.message);
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, role')
      .eq('email', email)
      .maybeSingle();
    if (error) return res.status(500).json({ error: 'Não foi possível consultar os usuários.' });
    if (!data) return res.status(403).json({ error: 'Perfil do usuário não cadastrado na tabela usuarios.' });
    user = { id: authData.user.id, email: data.email, nome: data.nome, role: data.role as Role };
  } else {
    const found = users.find((candidate) => candidate.email === email);
    if (!found || !found.password || password !== found.password) return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    user = { id: found.id, email: found.email, nome: found.nome, role: found.role };
  }

  const token = jwt.sign(user, jwtSecret, { expiresIn: '8h' });
  res.cookie('sonax_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 });
  res.json({ user, token });
});
router.post('/auth/logout', (_req, res) => { res.clearCookie('sonax_token'); res.status(204).end(); });
router.get('/auth/me', requireAuth, (req: any, res) => res.json({ user: req.user }));

router.get('/empresas', requireAuth, (req, res) => { const empresas = readStore().empresas; res.json(req.query.ativas === 'true' ? empresas.filter((empresa) => empresa.ativo) : empresas); });
router.get('/empresas/:id', requireAuth, (req, res) => { const empresa = readStore().empresas.find((item) => item.id === req.params.id); if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' }); res.json(empresa); });
router.post('/empresas', requireAuth, requireSupervisor, (req, res) => { const now = new Date().toISOString(); const empresa: Empresa = { id: randomUUID(), ...req.body, ativo: req.body?.ativo ?? true, createdAt: now, updatedAt: now }; const store = readStore(); store.empresas.push(empresa); writeStore(store); res.status(201).json(empresa); });
router.put('/empresas/:id', requireAuth, requireSupervisor, (req, res) => { const store = readStore(); const index = store.empresas.findIndex((item) => item.id === req.params.id); if (index < 0) return res.status(404).json({ error: 'Empresa não encontrada' }); store.empresas[index] = { ...store.empresas[index], ...req.body, id: store.empresas[index].id, createdAt: store.empresas[index].createdAt, updatedAt: new Date().toISOString() }; writeStore(store); res.json(store.empresas[index]); });
router.patch('/empresas/:id/status', requireAuth, requireSupervisor, (req, res) => { const store = readStore(); const empresa = store.empresas.find((item) => item.id === req.params.id); if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' }); empresa.ativo = Boolean(req.body?.ativo); empresa.updatedAt = new Date().toISOString(); writeStore(store); res.json(empresa); });
router.delete('/empresas/:id', requireAuth, requireSupervisor, (req, res) => { const store = readStore(); const empresa = store.empresas.find((item) => item.id === req.params.id); if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' }); empresa.ativo = false; empresa.updatedAt = new Date().toISOString(); writeStore(store); res.json({ inativada: true, totalRecadosVinculados: store.recados.filter((recado) => recado.empresa_id === empresa.id).length, message: 'Empresa inativada com sucesso.' }); });

router.get('/recados/empresa/:empresaId/hoje', requireAuth, (req, res) => { const store = readStore(); const date = String(req.query.dataHoje || ''); res.json(store.recados.filter((recado) => recado.empresa_id === req.params.empresaId && recado.data_recado === date).map((recado) => enrichRecado(recado, store))); });
router.get('/recados', requireAuth, (req, res) => { const store = readStore(); let recados = store.recados; if (req.query.empresa_id) recados = recados.filter((recado) => recado.empresa_id === req.query.empresa_id); if (req.query.data_recado) recados = recados.filter((recado) => recado.data_recado === req.query.data_recado); res.json(recados.map((recado) => enrichRecado(recado, store))); });
router.post('/recados', requireAuth, requireSupervisor, (req, res) => { const store = readStore(); if (!store.empresas.some((empresa) => empresa.id === req.body?.empresa_id)) return res.status(400).json({ error: 'Empresa inválida' }); const now = new Date().toISOString(); const recado: Recado = { id: randomUUID(), ...req.body, createdAt: now, updatedAt: now }; store.recados.push(recado); writeStore(store); res.status(201).json(enrichRecado(recado, store)); });
router.put('/recados/:id', requireAuth, requireSupervisor, (req, res) => { const store = readStore(); const index = store.recados.findIndex((item) => item.id === req.params.id); if (index < 0) return res.status(404).json({ error: 'Recado não encontrado' }); store.recados[index] = { ...store.recados[index], ...req.body, id: store.recados[index].id, createdAt: store.recados[index].createdAt, updatedAt: new Date().toISOString() }; writeStore(store); res.json(enrichRecado(store.recados[index], store)); });
router.delete('/recados/:id', requireAuth, requireSupervisor, (req, res) => { const store = readStore(); const index = store.recados.findIndex((item) => item.id === req.params.id); if (index < 0) return res.status(404).json({ error: 'Recado não encontrado' }); store.recados.splice(index, 1); writeStore(store); res.status(204).end(); });

export default router;
