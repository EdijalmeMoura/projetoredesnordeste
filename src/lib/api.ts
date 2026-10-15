type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = window.localStorage.getItem('prn:token');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.body);
  }
  const response = await fetch(path, { ...options, headers, body });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new ApiError(typeof payload === 'object' && payload?.error ? payload.error : 'Não foi possível concluir a solicitação.', response.status);
  }
  return payload as T;
}

export function apiUrl(path: string) {
  return path;
}
