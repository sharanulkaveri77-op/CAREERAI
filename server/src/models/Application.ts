import mongoose, { Document, Schema } from 'mongoose';

/**
 * Application Tracker (Kanban) model — Phase C.
 * Each document = one job the user is tracking, with a status column
 * (SAVED/APPLIED/INTERVIEWING/OFFER/REJECTED) and an ordering position that
 * makes the board deterministic and restorable after drag-and-drop.
 */

export const APPLICATION_STATUSES = ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED'] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface IApplication extends Document {
  user: mongoose.Types.ObjectId;
  /** Reference to a seeded Job when the entry was added from the match engine */
  job?: mongoose.Types.ObjectId;
  title: string;
  company: string;
  jobUrl: string;
  /** 0–100; set from the cosine-similarity match, or 0 for manual entries */
  matchScore: number;
  status: ApplicationStatus;
  /** Ordering index within its status column */
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<IApplication>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    job: { type: Schema.Types.ObjectId, ref: 'Job' },
    title: { type: String, required: true },
    company: { type: String, required: true },
    jobUrl: { type: String, default: '' },
    matchScore: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'SAVED', required: true },
    position: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Covers the standard board query: all applications for a user, per column, in order
applicationSchema.index({ user: 1, status: 1, position: 1 });

const Application = mongoose.model<IApplication>('Application', applicationSchema);

export default Application;