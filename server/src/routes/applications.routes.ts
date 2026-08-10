import { Router } from 'express';
import {
  createApplication,
  deleteApplication,
  getApplications,
  updateApplication,
} from '../controllers/application.controller';
import { protect } from '../middlewares/auth';

const router = Router();

router.get('/', protect, getApplications);
router.post('/', protect, createApplication);
router.patch('/:applicationId', protect, updateApplication);
router.delete('/:applicationId', protect, deleteApplication);

export default router;