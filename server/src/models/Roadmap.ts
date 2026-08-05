import mongoose, { Document, Schema } from 'mongoose';

export interface IRoadmapTask {
  _id?: mongoose.Types.ObjectId;
  description: string;
  isCompleted: boolean;
}

export interface IRoadmapMonth {
  _id?: mongoose.Types.ObjectId;
  monthNumber: number;
  focusArea: string;
  estimatedHours: number;
  topics: string[];
  resources: string[];
  projects: string[];
  tasks: IRoadmapTask[];
}

export interface IRoadmap extends Document {
  user: mongoose.Types.ObjectId;
  targetRole: string;
  overallProgress: number; // 0 to 100
  months: IRoadmapMonth[];
}

const taskSchema = new Schema<IRoadmapTask>({
  description: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
});

const monthSchema = new Schema<IRoadmapMonth>({
  monthNumber: { type: Number, required: true },
  focusArea: { type: String, required: true },
  estimatedHours: { type: Number, required: true },
  topics: [{ type: String }],
  resources: [{ type: String }],
  projects: [{ type: String }],
  tasks: [taskSchema],
});

const roadmapSchema = new Schema<IRoadmap>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // 1 roadmap per user at a time
    },
    targetRole: { type: String, required: true },
    overallProgress: { type: Number, default: 0 },
    months: [monthSchema],
  },
  { timestamps: true }
);

const Roadmap = mongoose.model<IRoadmap>('Roadmap', roadmapSchema);

export default Roadmap;
