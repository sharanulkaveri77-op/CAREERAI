import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Job from '../models/Job';
import ResumeAnalysis from '../models/ResumeAnalysis';
import { generateEmbedding, cosineSimilarity } from '../services/embedding.service';
import User from '../models/User';

const SEED_JOBS = [
  {
    title: 'Frontend React Developer',
    company: 'TechCorp',
    description: 'Looking for a skilled frontend developer to build responsive web applications using React and Tailwind.',
    requiredSkills: ['JavaScript', 'React', 'Tailwind', 'HTML', 'CSS']
  },
  {
    title: 'Backend Node.js Engineer',
    company: 'ServerSystems Inc.',
    description: 'We need a backend engineer experienced in Node.js, Express, and MongoDB to build scalable REST APIs.',
    requiredSkills: ['Node.js', 'Express', 'MongoDB', 'REST API', 'JavaScript']
  },
  {
    title: 'Full Stack Developer',
    company: 'StartupX',
    description: 'Join our fast-paced startup! You will be working across the stack with React on the frontend and Node/PostgreSQL on the backend.',
    requiredSkills: ['React', 'Node.js', 'PostgreSQL', 'TypeScript', 'Git']
  },
  {
    title: 'DevOps Engineer',
    company: 'CloudScale',
    description: 'Manage our cloud infrastructure using AWS, Docker, and Kubernetes. Build robust CI/CD pipelines.',
    requiredSkills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Linux', 'Bash']
  },
  {
    title: 'Data Scientist',
    company: 'DataMinds',
    description: 'Analyze large datasets and build machine learning models using Python, Pandas, and Scikit-Learn.',
    requiredSkills: ['Python', 'Machine Learning', 'Data Science', 'Pandas', 'SQL']
  },
  {
    title: 'UI/UX Designer',
    company: 'Creative Studio',
    description: 'Design beautiful user interfaces and experiences using Figma and Adobe Creative Suite.',
    requiredSkills: ['Figma', 'UI/UX', 'CSS', 'HTML']
  }
];

export const seedJobs = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear existing jobs
    await Job.deleteMany({});

    const jobsWithEmbeddings = [];

    // Generate embeddings for seed data
    for (const job of SEED_JOBS) {
      const textToEmbed = `${job.title} ${job.description} ${job.requiredSkills.join(' ')}`;
      const embedding = await generateEmbedding(textToEmbed);
      jobsWithEmbeddings.push({
        ...job,
        embedding
      });
    }

    await Job.insertMany(jobsWithEmbeddings);

    res.status(200).json({ message: 'Successfully seeded jobs database', count: jobsWithEmbeddings.length });
  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({ message: 'Failed to seed jobs', error: (error as Error).message });
  }
};

export const getMatchedJobs = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    // 1. Get user's resume analysis to find their skills
    // In a real app, you might just use User.currentSkills, but the prompt asked for parsed resume/skills
    const user = await User.findById(req.user.id);
    let skillsToMatch = user?.currentSkills || [];

    // If the user hasn't uploaded a resume, they might not have skills. 
    // We'll also check if there's a ResumeAnalysis.
    const latestAnalysis = await ResumeAnalysis.findOne({ user: req.user.id }).sort({ createdAt: -1 });
    
    if (latestAnalysis && latestAnalysis.detectedSkills.length > 0) {
      // Merge skills to ensure we have a robust profile
      skillsToMatch = [...new Set([...skillsToMatch, ...latestAnalysis.detectedSkills])];
    }

    if (skillsToMatch.length === 0) {
      res.status(400).json({ message: 'No skills found. Please upload a resume first.' });
      return;
    }

    // 2. Generate embedding for the user's skills
    const userProfileText = skillsToMatch.join(' ');
    const userEmbedding = await generateEmbedding(userProfileText);

    // 3. Fetch all jobs
    const allJobs = await Job.find({});

    if (allJobs.length === 0) {
      res.status(404).json({ message: 'No jobs found in the database. Please seed the database.' });
      return;
    }

    // 4. Compute Cosine Similarity
    const rankedJobs = allJobs.map((job) => {
      const similarityScore = cosineSimilarity(userEmbedding, job.embedding);
      
      // Calculate missing skills for the frontend skill gap view
      const jobSkillsLower = job.requiredSkills.map(s => s.toLowerCase());
      const userSkillsLower = skillsToMatch.map(s => s.toLowerCase());
      
      const matchedSkills = job.requiredSkills.filter(s => userSkillsLower.includes(s.toLowerCase()));
      const missingSkills = job.requiredSkills.filter(s => !userSkillsLower.includes(s.toLowerCase()));

      return {
        _id: job._id,
        title: job.title,
        company: job.company,
        description: job.description,
        requiredSkills: job.requiredSkills,
        matchScore: similarityScore,
        matchedSkills,
        missingSkills
      };
    });

    // 5. Sort descending by match score
    rankedJobs.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({
      message: 'Successfully matched jobs',
      userSkills: skillsToMatch,
      matchedJobs: rankedJobs
    });

  } catch (error) {
    console.error('Job matching error:', error);
    res.status(500).json({ message: 'Failed to match jobs', error: (error as Error).message });
  }
};
