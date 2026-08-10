import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import ResumeAnalysis from '../models/ResumeAnalysis';
import Roadmap from '../models/Roadmap';
import InterviewSession from '../models/InterviewSession';

export const getDashboardAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const userId = req.user.id;

    // 1. Fetch real data
    const resumeAnalyses = await ResumeAnalysis.find({ user: userId }).sort({ createdAt: 1 });
    const roadmaps = await Roadmap.find({ user: userId });
    const interviewSessions = await InterviewSession.find({ user: userId, status: 'COMPLETED' }).sort({ createdAt: 1 });

    // 2. Format Resume Score Trend & Skill Growth
    let resumeTrend: any[] = [];
    
    // Inject Mock Demo Data if there isn't enough historical data
    if (resumeAnalyses.length < 4) {
      const today = new Date();
      resumeTrend = [
        { date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString(), score: 45, skillsCount: 4 },
        { date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toLocaleDateString(), score: 58, skillsCount: 6 },
        { date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toLocaleDateString(), score: 72, skillsCount: 11 },
      ];
    }

    // Append real data
    resumeAnalyses.forEach(analysis => {
      resumeTrend.push({
        date: new Date(analysis.createdAt).toLocaleDateString(),
        score: analysis.overallScore,
        skillsCount: analysis.detectedSkills.length
      });
    });

    // 3. Format Interview Performance Trend
    let interviewTrend: any[] = [];
    if (interviewSessions.length < 3) {
      const today = new Date();
      interviewTrend = [
        { session: 'Session 1', score: 40 },
        { session: 'Session 2', score: 65 },
        { session: 'Session 3', score: 75 },
      ];
    }

    interviewSessions.forEach((session, idx) => {
      if (session.averageScore) {
        interviewTrend.push({
          session: `Real ${idx + 1}`,
          score: session.averageScore
        });
      }
    });

    // 4. Format Roadmap Completion
    let roadmapCompletion = 0;
    if (roadmaps.length > 0) {
      // Find the most recent roadmap
      const latestRoadmap = roadmaps[roadmaps.length - 1];

      if (latestRoadmap) {
        let totalTasks = 0;
        let completedTasks = 0;

        latestRoadmap.months.forEach(month => {
          month.tasks.forEach(task => {
            totalTasks++;
            if (task.isCompleted) completedTasks++;
          });
        });

        roadmapCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      }
    } else {
      roadmapCompletion = 35; // Mock progress for empty state
    }

    const data = {
      resumeTrend,
      interviewTrend,
      roadmapCompletion
    };

    res.status(200).json({ data });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ message: 'Failed to fetch analytics', error: (error as Error).message });
  }
};
