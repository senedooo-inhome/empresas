export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Se houver token JWT salvo localmente, envia no cabeçalho Authorization
  // garantindo compatibilidade total mesmo em ambientes com iframe ou cookies restritos
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sonax_token');
    if (token && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Inclui cookies HttpOnly automaticamente quando suportado
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg =
      (data && typeof data === 'object' && data.error) ||
      (typeof data === 'string' && data) ||
      `Erro HTTP ${response.status}`;
    console.error(`[API Error ${response.status}] Endpoint: ${url} - Mensagem:`, errorMsg, data);
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

