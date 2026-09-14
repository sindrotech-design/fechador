import { Router, Request, Response } from 'express';
import { store } from '../services/store.js';
import { updateDeliveryStatus } from '../services/lia.js';

const router = Router();

// Get all deliveries
router.get('/', async (_req: Request, res: Response) => {
  const deliveries = store.getAllDeliveries();
  res.json(deliveries);
});

// Get delivery by ID
router.get('/:id', async (req: Request, res: Response) => {
  const delivery = store.getDelivery(req.params.id);
  if (!delivery) {
    return res.status(404).json({ error: 'Delivery not found' });
  }
  res.json(delivery);
});

// Update delivery status
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'ready', 'out_for_delivery', 'delivered'];
  
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const success = await updateDeliveryStatus(req.params.id, status);
  if (!success) {
    return res.status(404).json({ error: 'Delivery not found' });
  }
  
  const delivery = store.getDelivery(req.params.id);
  res.json(delivery);
});

// Get deliveries by status
router.get('/status/:status', async (req: Request, res: Response) => {
  const deliveries = store.getAllDeliveries().filter(d => d.status === req.params.status);
  res.json(deliveries);
});

export default router;