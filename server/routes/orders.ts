import { Router, Request, Response } from 'express';
import { store } from '../services/store.js';
import { syncOrderToSheets } from '../services/sheets.js';

const router = Router();

// Get all orders
router.get('/', async (_req: Request, res: Response) => {
  const orders = store.getAllOrders();
  res.json(orders);
});

// Get order by ID
router.get('/:id', async (req: Request, res: Response) => {
  const order = store.getOrder(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// Create order (from panel)
router.post('/', async (req: Request, res: Response) => {
  try {
    const orderData = req.body;
    const orderId = store.generateOrderId();
    
    const items = orderData.items.map((ci: any) => ({
      product: store.getProduct(ci.productId)!,
      quantity: ci.quantity,
    }));
    
    const subtotal = items.reduce((sum: number, i: any) => sum + i.product.price * i.quantity, 0);
    const deliveryFee = orderData.deliveryType === 'delivery' ? store.getSettings().deliveryFee : 0;
    const total = subtotal + deliveryFee;
    
    const order = {
      id: orderId,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      items,
      subtotal,
      deliveryFee,
      total,
      paymentMethod: orderData.paymentMethod || 'mercadopago',
      paymentStatus: 'pending' as const,
      deliveryType: orderData.deliveryType,
      address: orderData.address,
      status: 'new',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    store.createOrder(order as any);
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order
router.patch('/:id', async (req: Request, res: Response) => {
  const order = store.updateOrder(req.params.id, req.body);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  // Sync to sheets if payment status changed
  if (req.body.paymentStatus === 'paid') {
    await syncOrderToSheets(order);
  }
  
  res.json(order);
});

// Confirm payment (admin)
router.post('/:id/confirm-payment', async (req: Request, res: Response) => {
  const order = store.updateOrder(req.params.id, { 
    paymentStatus: 'paid', 
    status: 'confirmed',
    confirmedAt: new Date(),
  });
  
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  
  await syncOrderToSheets(order);
  res.json(order);
});

export default router;