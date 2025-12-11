
import { Router } from 'express';
import c2Router from './c2.js';
import aiRouter from './ai.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/c2', c2Router);
router.use('/ai', aiRouter);

export default router;
