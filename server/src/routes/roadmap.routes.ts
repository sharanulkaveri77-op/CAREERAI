import { Router } from 'express';
import { generateRoadmap, getRoadmap, toggleTaskStatus } from '../controllers/roadmap.controller';
import { protect } from '../middlewares/auth';

const router = Router();

router.post('/generate', protect, generateRoadmap);
router.get('/', protect, getRoadmap);
router.put('/task/:monthId/:taskId', protect, toggleTaskStatus);

export default router;
