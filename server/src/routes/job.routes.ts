import { Router } from 'express';
import { seedJobs, getMatchedJobs } from '../controllers/job.controller';
import { protect } from '../middlewares/auth';

const router = Router();

router.post('/seed', protect, seedJobs);
router.get('/match', protect, getMatchedJobs);

export default router;
