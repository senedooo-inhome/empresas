import { UserProfile } from '../types';
import { apiRequest } from './apiClient';

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

// Login interno via Backend
export async function loginWithBackend(email: string, pass: string): Promise<UserProfile> {
  const identifier = email.trim();
  const res = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ login: identifier, password: pass }),
  });

  if (typeof window !== 'undefined' && res.token) {
    localStorage.setItem('sonax_token', res.token);
    localStorage.setItem('sonax_user', JSON.stringify(res.user));
  }

  return res.user;
}

// Logout interno via Backend
export async function logoutBackend(): Promise<void> {
  try {
    await apiRequest('/api/auth/logout', {
      method: 'POST',
    });
  } finally {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sonax_token');
      localStorage.removeItem('sonax_user');
    }
  }
}

// Obter usuário da sessão ativa
export async function getSessionUser(): Promise<UserProfile | null> {
  try {
    const res = await apiRequest<{ user: UserProfile }>('/api/auth/me');
    if (res.user && typeof window !== 'undefined') {
      localStorage.setItem('sonax_user', JSON.stringify(res.user));
    }
    return res.user || null;
  } catch {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sonax_token');
      localStorage.removeItem('sonax_user');
    }
    return null;
  }
}
