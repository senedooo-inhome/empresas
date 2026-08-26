-- ============================================================================
-- SONAX IN HOME — Agentes, recados por período, acessos e confirmações de leitura
-- Execute UMA VEZ no SQL Editor do Supabase antes de publicar esta versão.
-- Não altera configurações da Vercel.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) Complementos da tabela de usuários/agentes
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS login TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS ramal TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS codigo_sonax TEXT NOT NULL DEFAULT '26253';
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS nicho_agente TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS turno TEXT;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

-- Aproveita os usuários já existentes.
UPDATE public.usuarios
SET login = CASE
  WHEN role = 'supervisao' THEN COALESCE(login, 'supervisao')
  ELSE COALESCE(NULLIF(login, ''), NULLIF(nome, ''), split_part(email, '@', 1))
END
WHERE login IS NULL OR login = '';

-- Liga perfis já existentes aos usuários do Supabase Auth pelo e-mail, quando possível.
UPDATE public.usuarios u
SET auth_user_id = au.id
FROM auth.users au
WHERE u.auth_user_id IS NULL
  AND lower(u.email) = lower(au.email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_login_lower
ON public.usuarios (lower(login))
WHERE login IS NOT NULL;

ALTER TABLE public.usuarios DROP CONSTRAINT IF EXISTS usuarios_nicho_agente_check;
ALTER TABLE public.usuarios ADD CONSTRAINT usuarios_nicho_agente_check
CHECK (nicho_agente IS NULL OR nicho_agente IN ('SAC', 'CLINICAS', 'SAC & CLINICA'));

-- 2) Recados deixam de ser somente de um dia e passam a ter período
ALTER TABLE public.recados ADD COLUMN IF NOT EXISTS data_inicio DATE;
ALTER TABLE public.recados ADD COLUMN IF NOT EXISTS data_fim DATE;

UPDATE public.recados
SET data_inicio = COALESCE(data_inicio, data_recado),
    data_fim = COALESCE(data_fim, data_recado)
WHERE data_inicio IS NULL OR data_fim IS NULL;

ALTER TABLE public.recados ALTER COLUMN data_inicio SET NOT NULL;
ALTER TABLE public.recados ALTER COLUMN data_fim SET NOT NULL;

ALTER TABLE public.recados DROP CONSTRAINT IF EXISTS recados_periodo_valido_check;
ALTER TABLE public.recados ADD CONSTRAINT recados_periodo_valido_check
CHECK (data_fim >= data_inicio);

CREATE INDEX IF NOT EXISTS idx_recados_periodo ON public.recados(data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_recados_empresa_periodo ON public.recados(empresa_id, data_inicio, data_fim);

-- 3) Registro de acessos dos agentes
CREATE TABLE IF NOT EXISTS public.agente_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data_acesso DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Sao_Paulo')::date),
  login_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agente_acessos_data ON public.agente_acessos(data_acesso);
CREATE INDEX IF NOT EXISTS idx_agente_acessos_usuario_data ON public.agente_acessos(usuario_id, data_acesso);

-- 4) Confirmações de leitura por agente e por versão do recado.
-- Ao editar um recado, updated_at muda e a confirmação antiga deixa de liberar o acesso.
CREATE TABLE IF NOT EXISTS public.recados_leituras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recado_id TEXT NOT NULL REFERENCES public.recados(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recado_updated_at TIMESTAMPTZ NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'lido' CHECK (tipo IN ('lido', 'atualizacao')),
  confirmado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recado_id, usuario_id, recado_updated_at)
);

CREATE INDEX IF NOT EXISTS idx_recados_leituras_usuario ON public.recados_leituras(usuario_id);
CREATE INDEX IF NOT EXISTS idx_recados_leituras_recado ON public.recados_leituras(recado_id);

-- 5) RLS: o sistema acessa estas tabelas somente pelo backend com Service Role.
ALTER TABLE public.agente_acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recados_leituras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service Role agente acessos" ON public.agente_acessos;
DROP POLICY IF EXISTS "Service Role recados leituras" ON public.recados_leituras;
-- Nenhuma policy pública é criada. O backend usa SUPABASE_SERVICE_ROLE_KEY, que ignora RLS.
-- Portanto, agentes não conseguem gravar/ler estas tabelas diretamente pelo cliente.

-- 6) Garante updated_at em usuarios e recados (a função já existe no schema original).
DROP TRIGGER IF EXISTS trigger_usuarios_updated_at ON public.usuarios;
CREATE TRIGGER trigger_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Verificação rápida após executar:
SELECT id, email, login, nome, role, ramal, codigo_sonax, nicho_agente, turno, ativo
FROM public.usuarios
ORDER BY role, nome;
