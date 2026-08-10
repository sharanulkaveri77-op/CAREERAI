import { create } from 'zustand';

/**
 * Bridges the Job Match Engine and the Application Tracker.
 * JobMatcher sets a pending job; ApplicationTracker consumes + clears it and
 * POSTs the application. Keeps the two components decoupled on the dashboard.
 */
interface PendingJob {
  jobId: string;
  matchScore: number; // 0-100
}

interface PendingJobState {
  pendingJob: PendingJob | null;
  queueJobFromMatch: (job: PendingJob) => void;
  clearPendingJob: () => void;
}

export const useTrackerStore = create<PendingJobState>((set) => ({
  pendingJob: null,
  queueJobFromMatch: (job) => set({ pendingJob: job }),
  clearPendingJob: () => set({ pendingJob: null }),
}));