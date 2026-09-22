import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import fs from 'fs';

import whatsappRoutes from './routes/whatsapp.js';
import { whatsappService } from './services/whatsapp.js';
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

async function ensureChromeInstalled(): Promise<string> {
  const chromePath = '/tmp/puppeteer/chrome/linux-146.0.7680.31/chrome-linux64/chrome';

  if (fs.existsSync(chromePath)) {
    fs.chmodSync(chromePath, '755');
    return chromePath;
  }

  console.log('📦 Installing Chrome...');
  try {
    execSync(
      'npx @puppeteer/browsers install chrome@146.0.7680.31 --path=/tmp/puppeteer',
      { stdio: 'inherit', timeout: 180000 }
    );
    console.log('✅ Chrome installed successfully');
  } catch (error) {
    console.error('❌ Failed to install Chrome:', error);
    throw error;
  }

  if (!fs.existsSync(chromePath)) {
    throw new Error('Chrome binary not found after installation');
  }

  fs.chmodSync(chromePath, '755');
  console.log('✅ Chrome ready at:', chromePath);
  return chromePath;
}

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

app.set('io', io);
app.set('logger', logger);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/deliveries', deliveriesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/mercadopago', mercadoPagoRoutes);

if (process.env.NODE_ENV === 'production') {
  const clientPath = path.join(__dirname, '../../dist/client');
  app.use(express.static(clientPath));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
  });
}

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected');

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected');
  });
});

whatsappService.on('connected', () => {
  logger.info('WhatsApp CONNECTED - Broadcasting to clients');
  io.emit('whatsapp:connected');
});

whatsappService.on('disconnected', (reason: string) => {
  logger.warn({ reason }, 'WhatsApp DISCONNECTED - Broadcasting to clients');
  io.emit('whatsapp:disconnected', reason);
});

whatsappService.on('qr', (qr: string) => {
  logger.info('WhatsApp QR generated - Broadcasting to clients');
  io.emit('whatsapp:qr', qr);
});

async function startServer() {
  try {
    console.log('🔧 Ensuring Chrome is installed...');
    const chromePath = await ensureChromeInstalled();
    process.env.PUPPETEER_EXECUTABLE_PATH = chromePath;
    process.env.PUPPETEER_CACHE_DIR = '/tmp/puppeteer';

    const PORT = parseInt(process.env.PORT || '43128', 10);

    httpServer.listen({ port: PORT, host: '0.0.0.0', ipv6Only: false }, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info('WebSocket server ready');
      logger.info(`Server address: ${JSON.stringify(httpServer.address())}`);
    });

    setImmediate(() => {
      whatsappService.initialize().catch((err) => {
        logger.error({ err }, 'Failed to initialize WhatsApp');
      });
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

httpServer.on('error', (err) => {
  logger.error({ err }, 'Server error');
});

export { app, io, logger };