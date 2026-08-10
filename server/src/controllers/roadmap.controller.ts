import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Roadmap from '../models/Roadmap';
import { generateRoadmapWithGroq } from '../services/ai.service';

export const generateRoadmap = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { targetRole, missingSkills } = req.body;

    if (!targetRole || !missingSkills || !Array.isArray(missingSkills)) {
      res.status(400).json({ message: 'Missing targetRole or missingSkills array' });
      return;
    }

    // Call the AI service
    const monthPlans = await generateRoadmapWithGroq(targetRole, missingSkills);

    // Ensure months have task objects with isCompleted: false by default
    const formattedMonths = monthPlans.map(month => ({
      ...month,
      tasks: month.tasks.map(task => ({
        description: task.description,
        isCompleted: false
      }))
    }));

    // Delete any existing roadmap for the user to start fresh
    await Roadmap.deleteOne({ user: req.user.id });

    // Save the new structured roadmap
    const newRoadmap = await Roadmap.create({
      user: req.user.id,
      targetRole,
      overallProgress: 0,
      months: formattedMonths
    });

    res.status(200).json({
      message: 'Roadmap generated successfully',
      roadmap: newRoadmap
    });
  } catch (error) {
    console.error('Generate roadmap error:', error);
    res.status(500).json({ message: 'Failed to generate roadmap', error: (error as Error).message });
  }
};

export const getRoadmap = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const roadmap = await Roadmap.findOne({ user: req.user.id });

    if (!roadmap) {
      res.status(404).json({ message: 'No roadmap found' });
      return;
    }

    res.status(200).json({ roadmap });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch roadmap', error: (error as Error).message });
  }
};

export const toggleTaskStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const { monthId, taskId } = req.params;

    const roadmap = await Roadmap.findOne({ user: req.user.id });
    if (!roadmap) {
      res.status(404).json({ message: 'Roadmap not found' });
      return;
    }

    let totalTasks = 0;
    let completedTasks = 0;
    let taskFound = false;

    // Find the specific task and toggle it, while also recalculating progress
    roadmap.months.forEach(month => {
      month.tasks.forEach(task => {
        if (task._id?.toString() === taskId) {
          task.isCompleted = !task.isCompleted;
          taskFound = true;
        }
        totalTasks++;
        if (task.isCompleted) completedTasks++;
      });
    });

    if (!taskFound) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    roadmap.overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    await roadmap.save();

    res.status(200).json({ 
      message: 'Task toggled successfully', 
      roadmap 
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to toggle task', error: (error as Error).message });
  }
};
