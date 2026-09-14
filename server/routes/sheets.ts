import { Router, Request, Response } from 'express';
import { getSheetData } from '../services/sheets.js';

const router = Router();

// Get sheet data
router.get('/:sheetName', async (req: Request, res: Response) => {
  try {
    const data = await getSheetData(req.params.sheetName);
    res.json({ sheet: req.params.sheetName, data });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get sheet data' });
  }
});

// Get all sheet names (metadata)
router.get('/', async (_req: Request, res: Response) => {
  // Return known sheet names
  res.json({
    sheets: ['Estoque', 'Vendas', 'Entregas', 'Caixa', 'Contas a pagar', 'Fornecedores'],
  });
});

export default router;