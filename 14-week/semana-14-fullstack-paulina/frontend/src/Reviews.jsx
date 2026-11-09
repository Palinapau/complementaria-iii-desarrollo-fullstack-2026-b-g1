import { useEffect, useState } from 'react';
import { getReviews } from './api';

// Vista con datos protegidos: muestra carga, error o lista.
export default function Reviews({ token, onUnauthorized }) {
  const [state, setState] = useState({ status: 'loading' });

  useEffect(() => {
    let active = true;
    getReviews(token)
      .then((data) => active && setState({ status: 'ok', data }))
      .catch((err) => {
        if (!active) return;
        if (err.status === 401) return onUnauthorized();
        setState({ status: 'error', message: err.message });
      });
    return () => {
      active = false;
    };
  }, [token, onUnauthorized]);

  if (state.status === 'loading') return <p>Cargando reseñas…</p>;
  if (state.status === 'error') return <p role="alert">Error: {state.message}</p>;
  if (state.data.length === 0) return <p>Aún no tienes reseñas.</p>;

  return (
    <ul>
      {state.data.map((r) => (
        <li key={r.id}>
          <strong>{r.pelicula}</strong> — {r.calificacion}/5
          <br />
          <small>{r.comentario}</small>
        </li>
      ))}
    </ul>
  );
}
