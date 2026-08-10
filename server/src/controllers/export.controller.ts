import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import User, { IUser } from '../models/User';
import ResumeAnalysis from '../models/ResumeAnalysis';
import Roadmap from '../models/Roadmap';
import { buildResumeReportPdf, buildRoadmapPdf } from '../services/export.service';

const sendPdf = (res: Response, buffer: Buffer, filename: string): void => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

export const exportResumeReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const [user, analysis] = await Promise.all([
      User.findById(req.user.id),
      ResumeAnalysis.findOne({ user: req.user.id }).sort({ createdAt: -1 }),
    ]);

    if (!analysis) {
      res.status(404).json({ message: 'No resume analysis found. Analyze a resume first.' });
      return;
    }

    const pdf = await buildResumeReportPdf(user ?? ({} as IUser), analysis);
    sendPdf(res, pdf, 'careerai-resume-report.pdf');
  } catch (error) {
    console.error('Export resume report error:', error);
    res.status(500).json({ message: 'Failed to export resume report', error: (error as Error).message });
  }
};

export const exportRoadmap = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const [user, roadmap] = await Promise.all([
      User.findById(req.user.id),
      Roadmap.findOne({ user: req.user.id }),
    ]);

    if (!roadmap) {
      res.status(404).json({ message: 'No roadmap found. Generate a roadmap first.' });
      return;
    }

    const pdf = await buildRoadmapPdf(user ?? ({} as IUser), roadmap);
    sendPdf(res, pdf, 'careerai-roadmap.pdf');
  } catch (error) {
    console.error('Export roadmap error:', error);
    res.status(500).json({ message: 'Failed to export roadmap', error: (error as Error).message });
  }
};