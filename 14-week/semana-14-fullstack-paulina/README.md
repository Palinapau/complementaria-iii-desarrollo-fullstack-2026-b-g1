<!-- CONFIG
FULL_NAME: Paulina Diaz Perdomo
GITHUB_USER: Palinapau
-->

# Movie Rater — App fullstack segura y probada (v1.0.0)

**Autora:** Paulina Diaz Perdomo ([@Palinapau](https://github.com/Palinapau))

Entrega individual del Corte 3, semana 14 (Desarrollo Full Stack). API REST con **JWT** (Node + Express) y frontend en **React + Vite** que hace login y muestra datos protegidos. Todo corre en un solo contenedor Docker.

## Estructura

```
backend/    API Express: login/registro, endpoints protegidos, CORS, pruebas (Vitest + Supertest)
frontend/   React + Vite: login y vista de reseñas, prueba (Vitest + Testing Library)
Dockerfile  Build multi-etapa: compila el frontend y lo sirve desde el backend
docker-compose.yml
```

## Endpoints

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/health` | público |
| POST | `/api/auth/registro` | público |
| POST | `/api/auth/login` | público → devuelve `{ token }` |
| GET | `/api/resenas` | **protegido** (Bearer token) |
| POST | `/api/resenas` | **protegido** |

Usuario de prueba: `paulina@movierater.com` / `paulina123`.

## Cómo ejecutarla

**Con Docker (recomendado):**

```bash
docker compose up --build
# abrir http://localhost:3000
```

o sin compose:

```bash
docker build -t movie-rater-fullstack .
docker run --rm -p 3000:3000 -e JWT_SECRET=un-secreto-largo movie-rater-fullstack
```

**En desarrollo (dos terminales):**

```bash
cd backend  && npm install && JWT_SECRET=dev-secret npm run dev    # http://localhost:3000
cd frontend && npm install && npm run dev                          # http://localhost:5173
```

En desarrollo el frontend (5173) llama a la API (3000), que es otro origen; por eso el backend configura CORS (`CORS_ORIGIN`, por defecto `http://localhost:5173`).

## Pruebas

```bash
cd backend  && npm test   # 6 pruebas: login, token, 401 sin token / token inválido / contraseña mala, CORS
cd frontend && npm test   # 2 pruebas: login fallido (caso de error) y vista protegida con token
```

## Variables de entorno

| Variable | Dónde | Descripción |
|---|---|---|
| `JWT_SECRET` | backend | **Obligatoria.** Secreto para firmar los tokens. |
| `CORS_ORIGIN` | backend | Orígenes permitidos separados por coma. |
| `PORT` | backend | Puerto (3000 por defecto). |
| `VITE_API_URL` | frontend | URL base de la API (`/api` en Docker). |

## Versionado

Versionado semántico. Versión actual: **v1.0.0**.

- v1.0.0 — JWT (login/registro/rutas protegidas), CORS, pruebas de backend y frontend, Dockerfile.

```bash
git tag v1.0.0 && git push origin v1.0.0
```

## Security & run

The API uses JSON Web Tokens: a user sends an email and password to `/api/auth/login`, the server checks the password against a bcrypt hash, and it returns a signed token that expires after one hour. The frontend stores that token and sends it in the `Authorization: Bearer` header, and a middleware on the server verifies the signature on every protected endpoint such as `/api/resenas`, answering 401 when the token is missing, invalid or expired. CORS is configured with an allow-list, so only the origin set in `CORS_ORIGIN` can call the API from a browser, and the signing secret is never hardcoded because it is read from the `JWT_SECRET` environment variable. The project has eight automated tests: six on the backend that cover the login flow, the 401 error cases and the CORS rules, and two on the frontend that cover a failed login and the protected view. To run everything with Docker, execute `docker compose up --build` and open `http://localhost:3000`, where a multi-stage Dockerfile builds the React app and serves it from the same Node container as the API.
