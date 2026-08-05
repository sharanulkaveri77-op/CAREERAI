import { Router } from 'express';
import { analyzeResume } from '../controllers/resume.controller';
import { protect } from '../middlewares/auth';
import { upload } from '../middlewares/upload';

const router = Router();

router.post('/analyze', protect, upload.single('resume'), analyzeResume);

export default router;
