import mongoose, { Document, Schema } from 'mongoose';

export interface IJob extends Document {
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  embedding: number[];
}

const jobSchema = new Schema<IJob>(
  {
    title: { type: String, required: true },
    company: { type: String, required: true },
    description: { type: String, required: true },
    requiredSkills: [{ type: String }],
    embedding: [{ type: Number }], // Vector embedding for cosine similarity
  },
  { timestamps: true }
);

const Job = mongoose.model<IJob>('Job', jobSchema);

export default Job;
