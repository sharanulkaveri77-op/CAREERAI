import { Router } from 'express';
import { protect } from '../middlewares/auth';
import { getGamification } from '../controllers/gamification.controller';

const router = Router();

router.get('/', protect, getGamification);

export default router;