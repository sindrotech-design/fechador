import { Router, Request, Response } from 'express';
import { whatsappService } from '../services/whatsapp.js';
import { store } from '../services/store.js';
import { handleIncomingMessage, confirmPayment, updateDeliveryStatus } from '../services/lia.js';
import fs from 'fs';
import path from 'path';

const router = Router();

// Get QR code for WhatsApp connection
router.get('/qr', async (_req: Request, res: Response) => {
  try {
    // QR is emitted via socket.io, return current status
    res.json({ 
      connected: whatsappService.isConnected(),
      message: whatsappService.isConnected() ? 'Connected' : 'Waiting for QR...'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get QR status' });
  }
});

// Force reconnect
router.post('/reconnect', async (_req: Request, res: Response) => {
  try {
    await whatsappService.logout();
    await whatsappService.initialize();
    res.json({ success: true, message: 'Reconnecting...' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reconnect' });
  }
});

// Get connection status
router.get('/status', async (_req: Request, res: Response) => {
  res.json({ connected: whatsappService.isConnected() });
});

// Send test message (admin only)
router.post('/send', async (req: Request, res: Response) => {
  try {
    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: 'Missing to or message' });
    }
    const success = await whatsappService.sendText(to, message);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Webhook for incoming messages (from Baileys)
router.post('/inbound', async (req: Request, res: Response) => {
  try {
    const message = req.body;
    // Process asynchronously
    handleIncomingMessage(message).catch(console.error);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Get all chats
router.get('/chats', async (_req: Request, res: Response) => {
  const chats = store.getAllChats();
  res.json(chats);
});

// Get specific chat
router.get('/chats/:chatId', async (req: Request, res: Response) => {
  const chat = store.getChat(req.params.chatId);
  if (!chat) {
    return res.status(404).json({ error: 'Chat not found' });
  }
  res.json(chat);
});

// Mark chat as read
router.post('/chats/:chatId/read', async (req: Request, res: Response) => {
  const chat = store.markChatAsRead(req.params.chatId);
  if (!chat) {
    return res.status(404).json({ error: 'Chat not found' });
  }
  res.json(chat);
});

// Send message from panel
router.post('/chats/:chatId/send', async (req: Request, res: Response) => {
  try {
    const { message, type = 'text' } = req.body;
    const chat = store.getChat(req.params.chatId);
    if (!chat) {
      return res.status(404).json({ error: 'Chat not found' });
    }
    
    const success = await whatsappService.sendText(req.params.chatId, message);
    
    if (success) {
      // Add to local chat history
      const newMsg = {
        id: `local-${Date.now()}`,
        chatId: req.params.chatId,
        fromMe: true,
        body: message,
        timestamp: new Date(),
        type: type as any,
      };
      store.addMessage(req.params.chatId, newMsg);
    }
    
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Admin: Confirm payment
router.post('/admin/confirm-payment/:orderId', async (req: Request, res: Response) => {
  try {
    const success = await confirmPayment(req.params.orderId);
    if (success) {
      // Emit socket event for real-time update
      const io = req.app.get('io');
      io?.emit('order:updated', { orderId: req.params.orderId, paymentStatus: 'paid' });
    }
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Admin: Update delivery status
router.post('/admin/delivery/:deliveryId/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const success = await updateDeliveryStatus(req.params.deliveryId, status);
    if (success) {
      const io = req.app.get('io');
      io?.emit('delivery:updated', { deliveryId: req.params.deliveryId, status });
    }
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update delivery' });
  }
});

// Clear WhatsApp session (for reconnecting)
router.delete('/session', async (_req: Request, res: Response) => {
  try {
    const sessionPath = path.resolve(process.env.WHATSAPP_SESSION_PATH || './session/lia');
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    await whatsappService.logout();
    await whatsappService.initialize();
    res.json({ success: true, message: 'Session cleared, reconnecting...' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear session' });
  }
});

// Get QR code as image (PNG)
router.get('/qr-image', async (_req: Request, res: Response) => {
  try {
    const qrBase64 = await whatsappService.getQrImageBase64();
    if (!qrBase64) {
      return res.status(404).json({ error: 'No QR code available. Wait for QR to be generated.' });
    }
    
    // Convert base64 to buffer
    const base64Data = qrBase64.replace(/^data:image\/png;base64,/, '');
    const imgBuffer = Buffer.from(base64Data, 'base64');
    
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(imgBuffer);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate QR image' });
  }
});

// Get QR code as raw string
router.get('/qr-string', async (_req: Request, res: Response) => {
  try {
    const qr = whatsappService.getCurrentQr();
    if (!qr) {
      return res.status(404).json({ error: 'No QR code available' });
    }
    res.json({ qr });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get QR code' });
  }
});

export default router;