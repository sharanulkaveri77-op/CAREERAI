import { useState, useEffect } from 'react';
import { Database, Search, Loader2, Sparkles } from 'lucide-react';
import api from '../../lib/axios';
import { SkillGapCard } from './SkillGapCard';

export const JobMatcher = () => {
  const [jobs, setJobs] = useState<any[]>([]);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const fetchMatchedJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/jobs/match');
      setJobs(response.data.matchedJobs);
      setUserSkills(response.data.userSkills);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleSeedJobs = async () => {
    setSeeding(true);
    try {
      await api.post('/jobs/seed');
      await fetchMatchedJobs();
    } catch (err: any) {
      setError('Failed to seed jobs database');
    } finally {
      setSeeding(false);
    }
  };

  const handleGenerateRoadmap = async (job: any) => {
    setGenerating(true);
    try {
      await api.post('/roadmap/generate', {
        targetRole: job.title,
        missingSkills: job.missingSkills
      });
      // Refresh the page to trigger Dashboard to load the roadmap
      window.location.reload();
    } catch (err: any) {
      alert('Failed to generate roadmap');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchMatchedJobs();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Running Cosine Similarity against jobs...</p>
      </div>
    );
  }

  if (error && error.includes('No jobs found')) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center text-center min-h-[400px]">
        <Database className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">Job Database Empty</h3>
        <p className="text-slate-500 max-w-sm mb-6">
          There are no jobs in the database to match against. Seed the database with sample jobs to test the embedding engine.
        </p>
        <button
          onClick={handleSeedJobs}
          disabled={seeding}
          className="flex items-center justify-center py-2 px-4 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
          Seed Job Database
        </button>
      </div>
    );
  }

  if (error && error.includes('No skills found')) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm flex flex-col items-center justify-center text-center min-h-[400px]">
        <Search className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-900 mb-2">Missing Skills Profile</h3>
        <p className="text-slate-500 max-w-sm">
          Please upload and analyze a resume first so the AI can extract your skills for matching.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-slate-900">Career Roadmap & Job Match</h3>
        <span className="text-sm font-medium text-slate-500">Based on {userSkills.length} skills</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobs.map((job) => (
          <div key={job._id} className="relative">
            <SkillGapCard job={job} />
            {job.missingSkills.length > 0 && (
              <button
                onClick={() => handleGenerateRoadmap(job)}
                disabled={generating}
                className="w-full mt-2 flex items-center justify-center py-3 px-4 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
                )}
                Generate AI Roadmap to fill gap
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
