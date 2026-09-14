import { Router, Request, Response } from 'express';
import { createCheckoutPreference, getPaymentByExternalReference } from '../services/mercadopago.js';
import { store } from '../services/store.js';
import { confirmPayment } from '../services/lia.js';

const router = Router();

// Create checkout preference
router.post('/preference', async (req: Request, res: Response) => {
  try {
    const { items, payer, external_reference, back_urls } = req.body;
    
    const preference = await createCheckoutPreference({
      items,
      payer,
      back_urls,
      auto_return: 'approved',
      external_reference,
      notification_url: `${process.env.CLIENT_URL?.replace('43127', '43128')}/api/mercadopago/webhook`,
    });
    
    res.json(preference);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create preference' });
  }
});

// Get payment by external reference
router.get('/payment/:externalReference', async (req: Request, res: Response) => {
  try {
    const payment = await getPaymentByExternalReference(req.params.externalReference);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get payment' });
  }
});

// Webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const paymentId = data.id;
      // Get payment details
      // In real app, verify signature and process
      
      // For now, find order by external_reference
      // This would need the payment object
    }
    
    res.json({ received: true });
  } catch (error) {
    res.status(500).json({ error: 'Webhook error' });
  }
});

// Manual payment confirmation (fallback)
router.post('/confirm/:orderId', async (req: Request, res: Response) => {
  try {
    const success = await confirmPayment(req.params.orderId);
    if (!success) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

export default router;