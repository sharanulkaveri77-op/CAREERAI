import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import InterviewSession, { IMessage } from '../models/InterviewSession';
import User from '../models/User';
import { evaluateInterviewAnswerWithGroq, getInitialInterviewQuestion } from '../services/ai.service';
import { awardXp } from '../services/gamification.service';

export const startSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const user = await User.findById(req.user.id);
    const targetRole = user?.targetJobRole || 'Software Engineer';

    const firstQuestion = await getInitialInterviewQuestion(targetRole);

    const session = await InterviewSession.create({
      user: req.user.id,
      targetRole,
      status: 'IN_PROGRESS',
      messages: [
        {
          role: 'system',
          content: firstQuestion,
          timestamp: new Date()
        }
      ]
    });

    res.status(201).json({ session });
  } catch (error) {
    console.error('Start interview session error:', error);
    res.status(500).json({ message: 'Failed to start interview session', error: (error as Error).message });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { sessionId } = req.params;

    if (!sessionId) {
      res.status(400).json({ message: 'Session ID is required' });
      return;
    }

    const { answer } = req.body;

    const session = await InterviewSession.findOne({ _id: sessionId, user: req.user.id });
    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    if (session.status === 'COMPLETED') {
      res.status(400).json({ message: 'Session is already completed' });
      return;
    }

    const userMessage: any = { role: 'user', content: answer, timestamp: new Date() };
    session.messages.push(userMessage);

    const chatHistory = session.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    const result = await evaluateInterviewAnswerWithGroq(session.targetRole, chatHistory, answer);

    const aiMessage: any = {
      role: 'system',
      content: result.nextQuestion,
      feedback: result.evaluation,
      timestamp: new Date()
    };
    session.messages.push(aiMessage);

    if (result.isOver) {
      session.status = 'COMPLETED';
      void awardXp(req.user.id, 'INTERVIEW_COMPLETED').catch(() => {});
      
      const scores = session.messages
        .filter(m => m.feedback?.score)
        .map(m => m.feedback!.score);
      
      if (scores.length > 0) {
        session.averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      }
    }

    await session.save();

    res.status(200).json({ session });
  } catch (error) {
    console.error('Send interview message error:', error);
    res.status(500).json({ message: 'Failed to process message', error: (error as Error).message });
  }
};

export const getSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const sessions = await InterviewSession.find({ user: req.user.id })
      .select('-messages') 
      .sort({ createdAt: -1 });

    res.status(200).json({ sessions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch sessions', error: (error as Error).message });
  }
};

export const getSession = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const session = await InterviewSession.findOne({ _id: String(req.params.sessionId), user: req.user.id });

    if (!session) {
      res.status(404).json({ message: 'Session not found' });
      return;
    }

    res.status(200).json({ session });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch session', error: (error as Error).message });
  }
};
