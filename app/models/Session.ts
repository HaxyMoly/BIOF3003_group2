import mongoose, { Schema } from 'mongoose';

export interface ISession {
  subjectId: string;
  meditationType: 'meditation' | 'mindfulness';
  heartRate: number;
  hrv: number;
  respiratoryRate: number;
  sessionDuration: number; // in seconds
  timestamp: Date;
}

const SessionSchema = new Schema<ISession>({
  subjectId: { type: String, required: true },
  meditationType: { 
    type: String, 
    required: true,
    enum: ['meditation', 'mindfulness']
  },
  heartRate: { type: Number, required: true },
  hrv: { type: Number, required: true },
  respiratoryRate: { type: Number, required: true },
  sessionDuration: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Check if the model is already defined to prevent overwriting during hot reloads
export default mongoose.models.Session || mongoose.model<ISession>('Session', SessionSchema);