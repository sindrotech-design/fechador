import { Router, Request, Response } from 'express';
import { store } from '../services/store.js';
import { syncStockToSheets } from '../services/sheets.js';

const router = Router();

// Get all products
router.get('/', async (_req: Request, res: Response) => {
  const products = store.getAllProducts();
  res.json(products);
});

// Get products by category
router.get('/category/:category', async (req: Request, res: Response) => {
  const category = req.params.category as 'site' | 'internal';
  const products = store.getProductsByCategory(category);
  res.json(products);
});

// Get product by ID
router.get('/:id', async (req: Request, res: Response) => {
  const product = store.getProduct(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// Update product stock
router.patch('/:id/stock', async (req: Request, res: Response) => {
  const { quantity, operation } = req.body; // operation: 'subtract' | 'add'
  const product = store.getProduct(req.params.id);
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  let success = false;
  if (operation === 'add') {
    success = store.restoreProductStock(req.params.id, quantity);
  } else {
    success = store.updateProductStock(req.params.id, quantity);
  }
  
  if (!success) {
    return res.status(400).json({ error: 'Invalid operation or insufficient stock' });
  }
  
  const updated = store.getProduct(req.params.id)!;
  
  // Sync to sheets
  await syncStockToSheets(store.getAllProducts());
  
  res.json(updated);
});

// Update product
router.patch('/:id', async (req: Request, res: Response) => {
  // In a real app, update the store
  // For now, just return the product
  const product = store.getProduct(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// Sync all stock to sheets
router.post('/sync-stock', async (_req: Request, res: Response) => {
  const success = await syncStockToSheets(store.getAllProducts());
  res.json({ success });
});

export default router;