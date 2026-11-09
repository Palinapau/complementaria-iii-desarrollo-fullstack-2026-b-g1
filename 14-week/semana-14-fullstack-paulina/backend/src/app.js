import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Crea la app de Express. Recibe la configuración por parámetro para poder probarla.
 * Los datos viven en memoria: suficiente para la actividad (en el proyecto real irían en la BD).
 */
export function createApp({ jwtSecret, corsOrigins = ['http://localhost:5173'], staticDir } = {}) {
  if (!jwtSecret) throw new Error('JWT_SECRET es obligatorio');

  const app = express();
  const users = [
    { id: 1, email: 'paulina@movierater.com', passwordHash: bcrypt.hashSync('paulina123', 10) },
  ];
  const reviews = [
    { id: 1, userId: 1, pelicula: 'Interstellar', calificacion: 5, comentario: 'Banda sonora increíble.' },
    { id: 2, userId: 1, pelicula: 'Coco', calificacion: 4, comentario: 'Muy emotiva.' },
  ];

  // --- CORS: solo los orígenes permitidos pueden llamar a la API desde el navegador ---
  app.use(
    cors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json());

  const sign = (user) => jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: '1h' });

  // --- Middleware JWT: exige "Authorization: Bearer <token>" ---
  function requireAuth(req, res, next) {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return res.status(401).json({ message: 'Token requerido' });
    try {
      req.user = jwt.verify(token, jwtSecret);
      next();
    } catch {
      res.status(401).json({ message: 'Token inválido o vencido' });
    }
  }

  // --- Rutas públicas ---
  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.post('/api/auth/registro', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ message: 'Email y contraseña (mín. 6 caracteres) son obligatorios' });
    }
    if (users.some((u) => u.email === email)) return res.status(409).json({ message: 'El correo ya existe' });
    const user = { id: users.length + 1, email, passwordHash: await bcrypt.hash(password, 10) };
    users.push(user);
    res.status(201).json({ token: sign(user), usuario: { id: user.id, email } });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body ?? {};
    const user = users.find((u) => u.email === email);
    // Mismo mensaje para usuario inexistente y contraseña incorrecta (no revelar cuál falló).
    if (!user || !(await bcrypt.compare(String(password ?? ''), user.passwordHash))) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    res.json({ token: sign(user), usuario: { id: user.id, email: user.email } });
  });

  // --- Rutas protegidas ---
  app.get('/api/resenas', requireAuth, (req, res) => {
    res.json(reviews.filter((r) => r.userId === req.user.sub));
  });

  app.post('/api/resenas', requireAuth, (req, res) => {
    const { pelicula, calificacion, comentario } = req.body ?? {};
    if (!pelicula || !Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ message: 'pelicula y calificacion (1-5) son obligatorias' });
    }
    const review = { id: reviews.length + 1, userId: req.user.sub, pelicula, calificacion, comentario: comentario ?? '' };
    reviews.push(review);
    res.status(201).json(review);
  });

  // --- En Docker el mismo servidor entrega el frontend compilado ---
  if (staticDir) {
    app.use(express.static(staticDir));
    app.get(/^\/(?!api).*/, (_req, res) => res.sendFile('index.html', { root: staticDir }));
  }

  return app;
}
