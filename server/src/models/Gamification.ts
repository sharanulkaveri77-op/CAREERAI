import { Schema, model, Types } from 'mongoose';

export type GamificationEvent =
  | 'RESUME_ANALYZED'
  | 'ATS_CHECKED'
  | 'ROADMAP_GENERATED'
  | 'APPLICATION_ADDED'
  | 'STAGE_ADVANCED'
  | 'INTERVIEW_COMPLETED';

export interface IGamification {
  user: Types.ObjectId;
  xp: number;
  streakCount: number;
  lastActivityDate: string | null; // YYYY-MM-DD (UTC)
  counts: {
    resumeAnalyzed: number;
    atsChecks: number;
    roadmaps: number;
    applications: number;
    stageAdvances: number;
    interviews: number;
  };
  badges: string[];
  recentEvents: { reason: GamificationEvent; xp: number; at: Date }[];
}

const gamificationSchema = new Schema<IGamification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    xp: { type: Number, default: 0 },
    streakCount: { type: Number, default: 0 },
    lastActivityDate: { type: String, default: null },
    counts: {
      resumeAnalyzed: { type: Number, default: 0 },
      atsChecks: { type: Number, default: 0 },
      roadmaps: { type: Number, default: 0 },
      applications: { type: Number, default: 0 },
      stageAdvances: { type: Number, default: 0 },
      interviews: { type: Number, default: 0 },
    },
    badges: { type: [String], default: [] },
    recentEvents: {
      type: [{ reason: String, xp: Number, at: Date }],
      default: [],
      maxlength: 15,
    },
  },
  { timestamps: true }
);

export default model<IGamification>('Gamification', gamificationSchema);