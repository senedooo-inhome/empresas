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
type Recado = { id: string; empresa_id: string; data_recado: string; data_inicio?: string; data_fim?: string; mensagem: string; criado_por: string; createdAt: string; updatedAt: string };
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
  const identifier = String(req.body?.email || req.body?.login || '').trim();
  const password = String(req.body?.password || '');
  let user: User | null = null;

  if (supabase) {
    if (!supabaseAuth) return res.status(500).json({ error: 'Configuração incompleta: SUPABASE_ANON_KEY.' });
    let profile: any = null;
    if (identifier.includes('@')) {
      const { data, error } = await supabase.from('usuarios').select('id, auth_user_id, email, login, nome, role, ativo').ilike('email', identifier).maybeSingle();
      if (error) return res.status(500).json({ error: 'Não foi possível consultar os usuários.' });
      profile = data;
    } else {
      const { data, error } = await supabase.from('usuarios').select('id, auth_user_id, email, login, nome, role, ativo').ilike('login', identifier).maybeSingle();
      if (error) return res.status(500).json({ error: 'Não foi possível consultar os usuários.' });
      profile = data;
    }
    if (!profile || profile.ativo === false) return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    let authEmail = String(profile.email || '').trim().toLowerCase();
    if (profile.auth_user_id) {
      const { data: authLookup } = await supabase.auth.admin.getUserById(String(profile.auth_user_id));
      if (authLookup?.user?.email) authEmail = String(authLookup.user.email).trim().toLowerCase();
    }
    if (profile.role === 'agente' && authEmail.endsWith('@agentes.sonax.local') && profile.auth_user_id) {
      const migratedEmail = `${authEmail.split('@')[0]}@agentes.sonax.net.br`;
      const { data: updatedAuth, error: migrateError } = await supabase.auth.admin.updateUserById(String(profile.auth_user_id), { email: migratedEmail, email_confirm: true });
      if (!migrateError && updatedAuth.user?.email) {
        authEmail = String(updatedAuth.user.email).toLowerCase();
        await supabase.from('usuarios').update({ email: authEmail }).eq('id', profile.id);
      }
    }
    const { data: authData, error: authError } = await supabaseAuth.auth.signInWithPassword({ email: authEmail, password });
    if (authError || !authData.user) return res.status(401).json({ error: 'Usuário ou senha inválidos', details: authError?.message || null });
    user = { id: authData.user.id, email: profile.email, nome: profile.nome, role: profile.role as Role };
    if (profile.role === 'agente') {
      const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
      await supabase.from('agente_acessos').insert({ usuario_id: authData.user.id, data_acesso: hoje });
    }
  } else {
    const normalized = identifier.toLowerCase();
    const found = users.find((candidate) => candidate.email === normalized || candidate.nome.toLowerCase() === normalized);
    if (!found || !found.password || password !== found.password) return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    user = { id: found.id, email: found.email, nome: found.nome, role: found.role };
  }

  const token = jwt.sign(user, jwtSecret, { expiresIn: '8h' });
  res.cookie('sonax_token', token, { httpOnly: true, sameSite: 'lax', maxAge: 8 * 60 * 60 * 1000 });
  res.json({ user, token });
});
router.post('/auth/logout', (_req, res) => { res.clearCookie('sonax_token'); res.status(204).end(); });
router.get('/auth/me', requireAuth, (req: any, res) => res.json({ user: req.user }));


router.all('/operacional', requireAuth, async (req: any, res) => {
  const action = String(req.query.action || '').toLowerCase();

  if (action === 'agentes') {
    if (req.user?.role !== 'supervisao') return res.status(403).json({ error: 'Acesso permitido somente para supervisão.' });
    if (!supabase) return res.status(500).json({ error: 'Cadastro de agentes exige Supabase configurado.' });

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, auth_user_id, email, login, nome, role, ramal, codigo_sonax, nicho_agente, turno, ativo, created_at, updated_at')
        .eq('role', 'agente')
        .order('nome');
      if (error) return res.status(500).json({ error: 'Não foi possível consultar os agentes.', details: error.message });
      return res.json(data || []);
    }

    if (req.method === 'POST') {
      const nome = String(req.body?.nome || '').trim();
      const login = String(req.body?.login || nome).trim().replace(/\s+/g, ' ');
      const ramal = String(req.body?.ramal || '').trim();
      const codigo_sonax = String(req.body?.codigo_sonax || '26253').trim() || '26253';
      const nicho_agente = String(req.body?.nicho_agente || '').trim();
      const turno = String(req.body?.turno || '').trim();
      const senha = String(req.body?.senha || '');
      if (!nome || !login || !ramal || !turno || !senha) return res.status(400).json({ error: 'Nome, ramal, turno e senha são obrigatórios.' });
      if (!['SAC', 'CLINICAS', 'SAC & CLINICA'].includes(nicho_agente)) return res.status(400).json({ error: 'Nicho inválido.' });
      if (senha.length < 6) return res.status(400).json({ error: 'A senha deve possuir pelo menos 6 caracteres.' });

      const { data: duplicate, error: duplicateError } = await supabase.from('usuarios').select('id').ilike('login', login).maybeSingle();
      if (duplicateError) return res.status(500).json({ error: 'Não foi possível validar o login do agente.', details: duplicateError.message });
      if (duplicate) return res.status(409).json({ error: 'Já existe um agente com esse login.' });

      const slug = login.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '') || 'agente';
      const email = `${slug}.${Date.now().toString(36)}@agentes.sonax.net.br`;
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome, login, role: 'agente' } });
      if (authError || !authData.user) return res.status(500).json({ error: 'Não foi possível criar o login no Supabase Auth.', details: authError?.message || null });

      const { data, error } = await supabase.from('usuarios').insert({ auth_user_id: authData.user.id, email, login, nome, role: 'agente', ramal, codigo_sonax, nicho_agente, turno, ativo: true }).select('*').single();
      if (error) {
        await supabase.auth.admin.deleteUser(authData.user.id).catch(() => undefined);
        return res.status(500).json({ error: 'Não foi possível salvar o perfil do agente.', details: error.message });
      }
      return res.status(201).json(data);
    }
    return res.status(405).json({ error: 'Método não permitido' });
  }

  if (action === 'dashboard') {
    if (req.user?.role !== 'supervisao') return res.status(403).json({ error: 'Acesso permitido somente para supervisão.' });
    if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
    if (!supabase) return res.json({ agentes: [], acessos_hoje: [], pendentes_ciencia: [], total_recados_vigentes: 0 });

    const hoje = String(req.query.data || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()));
    const [agentesResult, acessosResult, recadosResult] = await Promise.all([
      supabase.from('usuarios').select('id, auth_user_id, login, nome, ramal, nicho_agente, turno').eq('role', 'agente').eq('ativo', true).order('nome'),
      supabase.from('agente_acessos').select('usuario_id, login_em').eq('data_acesso', hoje),
      supabase.from('recados').select('id, updated_at').lte('data_inicio', hoje).gte('data_fim', hoje),
    ]);
    const firstError = agentesResult.error || acessosResult.error || recadosResult.error;
    if (firstError) return res.status(500).json({ error: 'Não foi possível montar o dashboard.', details: firstError.message });

    const agentes = agentesResult.data || [];
    const acessos = acessosResult.data || [];
    const recados = recadosResult.data || [];
    const ids = recados.map((r: any) => r.id);
    let leituras: any[] = [];
    if (ids.length) {
      const result = await supabase.from('recados_leituras').select('recado_id, usuario_id, recado_updated_at').in('recado_id', ids);
      if (result.error) return res.status(500).json({ error: 'Não foi possível consultar confirmações.', details: result.error.message });
      leituras = result.data || [];
    }
    const setA = new Set(acessos.map((a: any) => String(a.usuario_id)));
    const rows = agentes.map((a: any) => {
      const uid = String(a.auth_user_id || a.id);
      const p = recados.filter((r: any) => !leituras.some((l: any) => String(l.usuario_id) === uid && String(l.recado_id) === String(r.id) && new Date(l.recado_updated_at).getTime() === new Date(r.updated_at).getTime())).length;
      const acc = acessos.filter((x: any) => String(x.usuario_id) === uid).sort((x: any, y: any) => String(y.login_em).localeCompare(String(x.login_em)))[0];
      return { ...a, acessou_hoje: setA.has(uid), ultimo_acesso_hoje: acc?.login_em || null, recados_pendentes: p };
    });
    return res.json({ data: hoje, agentes: rows, acessos_hoje: rows.filter((a: any) => a.acessou_hoje), pendentes_ciencia: rows.filter((a: any) => a.recados_pendentes > 0), total_recados_vigentes: recados.length });
  }

  if (action === 'leituras') {
    if (!supabase) return req.method === 'GET' ? res.json([]) : res.status(500).json({ error: 'Supabase não configurado.' });

    if (req.method === 'GET') {
      const hoje = String(req.query.data || new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()));
      let q = supabase.from('recados').select('*').lte('data_inicio', hoje).gte('data_fim', hoje).order('data_inicio', { ascending: false }).order('created_at', { ascending: false });
      if (req.query.empresa_id) q = q.eq('empresa_id', String(req.query.empresa_id));
      const { data: recados, error } = await q;
      if (error) return res.status(500).json({ error: 'Não foi possível consultar os recados vigentes.', details: error.message });
      const ids = (recados || []).map((r: any) => r.id);
      let leituras: any[] = [];
      if (ids.length) {
        const result = await supabase.from('recados_leituras').select('*').eq('usuario_id', req.user.id).in('recado_id', ids).order('confirmado_em', { ascending: false });
        if (result.error) return res.status(500).json({ error: 'Não foi possível consultar as leituras.', details: result.error.message });
        leituras = result.data || [];
      }
      return res.json((recados || []).map((r: any) => {
        const h = leituras.filter((l: any) => String(l.recado_id) === String(r.id));
        const atual = h.find((l: any) => new Date(l.recado_updated_at).getTime() === new Date(r.updated_at).getTime());
        return { id: r.id, empresa_id: r.empresa_id, empresa_nome: r.empresa_nome, data_inicio: r.data_inicio, data_fim: r.data_fim, data_recado: r.data_inicio, mensagem: r.mensagem, criado_por: r.criado_por, criado_por_email: r.criado_por_email, createdAt: r.created_at, updatedAt: r.updated_at, lido: Boolean(atual), teve_leitura_anterior: h.length > 0, confirmacao_tipo: atual?.tipo || null, confirmado_em: atual?.confirmado_em || null };
      }));
    }

    if (req.method === 'POST') {
      if (req.user.role !== 'agente') return res.status(403).json({ error: 'Somente agentes precisam confirmar recados.' });
      const id = String(req.body?.recado_id || '');
      if (!id) return res.status(400).json({ error: 'Recado obrigatório.' });
      const { data: rec, error: recError } = await supabase.from('recados').select('id,updated_at').eq('id', id).maybeSingle();
      if (recError || !rec) return res.status(404).json({ error: 'Recado não encontrado.' });
      const { data: h } = await supabase.from('recados_leituras').select('id').eq('usuario_id', req.user.id).eq('recado_id', id).limit(1);
      const { data, error } = await supabase.from('recados_leituras').upsert({ recado_id: id, usuario_id: req.user.id, recado_updated_at: rec.updated_at, tipo: h?.length ? 'atualizacao' : 'lido' }, { onConflict: 'recado_id,usuario_id,recado_updated_at' }).select('*').single();
      if (error) return res.status(500).json({ error: 'Não foi possível confirmar a leitura.', details: error.message });
      return res.status(201).json(data);
    }
    return res.status(405).json({ error: 'Método não permitido' });
  }

  return res.status(400).json({ error: 'Operação inválida.' });
});



router.get('/agentes', requireAuth, requireSupervisor, async (_req, res) => {
  if (!supabase) return res.json([]);
  const { data, error } = await supabase.from('usuarios').select('id, auth_user_id, email, login, nome, role, ramal, codigo_sonax, nicho_agente, turno, ativo, created_at').eq('role','agente').order('nome');
  if (error) return res.status(500).json({ error: 'Não foi possível consultar os agentes.' });
  res.json(data || []);
});
router.post('/agentes', requireAuth, requireSupervisor, async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Cadastro de agentes exige Supabase configurado.' });
  const nome=String(req.body?.nome||'').trim(), ramal=String(req.body?.ramal||'').trim(), codigo_sonax=String(req.body?.codigo_sonax||'26253'), nicho_agente=String(req.body?.nicho_agente||''), turno=String(req.body?.turno||'').trim(), senha=String(req.body?.senha||'');
  if(!nome||!ramal||!turno||senha.length<6) return res.status(400).json({error:'Preencha os campos obrigatórios e use senha com no mínimo 6 caracteres.'});
  const login=nome.replace(/\s+/g,' '), slug=nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'')||'agente';
  const email=`${slug}.${Date.now().toString(36)}@agentes.sonax.net.br`;
  const {data:authData,error:authError}=await supabase.auth.admin.createUser({email,password:senha,email_confirm:true,user_metadata:{nome,login,role:'agente'}});
  if(authError||!authData.user)return res.status(500).json({error:'Não foi possível criar o login no Supabase Auth.'});
  const {data,error}=await supabase.from('usuarios').insert({auth_user_id:authData.user.id,email,login,nome,role:'agente',ramal,codigo_sonax,nicho_agente,turno,ativo:true}).select('*').single();
  if(error){await supabase.auth.admin.deleteUser(authData.user.id);return res.status(500).json({error:'Não foi possível salvar o perfil do agente.'});}
  res.status(201).json(data);
});

router.get('/dashboard', requireAuth, requireSupervisor, async (_req,res)=>{
  if(!supabase)return res.json({agentes:[],acessos_hoje:[],pendentes_ciencia:[],total_recados_vigentes:0});
  const hoje=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
  const [{data:agentes},{data:acessos},{data:recados}]=await Promise.all([
    supabase.from('usuarios').select('id, auth_user_id, login, nome, ramal, nicho_agente, turno').eq('role','agente').eq('ativo',true).order('nome'),
    supabase.from('agente_acessos').select('usuario_id, login_em').eq('data_acesso',hoje),
    supabase.from('recados').select('id, updated_at').lte('data_inicio',hoje).gte('data_fim',hoje)
  ]);
  const ids=(recados||[]).map((r:any)=>r.id); let leituras:any[]=[];
  if(ids.length){const r=await supabase.from('recados_leituras').select('recado_id, usuario_id, recado_updated_at').in('recado_id',ids);leituras=r.data||[];}
  const setA=new Set((acessos||[]).map((a:any)=>String(a.usuario_id)));
  const rows=(agentes||[]).map((a:any)=>{const uid=String(a.auth_user_id||a.id);const p=(recados||[]).filter((r:any)=>!leituras.some((l:any)=>String(l.usuario_id)===uid&&String(l.recado_id)===String(r.id)&&new Date(l.recado_updated_at).getTime()===new Date(r.updated_at).getTime())).length;const acc=(acessos||[]).filter((x:any)=>String(x.usuario_id)===uid).sort((x:any,y:any)=>String(y.login_em).localeCompare(String(x.login_em)))[0];return {...a,acessou_hoje:setA.has(uid),ultimo_acesso_hoje:acc?.login_em||null,recados_pendentes:p};});
  res.json({data:hoje,agentes:rows,acessos_hoje:rows.filter((a:any)=>a.acessou_hoje),pendentes_ciencia:rows.filter((a:any)=>a.recados_pendentes>0),total_recados_vigentes:(recados||[]).length});
});

router.get('/recados/leituras', requireAuth, async (req:any,res)=>{
  if(!supabase)return res.json([]); const hoje=String(req.query.data||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()));
  let q=supabase.from('recados').select('*').lte('data_inicio',hoje).gte('data_fim',hoje).order('data_inicio',{ascending:false}); if(req.query.empresa_id)q=q.eq('empresa_id',String(req.query.empresa_id));
  const {data:recados,error}=await q;if(error)return res.status(500).json({error:'Não foi possível consultar os recados.'}); const ids=(recados||[]).map((r:any)=>r.id);let leituras:any[]=[];
  if(ids.length){const r=await supabase.from('recados_leituras').select('*').eq('usuario_id',req.user.id).in('recado_id',ids).order('confirmado_em',{ascending:false});leituras=r.data||[];}
  res.json((recados||[]).map((r:any)=>{const h=leituras.filter((l:any)=>String(l.recado_id)===String(r.id));const atual=h.find((l:any)=>new Date(l.recado_updated_at).getTime()===new Date(r.updated_at).getTime());return {id:r.id,empresa_id:r.empresa_id,empresa_nome:r.empresa_nome,data_inicio:r.data_inicio,data_fim:r.data_fim,data_recado:r.data_inicio,mensagem:r.mensagem,criado_por:r.criado_por,createdAt:r.created_at,updatedAt:r.updated_at,lido:Boolean(atual),teve_leitura_anterior:h.length>0,confirmacao_tipo:atual?.tipo||null,confirmado_em:atual?.confirmado_em||null};}));
});
router.post('/recados/leituras', requireAuth, async (req:any,res)=>{
  if(req.user.role!=='agente')return res.status(403).json({error:'Somente agentes precisam confirmar recados.'}); if(!supabase)return res.status(500).json({error:'Supabase não configurado.'}); const id=String(req.body?.recado_id||'');
  const {data:rec}=await supabase.from('recados').select('id,updated_at').eq('id',id).maybeSingle();if(!rec)return res.status(404).json({error:'Recado não encontrado.'}); const {data:h}=await supabase.from('recados_leituras').select('id').eq('usuario_id',req.user.id).eq('recado_id',id).limit(1);
  const {data,error}=await supabase.from('recados_leituras').upsert({recado_id:id,usuario_id:req.user.id,recado_updated_at:rec.updated_at,tipo:h?.length?'atualizacao':'lido'},{onConflict:'recado_id,usuario_id,recado_updated_at'}).select('*').single();if(error)return res.status(500).json({error:'Não foi possível confirmar a leitura.'});res.status(201).json(data);
});

router.get('/empresas', requireAuth, async (req, res) => {
  if (!supabase) {
    const empresas = readStore().empresas;
    return res.json(req.query.ativas === 'true' ? empresas.filter((empresa) => empresa.ativo) : empresas);
  }
  let query = supabase.from('empresas').select('*').order('nome', { ascending: true });
  if (req.query.ativas === 'true') query = query.eq('ativo', true);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: 'Não foi possível consultar as empresas.', details: error.message });
  return res.json((data || []).map((row:any) => ({ ...row, createdAt: row.created_at, updatedAt: row.updated_at })));
});
router.get('/empresas/:id', requireAuth, async (req, res) => {
  if (!supabase) {
    const empresa = readStore().empresas.find((item) => item.id === req.params.id);
    return empresa ? res.json(empresa) : res.status(404).json({ error: 'Empresa não encontrada' });
  }
  const { data, error } = await supabase.from('empresas').select('*').eq('id', req.params.id).maybeSingle();
  if (error) return res.status(500).json({ error: 'Não foi possível consultar a empresa.', details: error.message });
  if (!data) return res.status(404).json({ error: 'Empresa não encontrada' });
  return res.json({ ...data, createdAt: data.created_at, updatedAt: data.updated_at });
});
router.post('/empresas', requireAuth, requireSupervisor, async (req, res) => {
  if (!supabase) { const now = new Date().toISOString(); const empresa: Empresa = { id: randomUUID(), ...req.body, ativo: req.body?.ativo ?? true, createdAt: now, updatedAt: now }; const store = readStore(); store.empresas.push(empresa); writeStore(store); return res.status(201).json(empresa); }
  const { data, error } = await supabase.from('empresas').insert(req.body).select('*').single();
  if (error) return res.status(500).json({ error: 'Não foi possível salvar a empresa.', details: error.message });
  return res.status(201).json({ ...data, createdAt: data.created_at, updatedAt: data.updated_at });
});
router.put('/empresas/:id', requireAuth, requireSupervisor, async (req, res) => {
  if (!supabase) { const store = readStore(); const index = store.empresas.findIndex((item) => item.id === req.params.id); if (index < 0) return res.status(404).json({ error: 'Empresa não encontrada' }); store.empresas[index] = { ...store.empresas[index], ...req.body, id: store.empresas[index].id, createdAt: store.empresas[index].createdAt, updatedAt: new Date().toISOString() }; writeStore(store); return res.json(store.empresas[index]); }
  const { data, error } = await supabase.from('empresas').update(req.body).eq('id', req.params.id).select('*').maybeSingle();
  if (error) return res.status(500).json({ error: 'Não foi possível atualizar a empresa.', details: error.message });
  if (!data) return res.status(404).json({ error: 'Empresa não encontrada' });
  return res.json({ ...data, createdAt: data.created_at, updatedAt: data.updated_at });
});
router.patch('/empresas/:id/status', requireAuth, requireSupervisor, async (req, res) => {
  if (!supabase) { const store = readStore(); const empresa = store.empresas.find((item) => item.id === req.params.id); if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' }); empresa.ativo = Boolean(req.body?.ativo); empresa.updatedAt = new Date().toISOString(); writeStore(store); return res.json(empresa); }
  const { data, error } = await supabase.from('empresas').update({ ativo: Boolean(req.body?.ativo) }).eq('id', req.params.id).select('*').maybeSingle();
  if (error) return res.status(500).json({ error: 'Não foi possível alterar o status.', details: error.message });
  if (!data) return res.status(404).json({ error: 'Empresa não encontrada' });
  return res.json({ ...data, createdAt: data.created_at, updatedAt: data.updated_at });
});
router.delete('/empresas/:id', requireAuth, requireSupervisor, async (req, res) => {
  if (!supabase) { const store = readStore(); const empresa = store.empresas.find((item) => item.id === req.params.id); if (!empresa) return res.status(404).json({ error: 'Empresa não encontrada' }); empresa.ativo = false; empresa.updatedAt = new Date().toISOString(); writeStore(store); return res.json({ inativada: true, totalRecadosVinculados: store.recados.filter((recado) => recado.empresa_id === empresa.id).length, message: 'Empresa inativada com sucesso.' }); }
  const [{ count }, { data, error }] = await Promise.all([
    supabase.from('recados').select('id', { count: 'exact', head: true }).eq('empresa_id', req.params.id),
    supabase.from('empresas').update({ ativo: false }).eq('id', req.params.id).select('id').maybeSingle(),
  ]);
  if (error) return res.status(500).json({ error: 'Não foi possível inativar a empresa.', details: error.message });
  if (!data) return res.status(404).json({ error: 'Empresa não encontrada' });
  return res.json({ inativada: true, totalRecadosVinculados: count || 0, message: 'Empresa inativada com sucesso.' });
});

router.get('/recados/empresa/:empresaId/hoje', requireAuth, async (req, res) => {
  const date = String(req.query.dataHoje || new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date()));
  if (!supabase) { const store = readStore(); return res.json(store.recados.filter((recado) => recado.empresa_id === req.params.empresaId && (recado.data_inicio || recado.data_recado) <= date && (recado.data_fim || recado.data_recado) >= date).map((recado) => enrichRecado(recado, store))); }
  const { data, error } = await supabase.from('recados').select('*').eq('empresa_id', req.params.empresaId).lte('data_inicio', date).gte('data_fim', date).order('data_inicio', { ascending: false });
  if (error) return res.status(500).json({ error: 'Não foi possível consultar os recados.', details: error.message });
  return res.json((data || []).map((r:any)=>({ ...r, data_recado:r.data_inicio, createdAt:r.created_at, updatedAt:r.updated_at })));
});
router.get('/recados', requireAuth, async (req, res) => {
  if (!supabase) { const store = readStore(); let recados = store.recados; if (req.query.empresa_id) recados = recados.filter((recado) => recado.empresa_id === req.query.empresa_id); if (req.query.data_recado) { const d=String(req.query.data_recado); recados = recados.filter((recado) => (recado.data_inicio || recado.data_recado) <= d && (recado.data_fim || recado.data_recado) >= d); } return res.json(recados.map((recado) => enrichRecado(recado, store))); }
  let q = supabase.from('recados').select('*').order('data_inicio', { ascending: false }).order('created_at', { ascending: false });
  if (req.query.empresa_id) q = q.eq('empresa_id', String(req.query.empresa_id));
  if (req.query.data_recado) { const d=String(req.query.data_recado); q=q.lte('data_inicio',d).gte('data_fim',d); }
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: 'Não foi possível consultar os recados.', details: error.message });
  return res.json((data || []).map((r:any)=>({ ...r, data_recado:r.data_inicio, createdAt:r.created_at, updatedAt:r.updated_at })));
});
router.post('/recados', requireAuth, requireSupervisor, async (req:any, res) => {
  const dataInicio=String(req.body?.data_inicio || req.body?.data_recado || '');
  const dataFim=String(req.body?.data_fim || req.body?.data_recado || '');
  const mensagem=String(req.body?.mensagem || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim) || dataFim < dataInicio || !mensagem) return res.status(400).json({ error:'Período válido e mensagem são obrigatórios.' });
  if (!supabase) { const store = readStore(); if (!store.empresas.some((empresa) => empresa.id === req.body?.empresa_id)) return res.status(400).json({ error: 'Empresa inválida' }); const now = new Date().toISOString(); const recado: Recado = { id: randomUUID(), ...req.body, data_recado:dataInicio, data_inicio:dataInicio, data_fim:dataFim, mensagem, createdAt: now, updatedAt: now }; store.recados.push(recado); writeStore(store); return res.status(201).json(enrichRecado(recado, store)); }
  const empresaId=String(req.body?.empresa_id || '');
  const { data: empresa } = await supabase.from('empresas').select('id,nome').eq('id',empresaId).maybeSingle();
  if (!empresa) return res.status(400).json({ error:'Empresa inválida.' });
  const payload={empresa_id:empresaId,empresa_nome:empresa.nome,data_inicio:dataInicio,data_fim:dataFim,data_recado:dataInicio,mensagem,criado_por:String(req.body?.criado_por || req.user.id),criado_por_email:req.user.email};
  const { data, error } = await supabase.from('recados').insert(payload).select('*').single();
  if (error) return res.status(500).json({ error:'Não foi possível salvar o recado.', details:error.message });
  return res.status(201).json({ ...data, data_recado:data.data_inicio, createdAt:data.created_at, updatedAt:data.updated_at });
});
router.put('/recados/:id', requireAuth, requireSupervisor, async (req:any, res) => {
  if (!supabase) { const store=readStore(); const index=store.recados.findIndex((item)=>item.id===req.params.id); if(index<0)return res.status(404).json({error:'Recado não encontrado'}); store.recados[index]={...store.recados[index],...req.body,id:store.recados[index].id,createdAt:store.recados[index].createdAt,updatedAt:new Date().toISOString()}; writeStore(store); return res.json(enrichRecado(store.recados[index],store)); }
  const changes:any={updated_at:new Date().toISOString()};
  if(req.body?.empresa_id!==undefined){const {data:e}=await supabase.from('empresas').select('id,nome').eq('id',String(req.body.empresa_id)).maybeSingle();if(!e)return res.status(400).json({error:'Empresa inválida'});changes.empresa_id=e.id;changes.empresa_nome=e.nome;}
  if(req.body?.data_inicio!==undefined||req.body?.data_recado!==undefined){changes.data_inicio=String(req.body.data_inicio||req.body.data_recado);changes.data_recado=changes.data_inicio;}
  if(req.body?.data_fim!==undefined||req.body?.data_recado!==undefined)changes.data_fim=String(req.body.data_fim||req.body.data_recado);
  if(req.body?.mensagem!==undefined)changes.mensagem=String(req.body.mensagem).trim();
  const {data,error}=await supabase.from('recados').update(changes).eq('id',req.params.id).select('*').maybeSingle();if(error)return res.status(500).json({error:'Não foi possível atualizar o recado.',details:error.message});if(!data)return res.status(404).json({error:'Recado não encontrado'});return res.json({...data,data_recado:data.data_inicio,createdAt:data.created_at,updatedAt:data.updated_at});
});
router.delete('/recados/:id', requireAuth, requireSupervisor, async (req, res) => {
  if (!supabase) { const store=readStore(); const index=store.recados.findIndex((item)=>item.id===req.params.id); if(index<0)return res.status(404).json({error:'Recado não encontrado'});store.recados.splice(index,1);writeStore(store);return res.status(204).end(); }
  const {data,error}=await supabase.from('recados').delete().eq('id',req.params.id).select('id').maybeSingle();if(error)return res.status(500).json({error:'Não foi possível excluir o recado.',details:error.message});if(!data)return res.status(404).json({error:'Recado não encontrado'});return res.status(204).end();
});

export default router;
