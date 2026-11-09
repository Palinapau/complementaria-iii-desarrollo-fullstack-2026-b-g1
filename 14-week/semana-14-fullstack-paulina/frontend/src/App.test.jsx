import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

const jsonResponse = (status, body) => Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('App', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  function fillAndSubmit() {
    fireEvent.change(screen.getByLabelText(/correo/i), { target: { value: 'paulina@movierater.com' } });
    fireEvent.change(screen.getByLabelText(/contraseña/i), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: /iniciar sesión/i }));
  }

  it('ERROR CASE: shows the server message when login fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse(401, { message: 'Credenciales inválidas' })));
    render(<App />);
    fillAndSubmit();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Credenciales inválidas');
  });

  it('after login it stores the token and shows the protected reviews', async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse(200, { token: 'jwt-123' }))
      .mockImplementationOnce(() => jsonResponse(200, [{ id: 1, pelicula: 'Coco', calificacion: 4, comentario: 'Linda' }]));
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    fillAndSubmit();

    await waitFor(() => expect(screen.getByText('Coco')).toBeTruthy());
    expect(localStorage.getItem('token')).toBe('jwt-123');
    // la petición protegida mandó el token en la cabecera
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer jwt-123');
  });
});
