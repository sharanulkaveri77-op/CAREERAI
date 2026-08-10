import mongoose, { Document, Schema } from 'mongoose';

export interface IResumeAnalysis extends Document {
  user: mongoose.Types.ObjectId;
  overallScore: number;
  detectedSkills: string[];
  sectionFeedback: Array<{
    section: string;
    feedback: string;
  }>;
  bulletRewrites: Array<{
    original: string;
    suggestion: string;
    reason: string;
  }>;
  /** Raw extracted resume text — stored so ATS/skills modules can re-analyze without re-uploading */
  resumeText: string;
  createdAt: Date;
}

const resumeAnalysisSchema = new Schema<IResumeAnalysis>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    overallScore: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    detectedSkills: [{ type: String }],
    sectionFeedback: [
      {
        section: { type: String, required: true },
        feedback: { type: String, required: true },
      },
    ],
    bulletRewrites: [
      {
        original: { type: String, required: true },
        suggestion: { type: String, required: true },
        reason: { type: String, required: true },
      },
    ],
    resumeText: { type: String, default: '' },
  },
  { timestamps: true }
);

const ResumeAnalysis = mongoose.model<IResumeAnalysis>('ResumeAnalysis', resumeAnalysisSchema);

export default ResumeAnalysis;
