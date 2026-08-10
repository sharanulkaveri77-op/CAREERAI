import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import ResumeAnalysis from '../models/ResumeAnalysis';
import { buildAtsReport, extractKeywordsRuleBased } from '../services/ats.service';
import { extractKeywordsWithGroq } from '../services/ai.service';
import { awardXp } from '../services/gamification.service';

/**
 * POST /api/resume/ats
 * Runs the ATS Compatibility Checker against the user's most recent analysis.
 * The ONLY AI step is keyword extraction from the optional job description
 * (fast model); every structural check is deterministic rule-based logic.
 */
export const runAtsCheck = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const jobDescription =
      typeof req.body?.jobDescription === 'string' ? req.body.jobDescription.trim().slice(0, 10000) : '';

    const analysis = await ResumeAnalysis.findOne({ user: req.user.id }).sort({ createdAt: -1 });
    if (!analysis) {
      res.status(404).json({ message: 'No resume analysis found. Upload and analyze a resume first.' });
      return;
    }
    if (!analysis.resumeText || analysis.resumeText.trim().length === 0) {
      res.status(400).json({
        message: 'This analysis was created before resume text was stored. Please re-upload your resume.',
      });
      return;
    }

    // Keyword extraction is the only AI-involved step; rule-based fallback
    // keeps the whole module fully offline when no GROQ_API_KEY is present.
    const targetKeywords = jobDescription
      ? (await extractKeywordsWithGroq(jobDescription)) ?? extractKeywordsRuleBased(jobDescription)
      : [];

    const report = buildAtsReport(analysis.resumeText, targetKeywords);

    void awardXp(req.user.id, 'ATS_CHECKED', { atsScore: report.score }).catch(() => {});

    res.status(200).json({ report });
  } catch (error) {
    console.error('ATS check error:', error);
    res.status(500).json({ message: 'Failed to run ATS check', error: (error as Error).message });
  }
};