import mongoose, { Document, Schema } from 'mongoose';

export interface IFeedback {
  strengths: string;
  improvements: string;
  modelAnswer: string;
  score: number; // 0-100 score for this specific answer
}

export interface IMessage {
  _id?: mongoose.Types.ObjectId;
  role: 'system' | 'user';
  content: string;
  feedback?: IFeedback;
  timestamp: Date;
}

export interface IInterviewSession extends Document {
  user: mongoose.Types.ObjectId;
  targetRole: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  messages: IMessage[];
  averageScore?: number; // Aggregated at the end
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>({
  strengths: { type: String, required: true },
  improvements: { type: String, required: true },
  modelAnswer: { type: String, required: true },
  score: { type: Number, required: true },
});

const messageSchema = new Schema<IMessage>({
  role: { type: String, enum: ['system', 'user'], required: true },
  content: { type: String, required: true },
  feedback: { type: feedbackSchema, required: false },
  timestamp: { type: Date, default: Date.now }
});

const interviewSessionSchema = new Schema<IInterviewSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetRole: { type: String, required: true },
    status: { type: String, enum: ['IN_PROGRESS', 'COMPLETED'], default: 'IN_PROGRESS' },
    messages: [messageSchema],
    averageScore: { type: Number }
  },
  { timestamps: true }
);

const InterviewSession = mongoose.model<IInterviewSession>('InterviewSession', interviewSessionSchema);

export default InterviewSession;
