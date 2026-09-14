import { Router, Request, Response } from 'express';
import { store } from '../services/store.js';

const router = Router();

// Get all affiliate links
router.get('/affiliates', async (_req: Request, res: Response) => {
  const links = store.getAllAffiliateLinks();
  res.json(links);
});

// Get affiliate link by platform and product
router.get('/affiliates/:platform/:productName', async (req: Request, res: Response) => {
  const platform = req.params.platform as 'mercadolivre' | 'aliexpress';
  const link = store.getAffiliateLink(platform, req.params.productName);
  if (!link) {
    return res.status(404).json({ error: 'Affiliate link not found' });
  }
  res.json(link);
});

// Add affiliate link (admin)
router.post('/affiliates', async (req: Request, res: Response) => {
  const link = {
    id: `aff-${Date.now()}`,
    ...req.body,
  };
  // In real app, save to store
  res.status(201).json(link);
});

// Update affiliate link
router.patch('/affiliates/:id', async (req: Request, res: Response) => {
  // In real app, update store
  res.json({ id: req.params.id, ...req.body });
});

// Delete affiliate link
router.delete('/affiliates/:id', async (req: Request, res: Response) => {
  // In real app, delete from store
  res.json({ success: true });
});

export default router;