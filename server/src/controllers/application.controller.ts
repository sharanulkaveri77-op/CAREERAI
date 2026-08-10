import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Application, { APPLICATION_STATUSES, ApplicationStatus, IApplication } from '../models/Application';
import Job from '../models/Job';
import { awardXp } from '../services/gamification.service';

/**
 * Application Tracker (Kanban) controller — Phase C.
 * Full CRUD plus drag-and-drop persistence: moving a card issues a PATCH with
 * the new { status, position }, and the board is rebuilt from the DB on load.
 */

export const getApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const applications = await Application.find({ user: req.user.id }).sort({ status: 1, position: 1 });
    res.status(200).json({ applications });
  } catch (error) {
    console.error('Fetch applications error:', error);
    res.status(500).json({ message: 'Failed to fetch applications', error: (error as Error).message });
  }
};

const nextPositionInColumn = async (userId: string, status: ApplicationStatus): Promise<number> => {
  const count = await Application.countDocuments({ user: userId, status });
  return count;
};

export const createApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { jobId, title, company, jobUrl, matchScore } = req.body ?? {};

    let appData: { title: string; company: string; jobUrl: string; matchScore: number } | null = null;

    if (jobId) {
      // Entry from the match engine: pull identity from the Job document so the
      // client cannot inject arbitrary text for tracked jobs.
      const job = await Job.findById(jobId);
      if (!job) {
        res.status(404).json({ message: 'The matched job no longer exists in the database.' });
        return;
      }
      const existing = await Application.findOne({ user: req.user.id, job: job._id });
      if (existing) {
        res.status(409).json({ message: 'This job is already on your board.' });
        return;
      }
      appData = {
        title: job.title,
        company: job.company,
        jobUrl: String(jobUrl ?? ''),
        matchScore: typeof matchScore === 'number' ? Math.min(100, Math.max(0, Math.round(matchScore))) : 0,
      };
    } else {
      // Manual entry — title/company are required, everything else optional
      const cleanTitle = typeof title === 'string' ? title.trim() : '';
      const cleanCompany = typeof company === 'string' ? company.trim() : '';
      if (!cleanTitle || !cleanCompany) {
        res.status(400).json({ message: 'Title and company are required for a manual application.' });
        return;
      }
      appData = {
        title: cleanTitle,
        company: cleanCompany,
        jobUrl: typeof jobUrl === 'string' ? jobUrl.trim() : '',
        matchScore: 0,
      };
    }

    const application = await Application.create({
      user: req.user.id,
      job: jobId ?? undefined,
      status: 'SAVED',
      position: await nextPositionInColumn(req.user.id, 'SAVED'),
      ...appData,
    });

    void awardXp(req.user.id, 'APPLICATION_ADDED').catch(() => {});

    res.status(201).json({ message: 'Application added to board', application });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ message: 'Failed to add application', error: (error as Error).message });
  }
};

export const updateApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const application = await Application.findOne({ _id: String(req.params.applicationId), user: req.user.id });
    if (!application) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    const { status, position } = req.body ?? {};
    const updates: Partial<IApplication> = {};
    let statusChanged = false;

    if (typeof status === 'string' && (APPLICATION_STATUSES as readonly string[]).includes(status)) {
      const newStatus = status as ApplicationStatus;
      // Column change → append at the end of the new column unless an explicit
      // position was provided by the drag event
      if (newStatus !== application.status && typeof position !== 'number') {
        updates.position = await nextPositionInColumn(req.user.id, newStatus);
      }
      statusChanged = newStatus !== application.status;
      updates.status = newStatus;
    }

    if (typeof position === 'number' && Number.isInteger(position) && position >= 0) {
      updates.position = position;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ message: 'Nothing to update. Provide a valid status or position.' });
      return;
    }

    application.set(updates);
    await application.save();

    if (statusChanged) {
      void awardXp(req.user.id, 'STAGE_ADVANCED').catch(() => {});
    }

    res.status(200).json({ message: 'Application updated', application });
  } catch (error) {
    console.error('Update application error:', error);
    res.status(500).json({ message: 'Failed to update application', error: (error as Error).message });
  }
};

export const deleteApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const deleted = await Application.findOneAndDelete({ _id: String(req.params.applicationId), user: req.user.id });
    if (!deleted) {
      res.status(404).json({ message: 'Application not found' });
      return;
    }

    res.status(200).json({ message: 'Application removed from board' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ message: 'Failed to delete application', error: (error as Error).message });
  }
};