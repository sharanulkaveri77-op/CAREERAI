import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  targetJobRole?: string;
  currentSkills: string[];
  experienceLevel?: string;
  resumeReference?: string;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    targetJobRole: { type: String, default: '' },
    currentSkills: { type: [String], default: [] },
    experienceLevel: { type: String, enum: ['Entry', 'Mid', 'Senior'], default: 'Entry' },
    resumeReference: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
