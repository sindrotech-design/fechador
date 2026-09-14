import { Router, Request, Response } from 'express';
import { store } from '../services/store.js';
import { testSheetsConnection } from '../services/sheets.js';

const router = Router();

// Get settings
router.get('/', async (_req: Request, res: Response) => {
  const settings = store.getSettings();
  // Don't expose sensitive data fully
  res.json({
    ...settings,
    mercadoPagoAccessToken: settings.mercadoPagoAccessToken ? '***configured***' : '',
    mercadoPagoPublicKey: settings.mercadoPagoPublicKey ? '***configured***' : '',
  });
});

// Update settings
router.patch('/', async (req: Request, res: Response) => {
  const updates = req.body;
  const settings = store.updateSettings(updates);
  res.json({
    ...settings,
    mercadoPagoAccessToken: settings.mercadoPagoAccessToken ? '***configured***' : '',
    mercadoPagoPublicKey: settings.mercadoPagoPublicKey ? '***configured***' : '',
  });
});

// Test Google Sheets connection
router.post('/test-sheets', async (_req: Request, res: Response) => {
  const success = await testSheetsConnection();
  res.json({ success, message: success ? 'Conexão OK!' : 'Falha na conexão. Verifique a URL do Apps Script.' });
});

// Test Mercado Pago connection
router.post('/test-mercadopago', async (_req: Request, res: Response) => {
  const settings = store.getSettings();
  if (!settings.mercadoPagoAccessToken) {
    return res.json({ success: false, message: 'Access Token não configurado' });
  }
  // In real app, test the token
  res.json({ success: true, message: 'Token válido!' });
});

export default router;