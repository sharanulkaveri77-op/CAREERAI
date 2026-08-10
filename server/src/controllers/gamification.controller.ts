import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { getGamificationSnapshot } from '../services/gamification.service';

export const getGamification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const snapshot = await getGamificationSnapshot(req.user.id);
    res.status(200).json({ gamification: snapshot });
  } catch (error) {
    console.error('Fetch gamification error:', error);
    res.status(500).json({ message: 'Failed to fetch gamification', error: (error as Error).message });
  }
};