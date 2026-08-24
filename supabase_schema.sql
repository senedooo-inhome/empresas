-- ==============================================================================
-- SONAX IN HOME - SCRIPT SQL COMPLETO PARA SUPABASE (POSTGRESQL)
-- ==============================================================================
-- Instruções:
-- 1. Abra o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. Vá até a aba "SQL Editor" no menu lateral esquerdo
-- 3. Clique em "+ New query", cole todo o código deste arquivo e clique em "RUN"
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABELA: USUARIOS (Controle de Acesso / Perfis Sonax)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
    id TEXT PRIMARY KEY DEFAULT ('usr_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    email TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('supervisao', 'agente')),
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 3. TABELA: EMPRESAS (Gestão Operacional de Clientes / Contas)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.empresas (
    id TEXT PRIMARY KEY DEFAULT ('emp_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    nome TEXT NOT NULL,
    nicho TEXT NOT NULL DEFAULT 'SAC' CHECK (nicho IN ('CLINICA', 'SAC')),
    segmento TEXT NOT NULL DEFAULT '',
    link_sistema TEXT NOT NULL DEFAULT '',
    resumo TEXT NOT NULL DEFAULT '',
    logo_url TEXT NOT NULL DEFAULT '',
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para buscas rápidas
CREATE INDEX IF NOT EXISTS idx_empresas_ativo ON public.empresas(ativo);
CREATE INDEX IF NOT EXISTS idx_empresas_nicho ON public.empresas(nicho);
CREATE INDEX IF NOT EXISTS idx_empresas_nome ON public.empresas(nome);

-- ==============================================================================
-- 4. TABELA: RECADOS (Comunicados Operacionais do Dia com Retenção de 3 Dias)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.recados (
    id TEXT PRIMARY KEY DEFAULT ('rec_' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
    empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    empresa_nome TEXT DEFAULT '',
    data_recado DATE NOT NULL DEFAULT CURRENT_DATE,
    mensagem TEXT NOT NULL,
    criado_por TEXT NOT NULL DEFAULT 'supervisao',
    criado_por_email TEXT DEFAULT 'supervisao@sonax.net.br',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices para filtro diário e histórico de 3 dias
CREATE INDEX IF NOT EXISTS idx_recados_empresa_id ON public.recados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_recados_data ON public.recados(data_recado);
CREATE INDEX IF NOT EXISTS idx_recados_empresa_data ON public.recados(empresa_id, data_recado);

-- ==============================================================================
-- 5. TRIGGER AUTOMÁTICO PARA ATUALIZAÇÃO DO CAMPO updated_at
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para tabela empresas
DROP TRIGGER IF EXISTS trigger_empresas_updated_at ON public.empresas;
CREATE TRIGGER trigger_empresas_updated_at
    BEFORE UPDATE ON public.empresas
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger para tabela recados
DROP TRIGGER IF EXISTS trigger_recados_updated_at ON public.recados;
CREATE TRIGGER trigger_recados_updated_at
    BEFORE UPDATE ON public.recados
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. FUNÇÃO DE EXPURGO / RETENÇÃO DE RECADOS (ÚLTIMOS 3 DIAS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.limpar_recados_antigos(dias_retencao INT DEFAULT 3)
RETURNS INT AS $$
DECLARE
    linhas_deletadas INT;
    data_limite DATE;
BEGIN
    -- Mantém Hoje (D-0), Ontem (D-1) e Anteontem (D-2). Exclui tudo anterior a (CURRENT_DATE - 2 dias).
    data_limite := CURRENT_DATE - (dias_retencao - 1);
    
    DELETE FROM public.recados
    WHERE data_recado < data_limite;
    
    GET DIAGNOSTICS linhas_deletadas = ROW_COUNT;
    RETURN linhas_deletadas;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 7. SEGURANÇA E ROW LEVEL SECURITY (RLS)
-- ==============================================================================
-- Habilita RLS nas tabelas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recados ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso irrestrito para chave de serviço (Service Role) e leitura pública/autenticada
DROP POLICY IF EXISTS "Acesso total Service Role empresas" ON public.empresas;
CREATE POLICY "Acesso total Service Role empresas" ON public.empresas FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso total Service Role recados" ON public.recados;
CREATE POLICY "Acesso total Service Role recados" ON public.recados FOR ALL USING (true);

DROP POLICY IF EXISTS "Acesso total Service Role usuarios" ON public.usuarios;
CREATE POLICY "Acesso total Service Role usuarios" ON public.usuarios FOR ALL USING (true);

-- ==============================================================================
-- 8. CARGA INICIAL DE DADOS (SEED DATA)
-- ==============================================================================

-- Inserção de Usuários Oficiais Sonax In Home
INSERT INTO public.usuarios (id, email, nome, role, password_hash)
VALUES
    ('usr_supervisao_sonax_01', 'supervisao@sonax.net.br', 'Supervisão Sonax', 'supervisao', '$2b$10$A3O6VwIrqeY44Hsm.68SwulYJ3q8N7yiC3A5bmGuE2FJ5AzpyV0tC'),
    ('usr_agente_sonax_02', 'sonaxinhome@gmail.com', 'Agente Sonax In Home', 'agente', '$2b$10$w.2jLmjKEyj2UMC6vLTWPez9jLfysEnWwht8MsSEg.qW93UTut9yC')
ON CONFLICT (email) DO NOTHING;

-- Inserção de Empresas Iniciais de Demonstração
INSERT INTO public.empresas (id, nome, nicho, segmento, link_sistema, resumo, logo_url, ativo)
VALUES
    (
        'emp_ezvolt_01',
        'EZVolt',
        'SAC',
        'Mobilidade Elétrica',
        'https://v3.mycharge.com.br/#/app/dashboard',
        'Operação de recarga para frotas e veículos elétricos. Monitoramento de eletropostos e atendimento.',
        'https://images.unsplash.com/photo-1558441719-8b489c63f7d1?w=160&auto=format&fit=crop&q=80',
        true
    ),
    (
        'emp_wibe_02',
        'Wibe',
        'SAC',
        'Energia Solar',
        'https://painel.wibeenergia.com.br',
        'Atendimento a clientes de geração distribuída e créditos de energia solar.',
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=160&auto=format&fit=crop&q=80',
        true
    ),
    (
        'emp_brasilis_03',
        'Brasilis Saúde',
        'CLINICA',
        'Planos e Consultas',
        'https://atendimento.brasilissaude.com.br',
        'Central de agendamentos, triagem médica e autorizações de guias clínicas.',
        'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=160&auto=format&fit=crop&q=80',
        true
    )
ON CONFLICT (id) DO NOTHING;

-- Inserção de Recado do Dia Inicial
INSERT INTO public.recados (id, empresa_id, empresa_nome, data_recado, mensagem, criado_por, criado_por_email)
VALUES
    (
        'rec_ezvolt_01',
        'emp_ezvolt_01',
        'EZVolt',
        CURRENT_DATE,
        'Atenção equipe: Sistema de recarga rápida passará por manutenção programada no período noturno.',
        'supervisao',
        'supervisao@sonax.net.br'
    )
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- FIM DO SCRIPT - TABELAS E DADOS CRIADOS COM SUCESSO NO SUPABASE
-- ==============================================================================
