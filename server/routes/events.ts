import { Router, Request, Response } from 'express';
import { store } from '../services/store.js';

const router = Router();

// Get all events
router.get('/', async (_req: Request, res: Response) => {
  const events = store.getAllEvents();
  res.json(events);
});

// Get active events
router.get('/active', async (_req: Request, res: Response) => {
  const events = store.getActiveEvents();
  res.json(events);
});

// Get event by ID
router.get('/:id', async (req: Request, res: Response) => {
  const events = store.getAllEvents();
  const event = events.find(e => e.id === req.params.id);
  if (!event) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json(event);
});

// Create event (admin)
router.post('/', async (req: Request, res: Response) => {
  const event = {
    id: `evt-${Date.now()}`,
    ...req.body,
  };
  // In real app, save to store
  res.status(201).json(event);
});

// Update event
router.patch('/:id', async (req: Request, res: Response) => {
  // In real app, update store
  res.json({ id: req.params.id, ...req.body });
});

export default router;