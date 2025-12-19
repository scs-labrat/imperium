import { Router } from 'express';
import { getMcpConfig, saveMcpConfig } from '../controllers/mcpController.js';

const router = Router();

router.get('/config', getMcpConfig);
router.post('/config', saveMcpConfig);

export default router;
