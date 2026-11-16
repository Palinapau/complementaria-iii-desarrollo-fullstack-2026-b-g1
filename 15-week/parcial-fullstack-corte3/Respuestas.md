# Parcial práctico · Corte 3 — Fullstack

**Estudiante:** Paulina Díaz Perdomo
**Proyecto de referencia:** BarFlow (API Spring Boot 3.4 / Java 17 + portal React 19 / Vite / TypeScript + PostgreSQL 16)

---

## Problema 1 — Seguridad: flujo de login con JWT

### Flujo en BarFlow

```
1. Portal  -> POST /api/v1/auth/login  {username, password}        (ruta pública, permitAll)
2. API     : AuthService busca el usuario y compara la contraseña con el hash BCrypt
3. API     : JwtService.generate(user) firma un JWT con HMAC y JWT_SECRET:
             subject = username, claim "role", issuedAt, expiration (60 min por defecto)
4. API     -> 200 { token, user }   (el user no incluye passwordHash)
5. Portal  : saveSession() guarda token y usuario en sessionStorage
6. Portal  -> cualquier petición: apiRequest() agrega  Authorization: Bearer <token>
7. API     : JwtAuthenticationFilter lee el header y llama jwtService.validate(token)
             - válido   -> deja autenticada la petición con username y ROLE_<rol>
             - inválido / vencido / ausente -> sigue sin autenticar
8. API     : SecurityConfig decide:
             - sin autenticar en ruta protegida -> 401 UNAUTHORIZED
             - autenticado pero rol insuficiente -> 403 FORBIDDEN
             - rol correcto -> el controlador responde 200
```

**Cómo se emite el token:** solo después de validar usuario y contraseña. El JWT tiene tres partes
(header, payload y firma). La firma se calcula con `JWT_SECRET` (mínimo 32 caracteres), que solo conoce
el servidor, así que si alguien cambia el rol dentro del token la firma deja de coincidir y `validate`
lo rechaza. El payload va codificado pero **no cifrado**: por eso no lleva la contraseña.

**Dónde lo guarda el frontend:** en `sessionStorage` (`tokenService.ts`, clave `barflow_token`). Se borra al
cerrar la pestaña. Es más cómodo que una cookie pero queda expuesto si hay una falla XSS; la alternativa más
segura sería una cookie `httpOnly`. El token expira (60 min por defecto), lo que limita el daño si se filtra.
Al recibir un 401, `apiClient.ts` llama `clearSession()`, y `ProtectedRoute` manda al login si no hay token.

**Cómo protege el backend un endpoint:** con un filtro y reglas en `SecurityConfig`:

```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers(HttpMethod.POST, "/api/v1/auth/login").permitAll()
    .requestMatchers("/api/v1/users/**").hasRole("ADMIN")
    .requestMatchers(HttpMethod.GET, "/api/v1/categories/**", "/api/v1/products/**").authenticated()
    .requestMatchers("/api/v1/categories/**", "/api/v1/products/**").hasRole("ADMIN")
    .requestMatchers("/api/v1/reports/**").hasRole("ADMIN")
    .anyRequest().authenticated())
```

Además la API es *stateless* (`SessionCreationPolicy.STATELESS`): no guarda sesión en el servidor, cada
petición se autentica con su token. Por eso CSRF está deshabilitado.

### Autenticación vs. autorización (con ejemplos de BarFlow)

| | Autenticación | Autorización |
|---|---|---|
| Pregunta | ¿**Quién** eres? | ¿**Qué puedes hacer**? |
| En BarFlow | Login con usuario y contraseña; el token válido prueba tu identidad | `hasRole("ADMIN")`: solo el administrador gestiona usuarios, productos y reportes |
| Cuándo | Primero (login / validar token) | Después, en cada ruta protegida |
| Fallo | 401 Unauthorized | 403 Forbidden |

Ejemplo: una mesera (`WAITER`) está autenticada con un token válido, pero si llama a `/api/v1/users` recibe
**403**, porque su rol no tiene permiso.

### English (authentication vs. authorization)

Authentication verifies who a user is, for example by checking a username and password and issuing a token.
Authorization decides what that authenticated user is allowed to do, such as letting only admins manage users.
A user can be authenticated and still be denied access to a resource their role does not permit.

---

## Problema 2 — Integración y pruebas

### Cómo el portal consume un endpoint protegido

Todas las pantallas usan `apiRequest()` (`services/apiClient.ts`):

```ts
const token = getToken();
const headers = new Headers(options.headers);
if (token) headers.set('Authorization', `Bearer ${token}`);

const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

if (response.status === 401) clearSession();          // token vencido o inválido
if (!response.ok) {
  const error = await response.json().catch(() => null);
  throw new Error(error?.message || 'Ocurrió un error al comunicarse con el servidor');
}
```

Cada página (por ejemplo `ProductsPage`) maneja el estado de **carga** (`loading`), de **error** (`error`) y de
**datos**, mostrando el mensaje que devuelve la API. La URL base sale de `VITE_API_URL`, y las rutas privadas
están envueltas en `ProtectedRoute`, que redirige a `/login` si no hay sesión.

### Cómo se resuelve CORS

CORS es una restricción del **navegador**: el portal (`http://localhost:5173`) y la API (`http://localhost:8080`)
son orígenes distintos, y el navegador bloquea la respuesta a menos que la API lo autorice. Como la petición
lleva el header `Authorization`, el navegador envía antes un *preflight* `OPTIONS` sin token.

BarFlow lo resuelve en `SecurityConfig`:

```java
.cors(Customizer.withDefaults())   // antes de la autenticación: el preflight no lleva token

CorsConfiguration config = new CorsConfiguration();
config.setAllowedOrigins(List.of(allowedOrigin));                       // CORS_ALLOWED_ORIGIN
config.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
source.registerCorsConfiguration("/api/**", config);
```

Solo se permite el origen del portal (no `*`), y ese origen viene de la variable de entorno `CORS_ALLOWED_ORIGIN`,
así que en producción se cambia por la URL real sin tocar código.

### Prueba unitaria — `JwtServiceTest` (ya existe en el proyecto)

```java
@Test
void tokenSignedWithAnotherKeyIsRejected() {
    String foreignToken = new JwtService("b".repeat(32), 60).generate(maria);

    assertThat(new JwtService(SECRET, 60).validate(foreignToken)).isEmpty();
}
```

**Qué verifica:** que un token firmado con otra clave **no** se acepta. Es unitaria porque prueba solo la clase
`JwtService`, sin base de datos ni servidor. (En la misma clase hay pruebas para token vencido y mal formado.)

### Prueba de integración — `AuthControllerTest` (ya existe) y variante propuesta

`AuthControllerTest` usa `@SpringBootTest` + `MockMvc`, levanta la aplicación con seguridad real y verifica el
login (200 con token), contraseña incorrecta (401), y 401 sin token / 403 con rol equivocado. Una prueba de este
tipo para el parcial:

```java
@Test
void waiterCannotListUsers() throws Exception {
    String token = login("maria", PASSWORD)            // WAITER
            .andReturn().getResponse().getContentAsString();
    String jwt = JsonPath.read(token, "$.token");

    mvc.perform(get("/api/v1/users").header(HttpHeaders.AUTHORIZATION, "Bearer " + jwt))
       .andExpect(status().isForbidden());              // autenticada, sin permiso

    mvc.perform(get("/api/v1/users"))
       .andExpect(status().isUnauthorized());           // sin token
}
```

**Qué verifica:** que varias piezas juntas (filtro JWT + `SecurityConfig` + controlador + base de datos de
pruebas H2) devuelven **403** con un rol sin permiso y **401** sin token. Es de integración porque cruza varias capas.

---

## Problema 3 — Contenedores y despliegue

### Dockerfile del backend (`bf-api/Dockerfile`, Spring Boot / Java 17)

```dockerfile
# Etapa 1: compila el .jar con Maven
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -B -q dependency:go-offline      # capa de dependencias reutilizable
COPY src ./src
RUN mvn -B -q package -DskipTests        # las pruebas se corren aparte con "mvn test"

# Etapa 2: solo ejecuta el .jar (sin Maven ni código fuente)
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 barflow   # no corre como root
COPY --from=build /app/target/bf-api-0.0.1-SNAPSHOT.jar app.jar
USER barflow
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

**Por qué así:** *multi-stage* para que la imagen final solo lleve el JRE y el `.jar` (más liviana y sin
herramientas de compilación); el `pom.xml` se copia primero para aprovechar la caché de Docker; y el usuario
no-root reduce el riesgo si alguien vulnera el contenedor.

### Pasos para desplegar (local con Docker Compose)

BarFlow se levanta con `bf-infra/docker-compose.yml` (servicios `db`, `api` y `portal`):

1. Clonar los cuatro repositorios uno al lado del otro: `bf-infra`, `bf-db`, `bf-api`, `bf-portal`.
2. En `bf-infra`, copiar `.env.example` a `.env` y cambiar las claves (contraseña de la base y `JWT_SECRET`).
3. `docker compose up -d --build` — PostgreSQL ejecuta los scripts de `bf-db/init` la primera vez; la API
   espera a que la base esté sana (`healthcheck`) antes de arrancar.
4. Probar: portal en `http://localhost:5173`, API en `http://localhost:8080` (Swagger en `/swagger-ui.html`).
5. Detener con `docker compose down` (conserva datos) o `docker compose down -v` (borra los datos).

Para la **nube**: construir las imágenes, usar una base PostgreSQL gestionada, definir las variables en el panel
del proveedor, y actualizar `CORS_ALLOWED_ORIGIN` y `VITE_API_URL` con las URL públicas reales.

### Variables de entorno y por qué

| Variable | Para qué | Por qué en variable de entorno |
|---|---|---|
| `JWT_SECRET` | Firmar y verificar los JWT (mín. 32 caracteres) | Es un secreto: si estuviera en el repo, cualquiera podría fabricar tokens válidos |
| `DB_PASSWORD` | Contraseña de PostgreSQL | Credencial; no debe subirse a Git |
| `DB_URL`, `DB_USER`, `DB_NAME` | Conexión a la base | Cambian por entorno (dentro de Docker el host es `db`, local es `localhost:5433`) |
| `JWT_EXPIRATION_MINUTES` | Duración del token (60 por defecto) | Se ajusta por entorno sin recompilar |
| `CORS_ALLOWED_ORIGIN` | Único origen que puede llamar a la API | Es distinto en desarrollo y producción |
| `VITE_API_URL` | URL de la API que usa el navegador | Se inyecta al compilar el portal; apunta a `localhost`, no al contenedor |

**Por qué:** separan la **configuración** del **código**. `application.properties` no tiene valores por defecto
para la base ni el secreto (vienen de `${DB_URL}`, etc.), el archivo `.env` está en `.gitignore` y `.dockerignore`,
y solo se versiona `.env.example`. Así la misma imagen sirve en cualquier entorno y los secretos nunca quedan
en el repositorio.
