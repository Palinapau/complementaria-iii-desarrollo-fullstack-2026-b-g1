import { useCallback, useState } from 'react';
import { login } from './api';
import Reviews from './Reviews';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await login(email, password);
      localStorage.setItem('token', token);
      setToken(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <main style={{ maxWidth: 360, margin: '3rem auto', fontFamily: 'sans-serif' }}>
        <h1>Movie Rater</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Correo
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <br />
          <label>
            Contraseña
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <br />
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Iniciar sesión'}</button>
        </form>
        <small>Demo: paulina@movierater.com / paulina123</small>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 480, margin: '3rem auto', fontFamily: 'sans-serif' }}>
      <h1>Mis reseñas</h1>
      <button onClick={logout}>Salir</button>
      <Reviews token={token} onUnauthorized={logout} />
    </main>
  );
}
