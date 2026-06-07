import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth';
import barbersRoutes from './routes/barbers';
import movementsRoutes from './routes/movements';
import valesRoutes from './routes/vales';
import closingRoutes from './routes/closing';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3333;

// ─── Cabeçalhos de Segurança (Helmet) ───────────────────────────────────
app.use(helmet());

// ─── Parsing de Cookies ────────────────────────────────────────────────
app.use(cookieParser());

// ─── Limitadores de Requisição (Rate Limiting) ──────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // Limite de 300 requisições por IP
  message: { error: 'Limite de requisições excedido. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 15, // Limite estrito de 15 tentativas de login por IP
  message: { error: 'Muitas tentativas de login detectadas. IP bloqueado temporariamente por 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Aplicar limitador global a todas as rotas
app.use(globalLimiter);

// ─── Configuração de CORS Estrito ───────────────────────────────────────
const allowedOrigins = [
  process.env.CORS_ORIGIN, // Domínio de produção (ex: Netlify)
  'http://localhost:5173',  // Ambiente local do Vite
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origem (como ferramentas de teste em dev, ou se estiver na lista)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acesso negado por políticas de CORS da LK Barbearia.'));
    }
  },
  credentials: true, // Permitir envio de cookies de sessão
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'LK Barbearia API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Rotas da API ────────────────────────────────────────────────────
// Aplicar limitador estrito específico para a rota de login/autenticação
app.use('/auth', authLimiter, authRoutes);
app.use('/barbers', barbersRoutes);
app.use('/movements', movementsRoutes);
app.use('/vales', valesRoutes);
app.use('/closing', closingRoutes);

// ─── Error Handler ───────────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   🏆  LK BARBEARIA — API Server              ║
║   📡  Rodando em: http://localhost:${PORT}      ║
║   🔗  Stitch MCP: Sincronizado                ║
║                                               ║
║   Rotas disponíveis:                          ║
║   ├── GET  /health                            ║
║   ├── POST /auth/login                        ║
║   ├── GET  /auth/barbers                      ║
║   ├── GET  /barbers                           ║
║   ├── POST /barbers                           ║
║   ├── PUT  /barbers/:id                       ║
║   ├── DEL  /barbers/:id                       ║
║   ├── GET  /movements                         ║
║   ├── POST /movements                         ║
║   ├── GET  /vales                             ║
║   ├── POST /vales                             ║
║   ├── PATCH /vales/:id/status                 ║
║   ├── GET  /closing                           ║
║   └── GET  /closing/barbeiro/:id              ║
║                                               ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
