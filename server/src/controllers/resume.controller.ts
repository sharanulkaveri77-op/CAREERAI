import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import { parseResumeBuffer } from '../services/parser.service';
import { analyzeResumeWithGroq } from '../services/ai.service';
import ResumeAnalysis from '../models/ResumeAnalysis';
import User from '../models/User';

export const analyzeResume = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file || !req.user?.id) {
      res.status(400).json({ message: 'No file uploaded or user not authenticated' });
      return;
    }

    // 1. Extract raw text based on mimetype
    const resumeText = await parseResumeBuffer(req.file.buffer, req.file.mimetype);

    if (!resumeText || resumeText.trim().length === 0) {
      res.status(400).json({ message: 'Could not extract text from the document' });
      return;
    }

    // 2. Call Groq API with structured prompt
    const aiAnalysis = await analyzeResumeWithGroq(resumeText);

    // 3. Store results in the DB tied to the user
    const savedAnalysis = await ResumeAnalysis.create({
      user: req.user.id,
      overallScore: aiAnalysis.overallScore,
      detectedSkills: aiAnalysis.detectedSkills,
      sectionFeedback: aiAnalysis.sectionFeedback,
      bulletRewrites: aiAnalysis.bulletRewrites,
    });

    // 4. Update the user's currentSkills as an added bonus
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { currentSkills: { $each: aiAnalysis.detectedSkills } },
    });

    // 5. Return the report to the frontend
    res.status(200).json({
      message: 'Resume analyzed successfully',
      analysis: savedAnalysis,
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ message: 'Failed to process resume', error: (error as Error).message });
  }
};
