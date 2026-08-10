import { Router } from 'express';
import { protect } from '../middlewares/auth';
import { exportResumeReport, exportRoadmap } from '../controllers/export.controller';

const router = Router();

router.get('/resume-report', protect, exportResumeReport);
router.get('/roadmap', protect, exportRoadmap);

export default router;