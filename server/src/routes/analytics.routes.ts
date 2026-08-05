import { Router } from 'express';
import { getDashboardAnalytics } from '../controllers/analytics.controller';
import { protect } from '../middlewares/auth';

const router = Router();

router.get('/dashboard', protect, getDashboardAnalytics);

export default router;
