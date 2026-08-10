import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

import authRoutes from './routes/auth.routes';
import resumeRoutes from './routes/resume.routes';
import jobRoutes from './routes/job.routes';
import roadmapRoutes from './routes/roadmap.routes';
import interviewRoutes from './routes/interview.routes';
import analyticsRoutes from './routes/analytics.routes';
import applicationsRoutes from './routes/applications.routes';
import gamificationRoutes from './routes/gamification.routes';
import exportRoutes from './routes/export.routes';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/interview', interviewRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/export', exportRoutes);

// Basic health-check route
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'CareerAI API is running!',
    timestamp: new Date().toISOString()
  });
});

export default app;