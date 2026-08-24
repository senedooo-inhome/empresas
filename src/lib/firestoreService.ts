import { Empresa, Recado, UserProfile } from '../types';
import { apiRequest } from './apiClient';
import { getTodaySaoPaulo } from './firebase';

// EventEmitter simples para atualizações reativas no frontend
type Listener = () => void;
const listeners = new Set<Listener>();

function notifyChange() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.warn('[DataSync] Erro no listener:', e);
    }
  });
}

// ==========================================
// 1. PROFILES / USERS
// ==========================================
export async function getUserProfile(uid?: string): Promise<UserProfile | null> {
  try {
    const res = await apiRequest<{ user: UserProfile }>('/api/auth/me');
    return res.user || null;
  } catch {
    return null;
  }
}

export async function upsertUserProfile(_uid: string, _profile: Partial<UserProfile>): Promise<void> {
  // No modelo com backend interno, o perfil é gerenciado exclusivamente pelo backend
}

// ==========================================
// 2. EMPRESAS
// ==========================================
export async function getEmpresas(apenasAtivas: boolean = true): Promise<Empresa[]> {
  try {
    const query = apenasAtivas ? '?ativas=true' : '';
    const res = await apiRequest<Empresa[]>(`/api/empresas${query}`);
    return res || [];
  } catch (err) {
    console.error('[Backend API] Erro ao buscar empresas:', err);
    return [];
  }
}

export async function getEmpresaById(id: string): Promise<Empresa | null> {
  try {
    const res = await apiRequest<Empresa>(`/api/empresas/${id}`);
    return res || null;
  } catch {
    return null;
  }
}

export function subscribeEmpresaById(
  id: string,
  callback: (empresa: Empresa | null) => void
): () => void {
  let active = true;

  const fetchItem = async () => {
    if (!active) return;
    const item = await getEmpresaById(id);
    if (active) callback(item);
  };

  fetchItem();
  listeners.add(fetchItem);

  const interval = setInterval(fetchItem, 4000);

  return () => {
    active = false;
    listeners.delete(fetchItem);
    clearInterval(interval);
  };
}

export function subscribeEmpresas(
  apenasAtivas: boolean,
  callback: (empresas: Empresa[]) => void
): () => void {
  let active = true;

  const fetchList = async () => {
    if (!active) return;
    const list = await getEmpresas(apenasAtivas);
    if (active) callback(list);
  };

  fetchList();
  listeners.add(fetchList);

  const interval = setInterval(fetchList, 3000);

  return () => {
    active = false;
    listeners.delete(fetchList);
    clearInterval(interval);
  };
}

export async function createEmpresa(
  payload: Omit<Empresa, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const res = await apiRequest<Empresa>('/api/empresas', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  notifyChange();
  return res.id;
}

export async function updateEmpresa(
  id: string,
  payload: Partial<Omit<Empresa, 'id' | 'createdAt'>>
): Promise<void> {
  await apiRequest<Empresa>(`/api/empresas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  notifyChange();
}

export async function setEmpresaStatus(id: string, ativo: boolean): Promise<void> {
  await apiRequest<Empresa>(`/api/empresas/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ ativo }),
  });
  notifyChange();
}

export async function inativarOuExcluirEmpresa(id: string): Promise<{
  inativada: boolean;
  totalRecadosVinculados: number;
  message: string;
}> {
  const res = await apiRequest<{
    inativada: boolean;
    totalRecadosVinculados: number;
    message: string;
  }>(`/api/empresas/${id}`, {
    method: 'DELETE',
  });
  notifyChange();
  return res;
}

// ==========================================
// 3. RECADOS
// ==========================================
export async function getRecados(empresaId?: string, dataRecado?: string): Promise<Recado[]> {
  try {
    const params = new URLSearchParams();
    if (empresaId) params.append('empresa_id', empresaId);
    if (dataRecado) params.append('data_recado', dataRecado);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await apiRequest<Recado[]>(`/api/recados${query}`);
    return res || [];
  } catch (err) {
    console.error('[Backend API] Erro ao buscar recados:', err);
    return [];
  }
}

export function subscribeRecados(
  dataRecadoFilter: string | null,
  callback: (recados: Recado[]) => void
): () => void {
  let active = true;

  const fetchRecados = async () => {
    if (!active) return;
    const list = await getRecados(undefined, dataRecadoFilter || undefined);
    if (active) callback(list);
  };

  fetchRecados();
  listeners.add(fetchRecados);

  const interval = setInterval(fetchRecados, 3000);

  return () => {
    active = false;
    listeners.delete(fetchRecados);
    clearInterval(interval);
  };
}

export async function getRecadoDoDiaPorEmpresa(
  empresaId: string,
  dataHoje: string = getTodaySaoPaulo()
): Promise<Recado | null> {
  try {
    const list = await apiRequest<Recado[]>(
      `/api/recados/empresa/${empresaId}/hoje?dataHoje=${encodeURIComponent(dataHoje)}`
    );
    return list && list.length > 0 ? list[0] : null;
  } catch {
    return null;
  }
}

export function subscribeRecadosEmpresaHoje(
  empresaId: string,
  dataHoje: string,
  callback: (recados: Recado[]) => void
): () => void {
  let active = true;

  const fetchRecados = async () => {
    if (!active) return;
    try {
      const list = await apiRequest<Recado[]>(
        `/api/recados/empresa/${empresaId}/hoje?dataHoje=${encodeURIComponent(dataHoje)}`
      );
      if (active) callback(list || []);
    } catch {
      if (active) callback([]);
    }
  };

  fetchRecados();
  listeners.add(fetchRecados);

  const interval = setInterval(fetchRecados, 3000);

  return () => {
    active = false;
    listeners.delete(fetchRecados);
    clearInterval(interval);
  };
}

export function subscribeRecadoEmpresaHoje(
  empresaId: string,
  dataHoje: string,
  callback: (recado: Recado | null) => void
): () => void {
  return subscribeRecadosEmpresaHoje(empresaId, dataHoje, (recados) => {
    callback(recados.length > 0 ? recados[0] : null);
  });
}

export async function createRecado(
  payload: Omit<Recado, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const res = await apiRequest<Recado>('/api/recados', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  notifyChange();
  return res.id;
}

export async function updateRecado(
  id: string,
  payload: Partial<Omit<Recado, 'id' | 'createdAt'>>
): Promise<void> {
  await apiRequest<Recado>(`/api/recados/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  notifyChange();
}

export async function deleteRecado(id: string): Promise<void> {
  await apiRequest(`/api/recados/${id}`, {
    method: 'DELETE',
  });
  notifyChange();
}

// ==========================================
// 4. STORAGE DE LOGOS
// ==========================================
export async function uploadEmpresaLogo(empresaId: string, file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // Retorna data URL para armazenamento direto da logo
      resolve(reader.result as string);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// ==========================================
// 5. SEED CHECK
// ==========================================
export async function seedInitialDataIfEmpty(): Promise<void> {
  // Inicialização controlada diretamente pelo backend
}
