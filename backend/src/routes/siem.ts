import { Router } from 'express';
import { getSiemConfig, saveSiemConfig, testSiemConnection, querySiem, submitDslQuery, getSiemRules, toggleSiemRule } from '../controllers/siemController.js';

const router = Router();

router.get('/config', getSiemConfig);
router.post('/config', saveSiemConfig);
router.post('/test', testSiemConnection);
router.post('/query', querySiem);
router.post('/submit-dsl', submitDslQuery);
router.get('/rules', getSiemRules);
router.post('/rules/:id/toggle', toggleSiemRule);

export default router;
