import { Router } from 'express';
import { registerUser, loginUser, getMe } from '../controllers/auth.controller';
import { protect } from '../middlewares/auth';

const router = Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);

export default router;
