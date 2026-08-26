export type UserRole = 'supervisao' | 'agente';

export type NichoEmpresa = 'CLINICA' | 'SAC';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  nome?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  nome: string;
  login?: string;
}

export interface SistemaLink {
  nome: string;
  url: string;
}

export interface Empresa {
  id: string;
  nome: string;
  nicho: NichoEmpresa | string; // 'CLINICA' | 'SAC'
  segmento: string; // Informado de forma manual
  link_sistema: string;
  links_sistema?: SistemaLink[];
  resumo: string;
  logo_url: string;
  ativo: boolean; // Suporte para exclusão lógica preservando histórico
  createdAt: string;
  updatedAt: string;
}

export interface Recado {
  id: string;
  empresa_id: string;
  empresa_nome?: string; // Campo enriquecido para conveniência
  data_recado: string; // Compatibilidade: corresponde à data inicial
  data_inicio: string;
  data_fim: string;
  mensagem: string;
  criado_por: string;
  criado_por_email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: UserProfile;
  token: string;
}

export type RecadoStatus = 'Hoje' | 'Futuro' | 'Expirado';

export interface RecadoComStatus extends Recado {
  status: RecadoStatus;
}

export interface Agente {
  id: string;
  auth_user_id?: string;
  email: string;
  login: string;
  nome: string;
  ramal: string;
  codigo_sonax: string;
  nicho_agente: 'SAC' | 'CLINICAS' | 'SAC & CLINICA';
  turno: string;
  ativo: boolean;
  created_at?: string;
}

export interface RecadoLeituraStatus extends Recado {
  lido: boolean;
  teve_leitura_anterior: boolean;
  confirmacao_tipo?: 'lido' | 'atualizacao' | null;
  confirmado_em?: string | null;
}
