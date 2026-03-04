
import { Router } from 'express';
import c2Router from './c2.js';
import aiRouter from './ai.js';
import mcpRouter from './mcp.js';
import isoRouter from './iso.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/c2', c2Router);
router.use('/ai', aiRouter);
router.use('/mcp', mcpRouter);
router.use('/iso', isoRouter);

export default router;
