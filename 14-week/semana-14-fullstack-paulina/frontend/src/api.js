// En desarrollo apunta a http://localhost:3000/api (otro origen => necesita CORS).
// En Docker se compila con /api (mismo origen).
const BASE = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}, token) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor', 0);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(body?.message ?? `Error ${res.status}`, res.status);
  return body;
}

export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const getReviews = (token) => request('/resenas', {}, token);
