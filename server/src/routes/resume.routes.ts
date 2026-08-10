import { Router } from 'express';
import { analyzeResume } from '../controllers/resume.controller';
import { runAtsCheck } from '../controllers/ats.controller';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.post('/analyze', protect, upload.single('resume'), analyzeResume);
router.post('/ats', protect, runAtsCheck);

export default router;
