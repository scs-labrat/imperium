
import { Router } from 'express';
import aiRouter from './ai.js';
import mcpRouter from './mcp.js';
import isoRouter from './iso.js';
import siemRouter from './siem.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

router.use('/ai', aiRouter);
router.use('/mcp', mcpRouter);
router.use('/iso', isoRouter);
router.use('/siem', siemRouter);

export default router;
