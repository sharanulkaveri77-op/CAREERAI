import { Router } from 'express';
import { startSession, sendMessage, getSessions, getSession } from '../controllers/interview.controller';
import { protect } from '../middlewares/auth';

const router = Router();

router.post('/start', protect, startSession);
router.get('/history', protect, getSessions);
router.get('/:sessionId', protect, getSession);
router.post('/:sessionId/message', protect, sendMessage);

export default router;
