import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

import whatsappRoutes from './routes/whatsapp.js';
import ordersRoutes from './routes/orders.js';
import productsRoutes from './routes/products.js';
import deliveriesRoutes from './routes/deliveries.js';
import eventsRoutes from './routes/events.js';
import communityRoutes from './routes/community.js';
import settingsRoutes from './routes/settings.js';
import sheetsRoutes from './routes/sheets.js';
import mercadoPagoRoutes from './routes/mercadopago.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:43127',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:43127' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Make io available to routes
app.set('io', io);
app.set('logger', logger);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/deliveries', deliveriesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/mercadopago', mercadoPagoRoutes);

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../dist/client');
  app.use(express.static(clientPath));
  
  // SPA fallback - serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Socket.io connection
io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected');
  
  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
  });
});

const PORT = parseInt(process.env.PORT || '43128', 10);

httpServer.listen({ port: PORT, host: '0.0.0.0', ipv6Only: false }, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`WebSocket server ready`);
  logger.info(`Server address: ${JSON.stringify(httpServer.address())}`);
});

httpServer.on('error', (err) => {
  logger.error({ err }, 'Server error');
});

export { app, io, logger };