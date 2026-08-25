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
  data_recado: string; // Formato estrito YYYY-MM-DD
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
